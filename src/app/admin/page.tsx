"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AiScoutModal from "@/components/AiScoutModal";

/* ── Types ── */
interface Competition {
  id: number;
  title: string;
  organizer: string;
  level: string;
  overview: string;
  posterUrl: string;
  contestType: string;
  tags: string[];
  submissionDeadline: string;
  officialUrl: string;
  status: "draft" | "published" | "archived";
  source: "manual" | "ai";
  deadlines: any[];
  categories: string[];
  eligibility: string;
  entryFee: any;
  awards: string;
  specFormat: string;
  aiPolicy: string;
  isMoeCompetition: string;
  dataVerified: string;
  detailBody: string;
  createdAt: string;
}

/* ── Constants ── */
const POSTER_COLORS = ["lilac", "cream", "lime", "mint"] as const;
const STATUS_LABELS: Record<string, string> = { draft: "待审核", published: "已通过", archived: "已驳回" };
const STATUS_COLORS: Record<string, string> = { draft: "pending", published: "approved", archived: "rejected" };
const PAGE_SIZE = 10;

export default function AdminDashboard() {
  /* ── State ── */
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [showScout, setShowScout] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [activeNav, setActiveNav] = useState<"all" | "review">("all");

  /* ── Form state ── */
  const [form, setForm] = useState({ title: "", level: "国家级", organizer: "", submissionDeadline: "", overview: "", contestType: "征稿", tags: "", officialUrl: "", categories: "", eligibility: "", awards: "", specFormat: "", aiPolicy: "", detailBody: "", entryFeeAmount: "0", entryFeeNote: "", isMoeCompetition: "false", status: "draft" as "draft" | "published" | "archived" });

  /* ── Load data ── */
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/competitions");
    const d = await res.json();
    if (d.success) setCompetitions(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Toast ── */
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  /* ── Filter & sort ── */
  const filtered = competitions.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.organizer.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLevel && c.level !== filterLevel) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "deadline-asc": return (a.submissionDeadline || "").localeCompare(b.submissionDeadline || "");
      case "deadline-desc": return (b.submissionDeadline || "").localeCompare(a.submissionDeadline || "");
      case "title-asc": return a.title.localeCompare(b.title, "zh");
      default: return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Stats ── */
  const stats = {
    total: competitions.length,
    pending: competitions.filter((c) => c.status === "draft").length,
    approved: competitions.filter((c) => c.status === "published").length,
    month: competitions.filter((c) => c.createdAt?.startsWith("2026-05")).length,
  };

  /* ── Selection ── */
  const toggleAll = () => {
    if (pageItems.every((c) => selectedIds.has(c.id))) {
      setSelectedIds((prev) => { const n = new Set(prev); pageItems.forEach((c) => n.delete(c.id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); pageItems.forEach((c) => n.add(c.id)); return n; });
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  /* ── Actions ── */
  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/competitions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    showToast(status === "published" ? "已通过审核" : status === "draft" ? "已重置为待审核" : "已驳回");
    load();
  };

  const toggleVerified = async (id: number, current: string) => {
    const next = current === "true" ? "false" : "true";
    await fetch(`/api/admin/competitions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataVerified: next }) });
    showToast(next === "true" ? "已标记为核实" : "已取消核实标记");
    load();
  };

  const deleteOne = async (id: number) => {
    await fetch(`/api/admin/competitions/${id}`, { method: "DELETE" });
    showToast("已删除");
    setDeleteTarget(null);
    load();
  };

  const batchApprove = async () => {
    for (const id of selectedIds) {
      await fetch(`/api/admin/competitions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "published" }) });
    }
    showToast(`已通过 ${selectedIds.size} 项`);
    setSelectedIds(new Set());
    load();
  };

  const batchDelete = async () => {
    for (const id of selectedIds) {
      await fetch(`/api/admin/competitions/${id}`, { method: "DELETE" });
    }
    showToast(`已删除 ${selectedIds.size} 项`);
    setSelectedIds(new Set());
    setBatchDeleteOpen(false);
    load();
  };

  /* ── Drawer ── */
  const openDrawer = (id?: number) => {
    if (id) {
      const c = competitions.find((x) => x.id === id);
      if (!c) return;
      setEditId(id);
      setForm({ title: c.title, level: c.level, organizer: c.organizer, submissionDeadline: c.submissionDeadline, overview: c.overview, contestType: c.contestType, tags: (c.tags || []).join(", "), officialUrl: c.officialUrl, categories: (c.categories || []).join(", "), eligibility: c.eligibility || "", awards: c.awards || "", specFormat: c.specFormat || "", aiPolicy: c.aiPolicy || "", detailBody: c.detailBody || "", entryFeeAmount: String(c.entryFee?.amount || 0), entryFeeNote: c.entryFee?.note || "", isMoeCompetition: c.isMoeCompetition || "false", status: c.status });
    } else {
      setEditId(null);
      setForm({ title: "", level: "国家级", organizer: "", submissionDeadline: "", overview: "", contestType: "征稿", tags: "", officialUrl: "", categories: "", eligibility: "", awards: "", specFormat: "", aiPolicy: "", detailBody: "", entryFeeAmount: "0", entryFeeNote: "", isMoeCompetition: "false", status: "draft" });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setFetchingUrl(false); };

  const aiFetchUrl = async () => {
    if (!form.officialUrl) { showToast("请先粘贴官方链接"); return; }
    setFetchingUrl(true);
    try {
      const res = await fetch("/api/admin/ai-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.officialUrl }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setForm((f) => ({
          ...f,
          title: d.data.title || f.title,
          organizer: d.data.organizer || f.organizer,
          level: d.data.level || f.level,
          overview: d.data.overview || f.overview,
          submissionDeadline: d.data.submissionDeadline || f.submissionDeadline,
          contestType: d.data.contestType || f.contestType,
          categories: Array.isArray(d.data.categories) ? d.data.categories.join(", ") : f.categories,
          tags: Array.isArray(d.data.tags) ? d.data.tags.join(", ") : f.tags,
          eligibility: d.data.eligibility || f.eligibility,
          awards: d.data.awards || f.awards,
          specFormat: d.data.specFormat || f.specFormat,
          aiPolicy: d.data.aiPolicy || f.aiPolicy,
          detailBody: d.data.detailBody || f.detailBody,
          entryFeeAmount: String(d.data.entryFee?.amount || f.entryFeeAmount),
          entryFeeNote: d.data.entryFee?.note || f.entryFeeNote,
        }));
        showToast("已从链接抓取信息，请核对");
      } else {
        showToast(d.error || "抓取失败，请手动填写");
      }
    } catch {
      showToast("网络错误，请手动填写");
    }
    setFetchingUrl(false);
  };

  const handleImportDrafts = async (drafts: any[]) => {
    for (const draft of drafts) {
      await fetch("/api/admin/competitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, status: "draft", source: "ai" }) });
    }
    showToast(`已导入 ${drafts.length} 条到待审核`);
    load();
    setShowScout(false);
  };

  const saveCompetition = async () => {
    if (!form.title || !form.organizer) { showToast("请填写竞赛名称和主办方"); return; }
    const body = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      categories: form.categories.split(",").map((t) => t.trim()).filter(Boolean),
      deadlines: [] as any[],
      entryFee: { amount: parseInt(form.entryFeeAmount) || 0, note: form.entryFeeNote },
      source: "manual" as const,
    };

    if (editId) {
      await fetch(`/api/admin/competitions/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      showToast("竞赛信息已更新");
    } else {
      await fetch("/api/admin/competitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      showToast("竞赛已添加，待审核");
    }
    closeDrawer();
    load();
  };

  /* ── Render ── */
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-body)", fontSize: 14, color: "#111", background: "#fafafa" }}>
      {/* ═══ Sidebar ═══ */}
      <aside style={{ width: 240, height: "100vh", position: "fixed", left: 0, top: 0, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", zIndex: 50 }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", paddingInline: 24, fontWeight: 700, fontSize: 16, borderBottom: "1px solid #e5e7eb", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />
          竞赛管理
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveNav("all"); setFilterStatus(""); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, fontSize: 14, fontWeight: 500, color: activeNav === "all" ? "#111" : "#6b7280", textDecoration: "none", background: activeNav === "all" ? "#f3f4f6" : "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="2" /><path d="M1 6h14M6 6v9" /></svg>
            竞赛列表
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveNav("review"); setFilterStatus("draft"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, fontSize: 14, fontWeight: 500, color: activeNav === "review" ? "#111" : "#6b7280", textDecoration: "none", background: activeNav === "review" ? "#f3f4f6" : "transparent" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l4 4-4 4M8 12h6" /></svg>
            审核队列
            {stats.pending > 0 && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, background: "#dbeafe", color: "#2563eb", padding: "2px 8px", borderRadius: 10 }}>{stats.pending}</span>}
          </a>
          <Link href="/admin/edit/new" style={{ display: "none" }} />
          <Link href="/" target="_blank" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, fontSize: 14, fontWeight: 500, color: "#6b7280", textDecoration: "none", marginTop: "auto" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M8 3v10" /></svg>
            查看前台
          </Link>
        </nav>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>管理员</span>
        </div>
      </aside>

      {/* ═══ Main ═══ */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ── Topbar ── */}
        <header style={{ height: 64, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", paddingInline: 32, justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>竞赛列表</h1>
            <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>共 {competitions.length} 条</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {selectedIds.size > 0 && (
              <>
                <Btn onClick={batchApprove} secondary>批量通过</Btn>
                <Btn onClick={() => setBatchDeleteOpen(true)} danger>批量删除</Btn>
              </>
            )}
            <Btn onClick={() => setShowScout(true)} secondary>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" /></svg>
              <span>AI 搜罗</span>
            </Btn>
            <Btn onClick={() => openDrawer()} primary>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12" /></svg>
              <span>新增竞赛</span>
            </Btn>
          </div>
        </header>

        {/* ── Content ── */}
        <div style={{ padding: 32, flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <StatCard label="竞赛总数" value={stats.total} />
            <StatCard label="待审核" value={stats.pending} color="#d97706" />
            <StatCard label="已通过" value={stats.approved} color="#16a34a" />
            <StatCard label="本月新增" value={stats.month} sub="2026年5月" />
          </div>

          {/* Toolbar */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 360 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" /></svg>
              <input type="text" placeholder="搜索竞赛名称或主办方…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, background: "#fafafa", outline: "none" }} />
            </div>
            <Select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }} options={[{ value: "", label: "全部级别" }, { value: "国家级", label: "国家级" }, { value: "行业", label: "行业" }]} />
            <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} options={[{ value: "", label: "全部状态" }, { value: "draft", label: "待审核" }, { value: "published", label: "已通过" }, { value: "archived", label: "已驳回" }]} />
            <div style={{ flex: 1 }} />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[{ value: "createdAt-desc", label: "最近添加" }, { value: "deadline-asc", label: "截止日期 ↑" }, { value: "deadline-desc", label: "截止日期 ↓" }, { value: "title-asc", label: "名称 A–Z" }]} style={{ minWidth: 100 }} />
          </div>

          {/* Table */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 64, textAlign: "center", color: "#6b7280" }}>加载中...</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>—</div>
                <p style={{ fontSize: 15, margin: 0 }}>没有匹配的竞赛记录</p>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <Th style={{ width: 44 }}><input type="checkbox" className="admin-checkbox" checked={pageItems.length > 0 && pageItems.every((c) => selectedIds.has(c.id))} onChange={toggleAll} /></Th>
                      <Th style={{ width: 72 }}>海报</Th>
                      <Th>竞赛名称</Th>
                      <Th style={{ width: 90 }}>级别</Th>
                      <Th style={{ width: 100 }}>分类</Th>
                      <Th style={{ width: 140 }}>主办方</Th>
                      <Th style={{ width: 110 }}>截止日期</Th>
                      <Th style={{ width: 90 }}>状态</Th>
                      <Th style={{ width: 110 }}>操作</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid #e5e7eb", background: selectedIds.has(c.id) ? "#dbeafe" : "transparent" }}>
                        <Td><input type="checkbox" className="admin-checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)} /></Td>
                        <Td>
                          <div style={{ width: 48, height: 36, borderRadius: 4, background: `oklch(${POSTER_COLORS[i % 4] === "lilac" ? "88% 0.06 300" : POSTER_COLORS[i % 4] === "cream" ? "95% 0.025 90" : POSTER_COLORS[i % 4] === "lime" ? "92% 0.12 145" : "90% 0.06 170"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)" }}>4:3</div>
                        </Td>
                        <Td><span style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => openDrawer(c.id)}>{c.title}</span></Td>
                        <Td><LevelBadge level={c.level} /></Td>
                        <Td><span style={{ color: "#6b7280", fontSize: 13 }}>{c.categories?.[0] || c.contestType || "-"}</span></Td>
                        <Td><span style={{ color: "#6b7280", fontSize: 13 }}>{c.organizer}</span></Td>
                        <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.submissionDeadline || "-"}</span></Td>
                        <Td><StatusBadge status={c.status} /></Td>
                        <Td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <BtnSm onClick={() => openDrawer(c.id)} ghost>✎</BtnSm>
                            {c.status === "draft" && <BtnSm onClick={() => updateStatus(c.id, "published")} ghost style={{ color: "#16a34a" }}>✓</BtnSm>}
                            {c.status === "draft" && <BtnSm onClick={() => updateStatus(c.id, "archived")} ghost style={{ color: "#dc2626" }}>✕</BtnSm>}
                            {c.status === "published" && <BtnSm onClick={() => updateStatus(c.id, "archived")} ghost style={{ color: "#dc2626" }}>✕</BtnSm>}
                            {c.status === "archived" && <BtnSm onClick={() => updateStatus(c.id, "draft")} ghost style={{ color: "#d97706" }}>↻</BtnSm>}
                            <BtnSm onClick={() => { setDeleteTarget(c); }} ghost danger>🗑</BtnSm>
                            <BtnSm onClick={() => toggleVerified(c.id, c.dataVerified || "false")} ghost style={{ color: c.dataVerified === "true" ? "#16a34a" : "#9ca3af" }}>
                              {c.dataVerified === "true" ? "✓✓" : "核实"}
                            </BtnSm>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>显示 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)}，共 {sorted.length} 条</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</PageBtn>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => {
                      const nodes: React.ReactNode[] = [];
                      if (idx > 0 && p - arr[idx - 1] > 1) nodes.push(<span key={`e-${p}`} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 13 }}>…</span>);
                      nodes.push(<PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>);
                      return nodes;
                    })}
                    <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</PageBtn>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Drawer ═══ */}
      {drawerOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 80 }} onClick={closeDrawer} />
          <div style={{ position: "fixed", top: 0, right: 0, width: 520, maxWidth: "100vw", height: "100vh", background: "#fff", zIndex: 90, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.08)", animation: "drawerIn 0.28s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{editId ? "编辑竞赛" : "新增竞赛"}</h2>
              <button onClick={closeDrawer} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 20 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* AI URL fetch — top of drawer */}
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 8 }}>AI 辅助填写</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="field" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} placeholder="粘贴官方赛事链接，让 AI 自动填表" style={{ background: "#fff" }} />
                  <button onClick={aiFetchUrl} disabled={fetchingUrl || !form.officialUrl} style={{ padding: "10px 16px", borderRadius: 6, background: fetchingUrl ? "#e5e7eb" : "#111", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: fetchingUrl ? "default" : "pointer", whiteSpace: "nowrap" }}>{fetchingUrl ? "抓取中..." : "AI 抓取"}</button>
                </div>
              </div>

              <FormField label="竞赛名称"><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="输入竞赛全称" /></FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="级别">
                  <select className="field" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="国家级">国家级</option>
                    <option value="行业">行业</option>
                  </select>
                </FormField>
                <FormField label="赛事类型">
                  <select className="field" value={form.contestType} onChange={(e) => setForm({ ...form, contestType: e.target.value })}>
                    <option value="征稿">征稿</option>
                    <option value="排行">排行</option>
                    <option value="展览">展览</option>
                  </select>
                </FormField>
              </div>
              <FormField label="主办方"><input className="field" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} placeholder="输入主办单位" /></FormField>
              <FormField label="截止日期"><input className="field" type="date" value={form.submissionDeadline} onChange={(e) => setForm({ ...form, submissionDeadline: e.target.value })} /></FormField>
              <FormField label="简介"><textarea className="field" value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} placeholder="竞赛简介，用于快速预览…" style={{ resize: "vertical", minHeight: 80 }} /></FormField>
              <FormField label="分类（逗号分隔）"><input className="field" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="视觉传达, 工业设计" /></FormField>
              <FormField label="官方链接"><input className="field" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} placeholder="https://..." /></FormField>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: form.isMoeCompetition === "true" ? "#fef3c7" : "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer" }} onClick={() => setForm({ ...form, isMoeCompetition: form.isMoeCompetition === "true" ? "false" : "true" })}>
                <input type="checkbox" className="admin-checkbox" checked={form.isMoeCompetition === "true"} onChange={() => {}} style={{ pointerEvents: "none" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>教育部认证赛事</span>
                <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "auto" }}>保研加分</span>
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Btn onClick={closeDrawer} secondary>取消</Btn>
              <Btn onClick={saveCompetition} primary>保存</Btn>
            </div>
          </div>
        </>
      )}

      {/* ═══ Delete Modal ═══ */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 420, width: "90vw", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>确认删除</h3>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>确定要删除"{deleteTarget.title}"吗？此操作不可撤销。</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn onClick={() => setDeleteTarget(null)} secondary>取消</Btn>
              <Btn onClick={() => deleteOne(deleteTarget.id)} danger>删除</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Batch Delete Modal ═══ */}
      {batchDeleteOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setBatchDeleteOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 420, width: "90vw", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>批量删除</h3>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>确定要删除选中的 {selectedIds.size} 项竞赛吗？此操作不可撤销。</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn onClick={() => setBatchDeleteOpen(false)} secondary>取消</Btn>
              <Btn onClick={batchDelete} danger>删除</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI Scout Modal ═══ */}
      {showScout && (
        <AiScoutModal
          onClose={() => setShowScout(false)}
          onImport={handleImportDrafts}
        />
      )}

      {/* ═══ Toast ═══ */}
      {toast && (
        <div style={{ position: "fixed", bottom: 32, right: 32, background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 6, fontSize: 13, fontWeight: 500, zIndex: 200, animation: "toastIn 0.25s ease" }}>{toast}</div>
      )}

      {/* ═══ Animations ═══ */}
      <style jsx global>{`
        @keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .admin-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #d1d5db; cursor: pointer; appearance: none; display: inline-flex; align-items: center; justify-content: center; }
        .admin-checkbox:checked { background: #111; border-color: #111; }
        .field { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-family: inherit; font-size: 14px; background: #fafafa; color: #111; outline: none; }
        .field:focus { border-color: #2563eb; }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ label, value, color, sub }: { label: string; value: number; color?: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "20px 24px" }}>
      <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 340, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)", color: color || "#111", margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Th({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", background: "#fafafa", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", ...style }}>{children}</th>;
}

function Td({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <td style={{ padding: "14px 16px", fontSize: 13, verticalAlign: "middle", ...style }}>{children}</td>;
}

function LevelBadge({ level }: { level: string }) {
  const isNational = level === "国家级";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", background: isNational ? "#111" : "#fff", color: isNational ? "#fff" : "#111", border: isNational ? "none" : "1px solid #d1d5db" }}>{level}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    draft: { bg: "#fffbeb", fg: "#d97706", label: "待审核" },
    published: { bg: "#f0fdf4", fg: "#16a34a", label: "已通过" },
    archived: { bg: "#fef2f2", fg: "#dc2626", label: "已驳回" },
  };
  const s = map[status] || map.draft;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", background: s.bg, color: s.fg }}>{s.label}</span>;
}

function Select({ value, onChange, options, style }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; style?: React.CSSProperties }) {
  return (
    <select value={value} onChange={onChange} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, background: "#fafafa", color: "#111", cursor: "pointer", outline: "none", minWidth: 120, ...style }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280" }}>{label}</label>{children}</div>;
}

function Btn({ onClick, primary, secondary, danger, ghost, children, style }: { onClick: () => void; primary?: boolean; secondary?: boolean; danger?: boolean; ghost?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  let bg = ""; let fg = ""; let border = "";
  if (primary) { bg = "#111"; fg = "#fff"; }
  else if (secondary) { bg = "#fafafa"; fg = "#111"; border = "1px solid #e5e7eb"; }
  else if (danger) { bg = "#fef2f2"; fg = "#dc2626"; }
  else if (ghost) { bg = "transparent"; fg = "#6b7280"; }
  return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border, background: bg, color: fg, whiteSpace: "nowrap", ...style }}>{children}</button>;
}

function BtnSm({ onClick, ghost, danger, children, style }: { onClick: () => void; ghost?: boolean; danger?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return <button onClick={onClick} style={{ padding: "5px 8px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: danger ? "#dc2626" : "#6b7280", ...style }}>{children}</button>;
}

function PageBtn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", borderRadius: 6, background: active ? "#111" : "#fff", color: active ? "#fff" : disabled ? "#ccc" : "#6b7280", fontSize: 13, fontWeight: 500, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.3 : 1 }}>{children}</button>
  );
}
