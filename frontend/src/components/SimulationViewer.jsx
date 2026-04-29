"use client";
/**
 * components/SimulationViewer.jsx
 * Renders the deployed project inside a responsive iframe.
 */

import { useState } from "react";

export default function SimulationViewer({ url, projectName }) {
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div
      style={{
        ...styles.root,
        ...(fullscreen ? styles.fullscreen : {}),
      }}
    >
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.dots}>
          <span style={{ ...styles.dot, background: "#ef4444" }} />
          <span style={{ ...styles.dot, background: "#f59e0b" }} />
          <span style={{ ...styles.dot, background: "#22c55e" }} />
        </div>

        {/* URL bar */}
        <div style={styles.urlBar}>
          <span className="mono" style={styles.urlText}>{url}</span>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.toolBtn}
            onClick={() => window.open(url, "_blank")}
            title="Open in new tab"
          >
            ↗
          </button>
          <button
            style={styles.toolBtn}
            onClick={() => setFullscreen(!fullscreen)}
            title="Toggle fullscreen"
          >
            {fullscreen ? "⊡" : "⊞"}
          </button>
        </div>
      </div>

      {/* iFrame */}
      <div style={styles.iframeWrap}>
        {!loaded && (
          <div style={styles.iframeLoading}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <span style={styles.loadingText} className="mono">Loading {projectName}...</span>
          </div>
        )}
        <iframe
          src={url}
          title={projectName}
          style={{
            ...styles.iframe,
            opacity: loaded ? 1 : 0,
          }}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

const styles = {
  root: {
    border: "1px solid var(--border)", borderRadius: 10,
    overflow: "hidden", display: "flex", flexDirection: "column",
    background: "var(--bg2)", minHeight: 480,
    animation: "fadeUp 0.3s ease forwards",
  },
  fullscreen: {
    position: "fixed", inset: 0, zIndex: 1000,
    borderRadius: 0, border: "none",
  },
  toolbar: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", background: "var(--bg3)",
    borderBottom: "1px solid var(--border)",
  },
  dots: { display: "flex", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  urlBar: {
    flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "4px 10px", overflow: "hidden",
  },
  urlText: {
    fontSize: 11, color: "var(--text3)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    display: "block",
  },
  actions: { display: "flex", gap: 6 },
  toolBtn: {
    background: "var(--bg)", color: "var(--text2)",
    border: "1px solid var(--border)", borderRadius: 6,
    width: 28, height: 28, fontSize: 14, display: "flex",
    alignItems: "center", justifyContent: "center",
    fontFamily: "var(--sans)",
  },
  iframeWrap: {
    flex: 1, position: "relative", minHeight: 400,
    background: "#fff",
  },
  iframeLoading: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, background: "var(--bg2)", zIndex: 1,
  },
  loadingText: { color: "var(--text2)", fontSize: 12 },
  iframe: {
    width: "100%", height: "100%",
    border: "none", display: "block",
    position: "absolute", inset: 0,
    transition: "opacity 0.3s",
  },
};
