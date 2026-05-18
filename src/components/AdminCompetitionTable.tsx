"use client";

import Link from "next/link";

interface Props {
  items: any[];
  status: "draft" | "published" | "archived";
  onStatusChange: (id: number, status: string, title: string) => void;
  onDelete: (id: number, title: string) => void;
  emptyText: string;
}

const statusLabels: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.45)" },
  published: { bg: "rgba(30,166,74,0.08)", text: "var(--success-green)" },
  archived: { bg: "rgba(0,0,0,0.03)", text: "rgba(0,0,0,0.25)" },
};

export default function AdminCompetitionTable({
  items,
  status,
  onStatusChange,
  onDelete,
  emptyText,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 200 }}>
        <p className="text-body text-subtle">{emptyText}</p>
        {status === "draft" && (
          <Link
            href="/admin/edit/new"
            className="btn-primary"
            style={{ marginTop: 24, fontSize: 16 }}
          >
            新建竞赛
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--canvas)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--hairline)",
        overflow: "hidden",
      }}
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>赛事</th>
            <th>级别</th>
            <th>状态</th>
            <th>来源</th>
            <th>截止日期</th>
            <th style={{ width: 180 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const sc = statusColors[c.status] || statusColors.draft;
            return (
              <tr key={c.id}>
                {/* Title + organizer */}
                <td>
                  <Link
                    href={`/admin/edit/${c.id}`}
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: "-0.14px",
                      color: "var(--ink)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.7";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {c.title || "(无标题)"}
                  </Link>
                  {c.organizer && (
                    <div
                      className="text-body-sm"
                      style={{
                        color: "rgba(0,0,0,0.35)",
                        marginTop: 2,
                      }}
                    >
                      {c.organizer}
                    </div>
                  )}
                </td>

                {/* Level */}
                <td>
                  {c.level ? (
                    <span className="badge">{c.level}</span>
                  ) : (
                    <span style={{ color: "rgba(0,0,0,0.2)" }}>-</span>
                  )}
                </td>

                {/* Status */}
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 12px",
                      borderRadius: "var(--pill)",
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      background: sc.bg,
                      color: sc.text,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sc.text,
                      }}
                    />
                    {statusLabels[c.status]}
                  </span>
                </td>

                {/* Source */}
                <td>
                  <span
                    className="text-eyebrow-sm"
                    style={{
                      color: c.source === "ai" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)",
                    }}
                  >
                    {c.source === "ai" ? "AI" : "手动"}
                  </span>
                </td>

                {/* Deadline */}
                <td>
                  <span
                    className="text-body-sm"
                    style={{
                      color: (() => {
                        if (!c.submissionDeadline) return "rgba(0,0,0,0.2)";
                        const days = Math.ceil(
                          (new Date(c.submissionDeadline).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        );
                        if (days < 0) return "rgba(0,0,0,0.25)";
                        if (days <= 14) return "var(--accent-magenta)";
                        return "rgba(0,0,0,0.55)";
                      })(),
                    }}
                  >
                    {c.submissionDeadline || "-"}
                  </span>
                </td>

                {/* Actions */}
                <td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {c.status === "draft" && (
                      <ActionBtn
                        onClick={() =>
                          onStatusChange(c.id, "published", c.title)
                        }
                        accent
                      >
                        发布
                      </ActionBtn>
                    )}
                    {c.status === "published" && (
                      <ActionBtn
                        onClick={() =>
                          onStatusChange(c.id, "archived", c.title)
                        }
                      >
                        归档
                      </ActionBtn>
                    )}
                    {c.status === "archived" && (
                      <>
                        <ActionBtn
                          onClick={() =>
                            onStatusChange(c.id, "published", c.title)
                          }
                          accent
                        >
                          重新发布
                        </ActionBtn>
                      </>
                    )}
                    <Link
                      href={`/admin/edit/${c.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: "rgba(0,0,0,0.4)",
                        textDecoration: "none",
                        padding: "4px 8px",
                      }}
                    >
                      编辑
                    </Link>
                    <ActionBtn
                      onClick={() => onDelete(c.id, c.title)}
                      danger
                    >
                      删除
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Action button ── */
function ActionBtn({
  onClick,
  accent,
  danger,
  children,
}: {
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: 400,
        padding: "4px 8px",
        borderRadius: "var(--pill)",
        border: "none",
        cursor: "pointer",
        background: "transparent",
        color: danger
          ? "rgba(255,61,139,0.7)"
          : accent
            ? "var(--success-green)"
            : "rgba(0,0,0,0.35)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(255,61,139,0.06)"
          : accent
            ? "rgba(30,166,74,0.06)"
            : "rgba(0,0,0,0.04)";
        e.currentTarget.style.color = danger
          ? "var(--accent-magenta)"
          : accent
            ? "var(--success-green)"
            : "var(--ink)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger
          ? "rgba(255,61,139,0.7)"
          : accent
            ? "var(--success-green)"
            : "rgba(0,0,0,0.35)";
      }}
    >
      {children}
    </button>
  );
}
