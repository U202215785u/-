"use client";

import Link from "next/link";
import { useMemo } from "react";

const POSTER_COLORS = ["lilac", "cream", "lime", "mint"] as const;
type PosterKey = (typeof POSTER_COLORS)[number];

const colorMap: Record<PosterKey, { bg: string; accent: string }> = {
  lilac: { bg: "#dacef5", accent: "oklch(68% 0.12 300)" },
  cream: { bg: "#f4ecd6", accent: "oklch(78% 0.06 85)" },
  lime:  { bg: "#dceeb1", accent: "oklch(72% 0.16 145)" },
  mint:  { bg: "#c8e6cd", accent: "oklch(72% 0.08 170)" },
};

function circleGridSvg(accent: string, uid: string) { return '<svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="cg-'+uid+'" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="5" fill="'+accent+'" opacity="0.15"/><circle cx="12" cy="12" r="2.5" fill="'+accent+'" opacity="0.4"/></pattern></defs><rect width="120" height="90" fill="url(#cg-'+uid+')"/><circle cx="60" cy="45" r="28" fill="'+accent+'" opacity="0.25"/><circle cx="60" cy="45" r="14" fill="'+accent+'" opacity="0.55"/></svg>'; }
function diagonalSvg(accent: string) { return '<svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="90" x2="120" y2="0" stroke="'+accent+'" stroke-width="1.5" opacity="0.15"/><line x1="-20" y1="90" x2="100" y2="0" stroke="'+accent+'" stroke-width="1.5" opacity="0.1"/><line x1="20" y1="90" x2="140" y2="0" stroke="'+accent+'" stroke-width="1.5" opacity="0.1"/><rect x="42" y="24" width="28" height="28" rx="2" fill="'+accent+'" opacity="0.35" transform="rotate(20 56 38)"/><rect x="62" y="42" width="18" height="18" rx="2" fill="'+accent+'" opacity="0.2" transform="rotate(20 71 51)"/></svg>'; }
function concentricSvg(accent: string) { return '<svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="16" width="60" height="58" rx="4" stroke="'+accent+'" stroke-width="1" opacity="0.2"/><rect x="38" y="24" width="44" height="42" rx="3" stroke="'+accent+'" stroke-width="1.5" opacity="0.35"/><rect x="46" y="32" width="28" height="26" rx="2" fill="'+accent+'" opacity="0.3"/></svg>'; }
function waveSvg(accent: string) { return '<svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 55 Q15 40 30 55 Q45 70 60 55 Q75 40 90 55 Q105 70 120 55" stroke="'+accent+'" stroke-width="1.5" fill="none" opacity="0.2"/><path d="M0 48 Q15 33 30 48 Q45 63 60 48 Q75 33 90 48 Q105 63 120 48" stroke="'+accent+'" stroke-width="2" fill="none" opacity="0.35"/><path d="M0 41 Q15 26 30 41 Q45 56 60 41 Q75 26 90 41 Q105 56 120 41" stroke="'+accent+'" stroke-width="1.5" fill="none" opacity="0.2"/></svg>'; }
const geoSvgs = [circleGridSvg, diagonalSvg, concentricSvg, waveSvg];

function formatDeadline(dateStr: string): { formatted: string; urgent: boolean; over: boolean } {
  if (!dateStr) return { formatted: "", urgent: false, over: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { formatted: dateStr, urgent: false, over: false };
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  if (days < 0) return { formatted: y+"."+m+"."+day, urgent: false, over: true };
  if (days <= 14) return { formatted: y+"."+m+"."+day, urgent: true, over: false };
  return { formatted: y+"."+m+"."+day, urgent: false, over: false };
}

export default function CompetitionCard({ competition: c, index = 0 }: { competition: any; index?: number }) {
  const dl = formatDeadline(c.submissionDeadline);
  const posterColor = POSTER_COLORS[index % POSTER_COLORS.length];
  const colors = colorMap[posterColor];
  const posterGeo = useMemo(() => geoSvgs[index % geoSvgs.length](colors.accent, String(c.id)), [index, colors.accent, c.id]);
  const levelClass = c.level === "国家级" ? "national" : c.level ? "provincial" : "";
  const deadlineClass = dl.over ? "over" : dl.urgent ? "urgent" : "";

  return (
    <Link href={"/c/" + c.id} style={{ textDecoration: "none", color: "inherit" }}>
      <article className="card">
        <div className="card-poster">
          {c.posterUrl ? (
            <div className="card-poster-inner poster-lilac" style={{ background: "transparent" }}>
              <img src={c.posterUrl} alt={c.title} className="card-poster-img" loading="lazy" />
            </div>
          ) : (
            <div className={"card-poster-inner poster-" + posterColor}>
              <div className="poster-geo" dangerouslySetInnerHTML={{ __html: posterGeo }} />
            </div>
          )}
          {c.level && <span className={"card-level " + levelClass}>{c.level}</span>}
          {c.isMoeCompetition === "true" && (
            <span style={{ position: "absolute", bottom: 12, left: 12, padding: "3px 10px", borderRadius: "var(--pill-radius)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", background: "#fef3c7", color: "#92400e" }}>教育部赛事</span>
          )}
          {c.overview && <div className="card-quickview"><p>{c.overview}</p></div>}
        </div>
        <div className="card-body">
          <h3 className="card-title">{c.title || "(无标题)"}</h3>
          <p className="card-organizer">{c.organizer || "未知主办方"}</p>
          {c.submissionStartDate && !isNaN(new Date(c.submissionStartDate).getTime()) && new Date(c.submissionStartDate) > new Date() ? (
            <span className="card-deadline" style={{ color: "#1ea64a" }}>
              {new Date(c.submissionStartDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} 开始征稿
            </span>
          ) : c.submissionDeadline && (
            <span className={"card-deadline " + deadlineClass}>
              {dl.over ? dl.formatted + " 已截止" : dl.formatted + " 截止"}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
