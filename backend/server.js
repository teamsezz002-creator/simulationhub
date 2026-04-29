/**
 * portal-backend/server.js
 * Local Simulation Deployment Portal - Backend Server
 * 
 * Routes:
 *   POST /import           → Clone a GitHub repo
 *   POST /build            → npm install + npm run build
 *   GET  /simulations-list → List all imported projects
 *   GET  /simulations/*    → Serve built static files
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const simpleGit = require("simple-git");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Paths ────────────────────────────────────────────────────────────────────
const BUILDS_DIR = path.join(__dirname, "builds");

// Make sure builds/ folder exists
if (!fs.existsSync(BUILDS_DIR)) {
  fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`📡 Incoming ${req.method} request to: ${req.url}`);
  next();
});

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL?.replace(/\/$/, "") // remove trailing slash if exists
].filter(Boolean);

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : "*" }));
app.use(express.json());

// ─── Helper: run a shell command inside a directory ──────────────────────────
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const proc = exec(command, { 
      cwd, 
      maxBuffer: 1024 * 1024 * 100, // Increased buffer for large builds
      env: { ...process.env, NODE_ENV: 'production' } 
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed: ${stderr.split('\n').pop() || 'Unknown error'}`));
      }
    });
  });
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveGitBinary() {
  if (process.env.GIT_PATH && fs.existsSync(process.env.GIT_PATH)) {
    return process.env.GIT_PATH;
  }

  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Git\\cmd\\git.exe",
        "C:\\Program Files\\Git\\bin\\git.exe",
        "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
        "C:\\Program Files (x86)\\Git\\bin\\git.exe",
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Git", "cmd", "git.exe"),
      ]
    : ["/usr/bin/git", "/usr/local/bin/git"];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "git";
}

async function createGitClient() {
  const git = simpleGit({
    binary: resolveGitBinary(),
    unsafe: {
      allowUnsafeCustomBinary: true,
    },
  });

  try {
    await git.raw(["--version"]);
    return git;
  } catch (error) {
    throw new Error(
      "Git is not installed or not available to the backend. Install Git and restart the backend, or set GIT_PATH to git.exe. Original error: " +
        error.message
    );
  }
}

// ─── Helper: detect build output folder ──────────────────────────────────────
function detectBuildFolder(projectPath) {
  const candidates = ["dist", "build", "out", "public", ".next"];
  for (const folder of candidates) {
    const full = path.join(projectPath, folder);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      return folder;
    }
  }
  return null;
}

// ─── Helper: check if project has a build script ─────────────────────────────
function hasBuildScript(projectPath) {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return !!(pkg.scripts && pkg.scripts.build);
  } catch {
    return false;
  }
}

// ─── Helper: check if it's a static HTML project ─────────────────────────────
function isStaticProject(projectPath) {
  return fs.existsSync(path.join(projectPath, "index.html"));
}

function normalizeBuiltIndexPaths(projectPath, buildFolder) {
  const indexPath = path.join(projectPath, buildFolder, "index.html");

  if (!fs.existsSync(indexPath)) {
    return;
  }

  const html = fs.readFileSync(indexPath, "utf-8");
  const normalized = html
    .replace(/(src|href)="\/(?!\/)/g, '$1="./')
    .replace(/(src|href)='\/(?!\/)/g, "$1='./");

  if (normalized !== html) {
    console.log(`📝 Rewriting absolute paths in ${indexPath}`);
    fs.writeFileSync(indexPath, normalized, "utf-8");
  } else {
    console.log(`ℹ️ No absolute paths to rewrite in ${indexPath}`);
  }
}

// ─── Route: Serve static simulation files ────────────────────────────────────
// Example: GET /simulations/sim_1234/dist/index.html
app.use("/simulations", express.static(BUILDS_DIR));

// ─── Route: POST /import ─────────────────────────────────────────────────────
app.post("/import", async (req, res) => {
  const { repoUrl } = req.body;

  // Validate input
  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl is required." });
  }

  // Basic URL validation
  if (!repoUrl.startsWith("https://github.com/")) {
    return res.status(400).json({ error: "Only GitHub URLs are supported (https://github.com/...)" });
  }

  // Generate unique folder name
  const folderName = `sim_${Date.now()}`;
  const destPath = path.join(BUILDS_DIR, folderName);

  try {
    console.log(`📥 Cloning ${repoUrl} → builds/${folderName}`);
    const git = await createGitClient();
    await git.clone(repoUrl, destPath);
    console.log(`✅ Clone successful: ${folderName}`);

    return res.json({
      success: true,
      folderName,
      message: "Repository cloned successfully.",
    });
  } catch (err) {
    console.error("Clone failed:", err.message);
    // Clean up if partial clone
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }
    return res.status(500).json({ error: `Clone failed: ${err.message}` });
  }
});

// ─── Route: POST /build ───────────────────────────────────────────────────────
app.post("/build", async (req, res) => {
  const { folderName } = req.body;

  if (!folderName) {
    return res.status(400).json({ error: "folderName is required." });
  }

  // Prevent path traversal attacks
  if (folderName.includes("..") || folderName.includes("/")) {
    return res.status(400).json({ error: "Invalid folderName." });
  }

  const projectPath = path.join(BUILDS_DIR, folderName);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: `Project '${folderName}' not found.` });
  }

  let logs = [];

  try {
    // ── Case 1: Static HTML project (no package.json or no build script) ──
    if (isStaticProject(projectPath) && !hasBuildScript(projectPath)) {
      console.log(`📄 Static HTML project detected: ${folderName}`);
      return res.json({
        success: true,
        buildFolder: ".", // serve from root
        isStatic: true,
        logs: ["Static HTML project detected. No build required."],
        message: "Static project ready.",
      });
    }

    // ── Case 2: Node/npm project ──────────────────────────────────────────
    if (!hasBuildScript(projectPath)) {
      return res.status(400).json({
        error: "No build script found in package.json. Cannot build this project.",
      });
    }

    // Step 1: npm install

    console.log(`📦 Running npm install in ${folderName}...`);
    logs.push("Running npm install...");
    await runCommand(`${getNpmCommand()} install --legacy-peer-deps`, projectPath);
    await runCommand(`${getNpmCommand()} install --legacy-peer-deps --no-audit --no-fund`, projectPath);
    logs.push("npm install completed.");

    // Step 2: npm run build

    console.log(`🔨 Running npm run build in ${folderName}...`);
    logs.push("Running npm run build...");
    
    let buildCmd = `${getNpmCommand()} run build`;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf-8"));
      // If it's a Vite project, explicitly add --base ./ to ensure relative paths
      // This is more robust than post-processing HTML for Vite builds.
      if (pkg.devDependencies?.vite || pkg.dependencies?.vite) {
        buildCmd += " -- --base ./";
      }
    } catch {} // Ignore if package.json can't be read
    await runCommand(buildCmd, projectPath);
    logs.push("Build completed.");

    // Step 3: Detect build output
    
    const buildFolder = detectBuildFolder(projectPath);
    if (!buildFolder) {
      return res.status(500).json({
        error: "Build ran but no output folder (dist/, build/, out/) was found.",
        logs,
      });
    }

    normalizeBuiltIndexPaths(projectPath, buildFolder);

    console.log(`✅ Build complete. Output: ${buildFolder}`);
    logs.push(`Output folder detected: ${buildFolder}`);

    return res.json({
      success: true,
      buildFolder,
      isStatic: false,
      logs,
      message: "Build successful.",
    });
  } catch (err) {
    console.error("Build failed:", err.message);
    logs.push(`Error: ${err.message}`);
    return res.status(500).json({
      error: `Build failed: ${err.message}`,
      logs,
    });
  }
});

// ─── Route: GET /simulations-list ────────────────────────────────────────────
app.get("/simulations-list", (req, res) => {
  try {
    if (!fs.existsSync(BUILDS_DIR)) {
      return res.json({ simulations: [] });
    }

    const entries = fs.readdirSync(BUILDS_DIR, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const folderPath = path.join(BUILDS_DIR, e.name);

        // Try to read project name from package.json
        let projectName = e.name;
        try {
          const pkg = JSON.parse(
            fs.readFileSync(path.join(folderPath, "package.json"), "utf-8")
          );
          if (pkg.name) projectName = pkg.name;
        } catch {}

        // Detect build folder
        const buildFolder = detectBuildFolder(folderPath);
        const isStatic = isStaticProject(folderPath) && !buildFolder;

        return {
          folderName: e.name,
          projectName,
          buildFolder: buildFolder || (isStatic ? "." : null),
          isStatic,
          ready: !!(buildFolder || isStatic),
        };
      });

    return res.json({ simulations: folders });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Route: DELETE /delete/:folderName ───────────────────────────────────────
app.delete("/delete/:folderName", (req, res) => {
  const { folderName } = req.params;

  if (folderName.includes("..") || folderName.includes("/")) {
    return res.status(400).json({ error: "Invalid folderName." });
  }

  const projectPath = path.join(BUILDS_DIR, folderName);
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Project not found." });
  }

  fs.rmSync(projectPath, { recursive: true, force: true });
  return res.json({ success: true, message: `${folderName} deleted.` });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", buildsDir: BUILDS_DIR });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Portal Backend running at http://localhost:${PORT}`);
  console.log(`📁 Builds directory: ${BUILDS_DIR}`);
  console.log(`\nRoutes:`);
  console.log(`  POST   /import           → Clone a repo`);
  console.log(`  POST   /build            → Build a project`);
  console.log(`  GET    /simulations-list → List all projects`);
  console.log(`  GET    /simulations/*    → Serve static files`);
  console.log(`  DELETE /delete/:name     → Remove a project\n`);
});
