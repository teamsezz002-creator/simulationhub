"use client";
/**
 * components/SimulationsList.jsx
 * Grid of all deployed/built simulations with View + Delete actions.
 */

export default function SimulationsList({ sims, loading, onView, onDelete, backendUrl }) {
  if (loading) {
    return (
      <div style={styles.center}>
        <div className="spinner" />
        <span style={styles.loadingText} className="mono">Loading projects...</span>
      </div>
    );
  }

  if (sims.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>◫</div>
        <p className="mono" style={{ color: "var(--text3)", fontSize: 13 }}>
          No projects yet. Import a repository to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {sims.map((sim) => (
        <SimCard
          key={sim.folderName}
          sim={sim}
          onView={() => onView(sim)}
          onDelete={() => onDelete(sim.folderName)}
          backendUrl={backendUrl}
        />
      ))}
    </div>
  );
}

function SimCard({ sim, onView, onDelete, backendUrl }) {
  const previewUrl = sim.ready
    ? `${backendUrl}/simulations/${sim.folderName}/${
        sim.buildFolder === "." ? "" : sim.buildFolder + "/"
      }index.html`
    : null;

  return (
    <div style={styles.card}>
      {/* Status strip */}
      <div
        style={{
          ...styles.statusStrip,
          background: sim.ready ? "var(--green)" : "var(--red)",
        }}
      />

      <div style={styles.cardBody}>
        <div style={styles.projName}>{sim.projectName}</div>
        <div style={styles.projMeta} className="mono">
          <span style={styles.folderTag}>{sim.folderName}</span>
          {sim.isStatic && (
            <span style={styles.badge}>static</span>
          )}
          {sim.buildFolder && sim.buildFolder !== "." && (
            <span style={styles.badge}>{sim.buildFolder}/</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {sim.ready ? (
            <button style={styles.viewBtn} onClick={onView}>
              ▶ View
            </button>
          ) : (
            <span style={styles.notReadyLabel} className="mono">Not built</span>
          )}
          <button style={styles.deleteBtn} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  center: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: 60, gap: 12,
  },
  loadingText: { color: "var(--text2)", fontSize: 13 },
  empty: {
    textAlign: "center", padding: 60,
    color: "var(--text2)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16, marginTop: 16,
  },
  card: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, overflow: "hidden",
    display: "flex", flexDirection: "column",
    animation: "fadeUp 0.3s ease forwards",
  },
  statusStrip: { height: 3 },
  cardBody: { padding: 16, flex: 1, display: "flex", flexDirection: "column" },
  projName: { fontWeight: 700, fontSize: 14, marginBottom: 6 },
  projMeta: { display: "flex", flexWrap: "wrap", gap: 6 },
  folderTag: { fontSize: 10, color: "var(--text3)" },
  badge: {
    fontSize: 10, padding: "1px 6px", borderRadius: 4,
    background: "rgba(108,99,255,0.12)", color: "var(--accent)",
    border: "1px solid rgba(108,99,255,0.2)",
  },
  viewBtn: {
    flex: 1, background: "var(--accent)", color: "#fff",
    padding: "6px 0", borderRadius: 6, fontSize: 12,
    fontWeight: 600, fontFamily: "var(--sans)",
  },
  deleteBtn: {
    background: "rgba(239,68,68,0.1)", color: "var(--red)",
    border: "1px solid rgba(239,68,68,0.2)",
    padding: "6px 12px", borderRadius: 6, fontSize: 12,
    fontFamily: "var(--sans)",
  },
  notReadyLabel: {
    fontSize: 11, color: "var(--text3)", alignSelf: "center",
  },
};
