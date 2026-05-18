"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import CompetitionCard from "@/components/CompetitionCard";
import CompetitionFilters from "@/components/CompetitionFilters";

type SortMode = "deadline" | "level" | "newest";

const LEVEL_ORDER: Record<string, number> = { "国家级": 0, "省级": 1, "行业": 2 };

export default function Homepage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", level: "", tag: "", phase: "" });
  const [sortMode, setSortMode] = useState<SortMode>("deadline");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.level) params.set("level", filters.level);
    if (filters.tag && filters.tag !== "moe") params.set("tag", filters.tag);
    params.set("page", "1");
    params.set("pageSize", "50");

    const res = await fetch(`/api/competitions?${params}`);
    const d = await res.json();
    if (d.success) setCompetitions(d.data.items);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const getPhase = (c: any): string | null => {
    const now = new Date();
    const start = c.submissionStartDate ? new Date(c.submissionStartDate) : null;
    const end = c.submissionDeadline ? new Date(c.submissionDeadline) : null;
    if (start && !isNaN(start.getTime()) && start > now) return "upcoming";
    if (end && !isNaN(end.getTime()) && end < now) return "closed";
    if (end && !isNaN(end.getTime()) && end >= now) return "open";
    return null;
  };

  const published = useMemo(() => {
    let items = competitions.filter((c) => c.status === "published");
    if (filters.tag === "moe") {
      items = items.filter((c) => c.isMoeCompetition === "true");
    }
    if (filters.phase) {
      items = items.filter((c) => getPhase(c) === filters.phase);
    }
    if (sortMode === "deadline") {
      /* Phase-aware time sort:
         1. 征稿中 (open)     → deadline 升序（快截止的在前）
         2. 即将开始 (upcoming) → startDate 升序
         3. 已截止 (closed)    → deadline 降序（最近截止的在前）
         4. 无日期             → 末尾                     */
      const phaseRank: Record<string, number> = { open: 0, upcoming: 1, closed: 2 };
      return [...items].sort((a, b) => {
        const pa = phaseRank[getPhase(a) ?? ""] ?? 3;
        const pb = phaseRank[getPhase(b) ?? ""] ?? 3;
        if (pa !== pb) return pa - pb;
        if (pa === 0) return (a.submissionDeadline || "").localeCompare(b.submissionDeadline || "");
        if (pa === 1) return (a.submissionStartDate || "").localeCompare(b.submissionStartDate || "");
        if (pa === 2) return (b.submissionDeadline || "").localeCompare(a.submissionDeadline || "");
        return 0;
      });
    }
    if (sortMode === "level") {
      return [...items].sort((a, b) => {
        const ra = LEVEL_ORDER[a.level] ?? 9;
        const rb = LEVEL_ORDER[b.level] ?? 9;
        return ra - rb;
      });
    }
    /* newest */
    return [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [competitions, sortMode]);

  return (
    <>
      {/* ═══════════ NAV — 对齐设计稿 ═══════════ */}
      <nav className="site-nav">
        <div className="container">
          <a href="#" className="nav-logo">竞赛信息板</a>
          <ul className="nav-links">
            <li><a href="#competitions">竞赛</a></li>
            <li><a href="#about">关于</a></li>
            <li><a href="#">收藏</a></li>
          </ul>
        </div>
      </nav>

      <main>
        {/* ═══════════ HERO — 对齐设计稿 ═══════════ */}
        <section className="hero" id="competitions">
          <div className="container">
            <h1 className="hero-title">不错过每一个设计竞赛</h1>
            <p className="hero-subtitle">收录教育部认证及行业顶级赛事，标注保研加分资格，按截止日期排列。</p>

            {/* Filter pills — 设计稿位置：hero 内 */}
            <CompetitionFilters filters={filters} onChange={setFilters} />

            {/* Sort bar — 设计稿位置：filter 下方 */}
            <div className="sort-bar">
              <span className="sort-label">排序</span>
              <button
                onClick={() => setSortMode("deadline")}
                className={`sort-btn${sortMode === "deadline" ? " active" : ""}`}
              >
                按时间
              </button>
              <button
                onClick={() => setSortMode("newest")}
                className={`sort-btn${sortMode === "newest" ? " active" : ""}`}
              >
                最新发布
              </button>
              <button
                onClick={() => setSortMode("level")}
                className={`sort-btn${sortMode === "level" ? " active" : ""}`}
              >
                按级别
              </button>
              <span className="result-count" id="resultCount">
                {published.length} 个竞赛
              </span>
            </div>
          </div>
        </section>

        {/* ═══════════ CARD GRID — 对齐设计稿 ═══════════ */}
        <section style={{ paddingBlock: "0 48px" }}>
          <div className="container">
            {loading ? (
              <div className="card-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="card">
                    <div className="card-poster">
                      <div className={`card-poster-inner poster-${["lilac","cream","lime","mint","lilac","cream"][i-1]}`}>
                        <div className="skeleton" style={{
                          width: "60%", height: "60%", borderRadius: 8,
                          background: "rgba(0,0,0,0.06)",
                        }} />
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 14 }} />
                      <div className="skeleton" style={{ width: "40%", height: 14 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : published.length === 0 ? (
              <p className="no-results" style={{ display: "block" }}>
                没有匹配的竞赛，试试调整筛选条件
              </p>
            ) : (
              <div className="card-grid" id="cardGrid">
                {published.map((c, i) => (
                  <CompetitionCard key={c.id} competition={c} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════ ABOUT — 对齐设计稿 ═══════════ */}
        <section className="about" id="about">
          <div className="container">
            <div className="about-block">
              <div>
                <p className="about-label">关于</p>
                <h2 className="about-title">为咸鱼美术组打造</h2>
                <div className="about-accent-row">
                  <span /><span /><span />
                </div>
              </div>
              <div className="about-desc">
                <p>收录教育部竞赛排行榜赛事及行业顶级奖项，涵盖视觉传达、工业设计、数字媒体、环境艺术等领域。每一条信息都标注了是否为教育部认证赛事——这对保研加分至关重要。</p>
                <p>由咸鱼美术组维护更新，比赛信息手动核实后发布。</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h4>竞赛信息板</h4>
              <p>为设计师整理的竞赛信息聚合平台，AI 辅助发现与整理，不错过每一个值得参加的比赛。</p>
            </div>
            <div className="footer-col">
              <h4>联系</h4>
              <ul>
                <li><a href="#about">关于我们</a></li>
                <li><a href="#">反馈建议</a></li>
                <li><a href="#">合作联系</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 咸鱼美术组</span>
            <span>AI 辅助整理 &middot; 管理员审核发布</span>
          </div>
        </div>
      </footer>
    </>
  );
}
