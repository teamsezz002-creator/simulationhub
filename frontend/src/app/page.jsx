"use client";
/**
 * app/page.jsx — Main page
 * Shows login screen if not authenticated, dashboard if logged in.
 */

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import RepoList from "@/components/RepoList";
import SimulationViewer from "@/components/SimulationViewer";
import SimulationsList from "@/components/SimulationsList";
import BuildLogger from "@/components/BuildLogger";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function requestJson(url, options) {
  let res;

  try {
    res = await fetch(url, options);
  } catch {
    throw new Error(
      "Backend request failed. Make sure the backend server is running on http://localhost:5000."
    );
  }

  const raw = await res.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (!res.ok) {
        throw new Error(raw);
      }
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export default function HomePage() {
  const { data: session, status } = useSession();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("import");   // "import" | "deployed"
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState(null);

  const [importStatus, setImportStatus] = useState("idle"); // idle | importing | building | done | error
  const [buildLogs, setBuildLogs] = useState([]);
  const [currentSim, setCurrentSim] = useState(null);     // { folderName, buildFolder, projectName }
  const [errorMsg, setErrorMsg] = useState("");

  const [deployedSims, setDeployedSims] = useState([]);
  const [simsLoading, setSimsLoading] = useState(false);

  // ── Fetch GitHub repos ─────────────────────────────────────────────────────
  const fetchRepos = useCallback(async () => {
    if (!session?.accessToken) return;
    setReposLoading(true);
    setReposError(null);
    try {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("GitHub API error: " + res.status);
      const data = await res.json();
      setRepos(data);
    } catch (e) {
      setReposError(e.message);
    } finally {
      setReposLoading(false);
    }
  }, [session?.accessToken]);

  // ── Fetch deployed simulations list ───────────────────────────────────────
  const fetchDeployed = useCallback(async () => {
    setSimsLoading(true);
    try {
      const data = await requestJson(`${BACKEND}/simulations-list`);
      setDeployedSims(data.simulations || []);
    } catch {
      setDeployedSims([]);
    } finally {
      setSimsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchRepos();
      fetchDeployed();
    }
  }, [session, fetchRepos, fetchDeployed]);

  // ── Import + Build flow ────────────────────────────────────────────────────
  const handleImport = async (repo) => {
    setImportStatus("importing");
    setBuildLogs([]);
    setCurrentSim(null);
    setErrorMsg("");

    // ── Step 1: Clone ──────────────────────────────────────────────────────
    addLog(`📥 Cloning ${repo.clone_url}...`);
    let folderName;
    try {
      const data = await requestJson(`${BACKEND}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repo.clone_url }),
      });
      folderName = data.folderName;
      addLog(`✅ Cloned → ${folderName}`);
    } catch (e) {
      addLog(`❌ ${e.message}`);
      setImportStatus("error");
      setErrorMsg(e.message);
      return;
    }

    // ── Step 2: Build ──────────────────────────────────────────────────────
    setImportStatus("building");
    addLog(`🔨 Installing dependencies & building...`);
    addLog(`   (This may take 1-3 minutes)`);

    try {
      const data = await requestJson(`${BACKEND}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName }),
      });

      // Show backend logs
      if (data.logs) data.logs.forEach((l) => addLog(`   ${l}`));

      addLog(`✅ Build complete! Output: ${data.buildFolder}`);
      setImportStatus("done");
      setCurrentSim({
        folderName,
        buildFolder: data.buildFolder,
        projectName: repo.name,
        isStatic: data.isStatic,
      });
      fetchDeployed(); // refresh list
    } catch (e) {
      addLog(`❌ ${e.message}`);
      setImportStatus("error");
      setErrorMsg(e.message);
    }
  };

  const addLog = (msg) => setBuildLogs((prev) => [...prev, msg]);

  const handleDelete = async (folderName) => {
    try {
      await fetch(`${BACKEND}/delete/${folderName}`, { method: "DELETE" });
      fetchDeployed();
      if (currentSim?.folderName === folderName) setCurrentSim(null);
    } catch {}
  };

  const handleView = (sim) => {
    setCurrentSim(sim);
    setImportStatus("done");
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div style={styles.centered}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  // ─── Not logged in → Login screen ─────────────────────────────────────────
  if (!session) {
    return <LoginScreen onLogin={() => signIn("github")} />;
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  const simUrl = currentSim
    ? `${BACKEND}/simulations/${currentSim.folderName}/${
        currentSim.buildFolder === "." ? "" : currentSim.buildFolder + "/"
      }index.html`
    : null;

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>▲</span>
          <span style={styles.logoText}>SimPortal</span>
        </div>

        <nav style={styles.nav}>
          <NavItem
            icon="⊕"
            label="Import"
            active={activeTab === "import"}
            onClick={() => setActiveTab("import")}
          />
          <NavItem
            icon="◫"
            label={`Deployed (${deployedSims.length})`}
            active={activeTab === "deployed"}
            onClick={() => { setActiveTab("deployed"); fetchDeployed(); }}
          />
        </nav>

        <div style={styles.sidebarBottom}>
          <img
            src={session.user?.image}
            alt="avatar"
            style={styles.avatar}
          />
          <div style={styles.userInfo}>
            <div style={styles.userName}>{session.user?.name}</div>
            <button style={styles.logoutBtn} onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={styles.main}>
        {activeTab === "import" && (
          <div style={styles.importPane}>
            {/* Left: repo list */}
            <div style={styles.leftPane}>
              <SectionHeader
                title="Your Repositories"
                action={
                  <button style={styles.refreshBtn} onClick={fetchRepos}>
                    ↻ Refresh
                  </button>
                }
              />

              <RepoList
                repos={repos}
                loading={reposLoading}
                error={reposError}
                onImport={handleImport}
                disabled={importStatus === "importing" || importStatus === "building"}
              />
            </div>

            {/* Right: logs + viewer */}
            <div style={styles.rightPane}>
              {importStatus !== "idle" && (
                <BuildLogger
                  logs={buildLogs}
                  status={importStatus}
                  errorMsg={errorMsg}
                  onRetry={() => { setImportStatus("idle"); setBuildLogs([]); }}
                />
              )}

              {importStatus === "done" && currentSim && simUrl && (
                <SimulationViewer
                  url={simUrl}
                  projectName={currentSim.projectName}
                />
              )}

              {importStatus === "idle" && (
                <EmptyState />
              )}
            </div>
          </div>
        )}

        {activeTab === "deployed" && (
          <div style={{ padding: "32px" }}>
            <SectionHeader
              title="Deployed Simulations"
              action={
                <button style={styles.refreshBtn} onClick={fetchDeployed}>
                  ↻ Refresh
                </button>
              }
            />
            <SimulationsList
              sims={deployedSims}
              loading={simsLoading}
              onView={handleView}
              onDelete={handleDelete}
              backendUrl={BACKEND}
            />

            {currentSim && simUrl && (
              <div style={{ marginTop: 32 }}>
                <SimulationViewer
                  url={simUrl}
                  projectName={currentSim.projectName}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard} className="anim-fade-up">
        <div style={styles.loginLogo}>
          <span style={{ fontSize: 48 }}>▲</span>
        </div>
        <h1 style={styles.loginTitle}>SimPortal</h1>
        <p style={styles.loginSub}>
          Import, build & preview GitHub projects<br />entirely on your local machine.
        </p>
        <button style={styles.githubBtn} onClick={onLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>
        <p style={styles.loginNote} className="mono">
          Runs 100% locally · No cloud · No tracking
        </p>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navItem,
        background: active ? "rgba(108,99,255,0.15)" : "transparent",
        color: active ? "var(--accent)" : "var(--text2)",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>◫</div>
      <p style={{ color: "var(--text2)", fontFamily: "var(--mono)", fontSize: 13 }}>
        Select a repository to import & build
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  centered: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "100vh",
  },

  // Login
  loginPage: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 50%, #13131f 0%, #0a0a0f 70%)",
  },
  loginCard: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 16, padding: "48px 40px", textAlign: "center",
    maxWidth: 400, width: "90%",
    boxShadow: "0 0 80px rgba(108,99,255,0.08)",
  },
  loginLogo: { color: "var(--accent)", marginBottom: 16 },
  loginTitle: {
    fontFamily: "var(--sans)", fontSize: 32, fontWeight: 800,
    letterSpacing: "-1px", marginBottom: 12,
  },
  loginSub: {
    color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 32,
  },
  githubBtn: {
    display: "flex", alignItems: "center", gap: 10,
    justifyContent: "center",
    background: "var(--accent)", color: "#fff",
    padding: "12px 24px", borderRadius: 8, fontWeight: 600,
    fontSize: 15, width: "100%", transition: "background 0.2s",
    fontFamily: "var(--sans)",
  },
  loginNote: {
    marginTop: 20, fontSize: 11, color: "var(--text3)",
  },

  // Layout
  root: {
    display: "flex", height: "100vh", overflow: "hidden",
  },
  sidebar: {
    width: 220, background: "var(--bg2)",
    borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column",
    padding: "20px 0", flexShrink: 0,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0 20px 24px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 16,
  },
  logoIcon: { color: "var(--accent)", fontSize: 20 },
  logoText: { fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" },
  nav: { flex: 1, padding: "0 8px" },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "10px 14px",
    borderRadius: 6, fontSize: 13, fontWeight: 500,
    fontFamily: "var(--sans)", transition: "all 0.15s",
    textAlign: "left",
  },
  sidebarBottom: {
    padding: "16px 20px",
    borderTop: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border2)" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 12, fontWeight: 600, truncate: true, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: {
    background: "none", color: "var(--text3)", fontSize: 11,
    fontFamily: "var(--sans)", padding: 0,
    transition: "color 0.15s",
  },

  // Import tab
  importPane: {
    display: "flex", height: "100%", overflow: "hidden",
  },
  leftPane: {
    width: 340, flexShrink: 0,
    borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  rightPane: {
    flex: 1, overflow: "auto",
    display: "flex", flexDirection: "column",
    gap: 24, padding: 32,
  },

  // Common
  main: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column" },
  sectionHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 20px 12px",
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text2)" },
  refreshBtn: {
    background: "var(--bg3)", color: "var(--text2)",
    border: "1px solid var(--border)", borderRadius: 6,
    padding: "4px 10px", fontSize: 12,
    fontFamily: "var(--sans)", transition: "all 0.15s",
  },
  emptyState: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: "var(--text3)", minHeight: 300,
  },
};
