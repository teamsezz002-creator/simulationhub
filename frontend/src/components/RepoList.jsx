"use client";
/**
 * components/RepoList.jsx
 * Displays GitHub repos with search filter and import button.
 */

import { useState } from "react";

export default function RepoList({ repos, loading, error, onImport, disabled }) {
  const [search, setSearch] = useState("");

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.center}>
        <div className="spinner" />
        <span style={styles.loadingText}>Fetching repos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        ⚠ {error}
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          style={styles.search}
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.empty}>No repositories found.</div>
        )}
        {filtered.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            onImport={() => onImport(repo)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function RepoCard({ repo, onImport, disabled }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        background: hover ? "var(--bg3)" : "transparent",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.cardTop}>
        <div style={styles.repoName}>{repo.name}</div>
        {repo.private && (
          <span style={styles.privateBadge}>private</span>
        )}
      </div>
      {repo.description && (
        <p style={styles.desc}>{repo.description}</p>
      )}
      <div style={styles.cardBottom}>
        <div style={styles.meta}>
          {repo.language && (
            <span style={styles.lang}>{repo.language}</span>
          )}
          <span style={styles.metaItem}>
            ★ {repo.stargazers_count}
          </span>
        </div>
        <button
          style={{
            ...styles.importBtn,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          onClick={onImport}
          disabled={disabled}
        >
          Import →
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  searchWrap: { padding: "0 16px 12px" },
  search: {
    width: "100%", background: "var(--bg3)",
    border: "1px solid var(--border)", borderRadius: 6,
    color: "var(--text)", padding: "8px 12px", fontSize: 13,
    fontFamily: "var(--mono)", outline: "none",
  },
  list: { flex: 1, overflowY: "auto", padding: "0 8px" },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 40, gap: 12,
  },
  loadingText: { color: "var(--text2)", fontSize: 13, fontFamily: "var(--mono)" },
  error: {
    margin: 16, padding: 16, background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
    color: "var(--red)", fontSize: 13,
  },
  empty: { padding: 24, color: "var(--text3)", fontSize: 13, textAlign: "center" },
  card: {
    padding: "12px 14px", borderRadius: 8, marginBottom: 4,
    transition: "background 0.15s", cursor: "default",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  repoName: { fontWeight: 600, fontSize: 13, color: "var(--text)" },
  privateBadge: {
    fontSize: 10, fontFamily: "var(--mono)", padding: "1px 6px",
    background: "rgba(245,158,11,0.15)", color: "var(--yellow)",
    border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4,
  },
  desc: {
    fontSize: 11, color: "var(--text3)", marginBottom: 8,
    lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  cardBottom: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  meta: { display: "flex", gap: 10, alignItems: "center" },
  lang: {
    fontSize: 11, fontFamily: "var(--mono)",
    color: "var(--accent)", background: "rgba(108,99,255,0.1)",
    padding: "2px 6px", borderRadius: 4,
  },
  metaItem: { fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" },
  importBtn: {
    background: "var(--accent)", color: "#fff",
    padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    fontFamily: "var(--sans)", transition: "background 0.15s",
  },
};
