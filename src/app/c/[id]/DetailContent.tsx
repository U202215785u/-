"use client";

import { useState } from "react";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(d: string): number | null {
  const ms = new Date(d).getTime() - Date.now();
  if (isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function DetailContent({ competition: c }: { competition: any }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const lines = [c.title || ""];
    if (c.organizer) lines.push("主办：" + c.organizer);
    if (c.level) lines.push("级别：" + c.level);
    if (c.submissionDeadline) lines.push("截止：" + fmtDate(c.submissionDeadline));
    lines.push("");
    lines.push("查看详情：" + url);
    const shareText = lines.join("\n");

    let copiedOk = false;
    try {
      await navigator.clipboard.writeText(shareText);
      copiedOk = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareText;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copiedOk = true;
      } catch {}
    }

    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deadlineOver = c.submissionDeadline && new Date(c.submissionDeadline) < new Date();
  const daysLeft = daysUntil(c.submissionDeadline || "");

  return (
    <div className="detail-page">
      <nav className="site-nav">
        <div className="container">
          <a href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            竞赛信息板
          </a>
          <span style={{ fontSize: 14, color: "var(--muted)", maxWidth: "50%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.title}
          </span>
        </div>
      </nav>

      <article className="detail-article">
        {c.posterUrl && <img src={c.posterUrl} alt={c.title} className="detail-poster" />}

        <div className="detail-badges">
          {c.level && <span className="detail-badge">{c.level}</span>}
          {c.contestType && <span className="detail-badge">{c.contestType}</span>}
          {deadlineOver && <span className="detail-badge over">已截止</span>}
          {c.source === "ai" && <span className="detail-badge">AI 搜罗</span>}
          {c.isMoeCompetition === "true" && <span className="detail-badge" style={{ background: "#fef3c7", color: "#92400e" }}>教育部赛事 · 保研加分</span>}
        </div>

        <h1 className="detail-title">{c.title}</h1>
        <p className="detail-organizer">{c.organizer || "未知主办方"}</p>

        {c.submissionDeadline && (
          <div className="detail-deadline">
            <div>
              <p className="detail-deadline-label">提交截止</p>
              <p className={"detail-deadline-date" + (deadlineOver ? " over" : daysLeft !== null && daysLeft <= 14 ? " urgent" : "")}>
                {fmtDate(c.submissionDeadline)}
              </p>
            </div>
            {!deadlineOver && daysLeft !== null && (
              <span className={"detail-deadline-chip" + (daysLeft <= 7 ? " close" : "")}>
                {daysLeft === 0 ? "今天截止" : "还有 " + daysLeft + " 天"}
              </span>
            )}
          </div>
        )}

        <div className="detail-share">
          <button onClick={handleShare} className={"detail-share-btn" + (copied ? " copied" : "")}>
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                已复制到剪贴板
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                分享给朋友
              </>
            )}
          </button>
        </div>

        {c.overview && <p className="detail-overview">{c.overview}</p>}

        {c.eligibility && <DetailSection title="参赛资格" body={c.eligibility} />}

        {c.deadlines && c.deadlines.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">赛程安排</h3>
            {c.deadlines.map((d: any, i: number) => (
              <div key={i} className="detail-deadline-row">
                <span className="detail-section-body label">{d.label}</span>
                <span className="detail-section-body">{d.date}</span>
              </div>
            ))}
          </div>
        )}

        {c.categories && c.categories.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">设计类别</h3>
            <div className="detail-badges">
              {c.categories.map((cat: string, i: number) => (
                <span key={i} className="detail-badge">{cat}</span>
              ))}
            </div>
          </div>
        )}

        {c.awards && <DetailSection title="奖项设置" body={c.awards} />}
        {c.specFormat && <DetailSection title="作品格式" body={c.specFormat} />}
        {c.aiPolicy && <DetailSection title="AIGC 政策" body={c.aiPolicy} />}

        {c.entryFee && (c.entryFee.amount > 0 || c.entryFee.note) && (
          <div className="detail-section">
            <h3 className="detail-section-title">参赛费用</h3>
            <p className="detail-section-body">
              {c.entryFee.amount > 0
                ? <>报名费 <strong>¥{c.entryFee.amount}</strong>{c.entryFee.note && "（" + c.entryFee.note + "）"}</>
                : <span style={{ color: "#1ea64a" }}>免费{c.entryFee.note && "（" + c.entryFee.note + "）"}</span>
              }
            </p>
          </div>
        )}

        {c.detailBody && (
          <div className="detail-body-section">
            <h2 className="detail-body-title">详细通知</h2>
            <div className="detail-body-text">{c.detailBody}</div>
          </div>
        )}

        {c.officialUrl && (
          <div className="detail-cta">
            <a href={c.officialUrl} target="_blank" rel="noopener noreferrer" className="detail-cta-btn">
              查看官方通知
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        )}
      </article>
    </div>
  );
}

function DetailSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="detail-section">
      <h3 className="detail-section-title">{title}</h3>
      <p className="detail-section-body">{body}</p>
    </div>
  );
}
