"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onImport: (drafts: any[]) => void;
}

export default function AiScoutModal({ onClose, onImport }: Props) {
  const [keywords, setKeywords] = useState("国家级 设计竞赛 2026 征稿");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const handleScout = async () => {
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const d = await res.json();
      if (d.success) {
        setResults(d.data);
        setSelected(new Set(d.data.map((_: any, i: number) => i)));
      } else {
        setError(d.error || "搜罗失败");
      }
    } catch {
      setError("网络错误");
    }
    setSearching(false);
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const handleImport = () => {
    const drafts = results.filter((_, i) => selected.has(i));
    if (drafts.length === 0) return;
    onImport(drafts);
  };

  return (
    <>
      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 80 }} onClick={onClose} />

      {/* Drawer */}
      <div style={{ position: "fixed", top: 0, right: 0, width: 520, maxWidth: "100vw", height: "100vh", background: "#fff", zIndex: 90, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.08)", animation: "drawerIn 0.28s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>AI 搜罗赛事</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 20 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Search input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScout()}
              className="field"
              placeholder="搜索关键词，如：国家级 设计竞赛 2026"
              style={{ background: "#fff" }}
            />
            <button
              onClick={handleScout}
              disabled={searching || !keywords.trim()}
              style={{ padding: "10px 16px", borderRadius: 6, background: searching ? "#e5e7eb" : "#111", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: searching ? "default" : "pointer", whiteSpace: "nowrap" }}
            >
              {searching ? "搜罗中..." : "开始搜罗"}
            </button>
          </div>

          {/* Error */}
          {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

          {/* Results */}
          {results.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>发现 {results.length} 条可能赛事，勾选后导入草稿箱</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((item, i) => (
                  <label
                    key={i}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: 16,
                      borderRadius: 10, border: selected.has(i) ? "1.5px solid #2563eb" : "1px solid #e5e7eb",
                      background: selected.has(i) ? "#f8faff" : "#fff", cursor: "pointer"
                    }}
                  >
                    <input type="checkbox" className="admin-checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                        {item.organizer} · 截止 {item.submissionDeadline} · 可信度: {item.confidence}
                      </div>
                      <div style={{ fontSize: 13, color: "#9ca3af" }}>{item.overview}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!searching && results.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>&#8981;</div>
              <p style={{ fontSize: 15, margin: 0 }}>输入关键词后点击"开始搜罗"</p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>DeepSeek 将为你搜索并整理赛事信息</p>
            </div>
          )}

          {/* Loading */}
          {searching && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#8987;</div>
              <p style={{ fontSize: 15, margin: 0 }}>正在搜罗中，大约需要 10-20 秒...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div style={{ padding: "16px 28px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid #e5e7eb", background: "#fafafa", color: "#111" }}>取消</button>
            <button onClick={handleImport} disabled={selected.size === 0} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: selected.size === 0 ? "default" : "pointer", border: "none", background: selected.size === 0 ? "#e5e7eb" : "#111", color: "#fff" }}>
              导入选中 ({selected.size} 条) → 草稿箱
            </button>
          </div>
        )}
      </div>
    </>
  );
}
