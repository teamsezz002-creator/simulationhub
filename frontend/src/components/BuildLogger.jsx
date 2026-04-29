"use client";
/**
 * components/BuildLogger.jsx
 * Shows build log output with status indicator.
 */

export default function BuildLogger({ logs, status, errorMsg, onRetry }) {
  const statusConfig = {
    importing: { color: "var(--yellow)", label: "Cloning...", pulse: true },
    building:  { color: "var(--yellow)", label: "Building...", pulse: true },
    done:      { color: "var(--green)",  label: "Ready",      pulse: false },
    error:     { color: "var(--red)",    label: "Failed",     pulse: false },
  };

  const cfg = statusConfig[status] || statusConfig.importing;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                ...styles.dot,
                background: cfg.color,
                boxShadow: cfg.pulse ? `0 0 8px ${cfg.color}` : "none",
                animation: cfg.pulse ? "pulse 1.2s ease infinite" : "none",
              }}
            />
            <span style={styles.title} className="mono">Build Log</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                ...styles.statusBadge,
                color: cfg.color,
                borderColor: cfg.color + "44",
                background: cfg.color + "11",
              }}
            >
              {cfg.label}
            </span>
            {(status === "done" || status === "error") && (
              <button style={styles.retryBtn} onClick={onRetry}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log output */}
      <div style={styles.logBox}>
        {logs.map((line, i) => (
          <div key={i} style={styles.logLine}>
            <span style={styles.lineNum} className="mono">{String(i + 1).padStart(2, "0")}</span>
            <span
              className="mono"
              style={{
                color: line.startsWith("❌") ? "var(--red)"
                     : line.startsWith("✅") ? "var(--green)"
                     : line.startsWith("📥") || line.startsWith("🔨") || line.startsWith("📦") ? "var(--yellow)"
                     : "var(--text2)",
              }}
            >
              {line}
            </span>
          </div>
        ))}

        {/* Blinking cursor when running */}
        {(status === "importing" || status === "building") && (
          <div style={styles.logLine}>
            <span style={styles.lineNum} className="mono">{"  "}</span>
            <span className="mono" style={{ color: "var(--accent)", animation: "pulse 0.8s ease infinite" }}>█</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === "error" && errorMsg && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, overflow: "hidden",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg3)",
  },
  titleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  dot: {
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
  },
  title: { fontSize: 12, color: "var(--text2)", fontWeight: 600 },
  statusBadge: {
    fontSize: 11, fontFamily: "var(--mono)",
    padding: "2px 8px", borderRadius: 4, border: "1px solid",
  },
  retryBtn: {
    background: "none", color: "var(--text3)", fontSize: 11,
    fontFamily: "var(--sans)", padding: "2px 6px",
  },
  logBox: {
    padding: "12px 0", maxHeight: 220, overflowY: "auto",
    fontFamily: "var(--mono)", fontSize: 12,
  },
  logLine: {
    display: "flex", gap: 12, padding: "2px 16px",
    alignItems: "flex-start",
  },
  lineNum: { color: "var(--text3)", minWidth: 20, userSelect: "none" },
  errorBox: {
    margin: 12, padding: 12, background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6,
    color: "var(--red)", fontSize: 12, fontFamily: "var(--mono)",
  },
};
