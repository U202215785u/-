"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ToastContainer, { showToast } from "@/components/Toast";

interface Props {
  id: string;
}

const emptyForm = {
  title: "", organizer: "", level: "", overview: "", posterUrl: "",
  contestType: "", tags: "", submissionDeadline: "", officialUrl: "",
  deadlines: "", categories: "", eligibility: "", awards: "", specFormat: "",
  aiPolicy: "", detailBody: "", status: "draft",
  entryFeeAmount: "0", entryFeeNote: "",
};

export default function CompetitionForm({ id }: Props) {
  const router = useRouter();
  const isNew = id === "new";
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showBody, setShowBody] = useState(false);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      fetch("/api/admin/competitions")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const item = d.data.find((c: any) => c.id === parseInt(id));
            if (item) {
              setForm({
                title: item.title || "",
                organizer: item.organizer || "",
                level: item.level || "",
                overview: item.overview || "",
                posterUrl: item.posterUrl || "",
                contestType: item.contestType || "",
                tags: (item.tags || []).join(", "),
                submissionDeadline: item.submissionDeadline || "",
                officialUrl: item.officialUrl || "",
                deadlines: JSON.stringify(item.deadlines || []),
                categories: (item.categories || []).join(", "),
                eligibility: item.eligibility || "",
                awards: item.awards || "",
                specFormat: item.specFormat || "",
                aiPolicy: item.aiPolicy || "",
                detailBody: item.detailBody || "",
                status: item.status || "draft",
                entryFeeAmount: String(item.entryFee?.amount || 0),
                entryFeeNote: item.entryFee?.note || "",
              });
              setShowDetails(
                (item.deadlines?.length > 0 ||
                  item.categories?.length > 0 ||
                  item.eligibility ||
                  item.awards ||
                  item.specFormat ||
                  item.aiPolicy) as boolean
              );
              setShowBody(!!item.detailBody);
            }
          }
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const buildBody = () => {
    const body: any = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      categories: form.categories
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      deadlines: (() => {
        try {
          return JSON.parse(form.deadlines);
        } catch {
          return [];
        }
      })(),
      entryFee: {
        amount: parseInt(form.entryFeeAmount) || 0,
        note: form.entryFeeNote,
      },
    };
    delete body.entryFeeAmount;
    delete body.entryFeeNote;
    return body;
  };

  const doSave = async (status: string) => {
    setSaving(true);
    setError("");
    const body = buildBody();
    body.status = status;

    const url = isNew
      ? "/api/admin/competitions"
      : `/api/admin/competitions/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(status === "published" ? "已保存并发布" : "已保存");
      setTimeout(() => router.push("/admin"), 300);
    } else {
      const d = await res.json();
      setError(d.error || "保存失败");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: 300 }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between mb-10"
      >
        <div>
          <h2 className="text-headline" style={{ fontSize: 32 }}>
            {isNew ? "新建赛事" : "编辑赛事"}
          </h2>
          <p className="text-body-sm text-subtle mt-1">
            {isNew ? "添加一条新的竞赛信息" : `编辑 #${id}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary btn-sm"
        >
          取消
        </button>
      </div>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* ── Section 1: 基本信息 ── */}
        <section>
          <SectionHeader>基本信息</SectionHeader>

          <FormField label="赛事名称" required>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="form-input"
              placeholder="例如：全国大学生广告艺术大赛"
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="主办方">
              <input
                value={form.organizer}
                onChange={(e) => set("organizer", e.target.value)}
                className="form-input"
                placeholder="例如：教育部高等教育司"
              />
            </FormField>
            <FormField label="级别">
              <select
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                className="form-input"
              >
                <option value="">请选择</option>
                <option value="国家级">国家级</option>
                <option value="省级">省级</option>
                <option value="行业">行业</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="赛事类型">
              <select
                value={form.contestType}
                onChange={(e) => set("contestType", e.target.value)}
                className="form-input"
              >
                <option value="">请选择</option>
                <option value="征稿">征稿</option>
                <option value="排行">排行</option>
                <option value="展览">展览</option>
              </select>
            </FormField>
            <FormField label="提交截止日期">
              <input
                type="date"
                value={form.submissionDeadline}
                onChange={(e) => set("submissionDeadline", e.target.value)}
                className="form-input"
              />
            </FormField>
          </div>

          <FormField label="一句话简介">
            <input
              value={form.overview}
              onChange={(e) => set("overview", e.target.value)}
              className="form-input"
              placeholder="50字以内概括"
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="海报图片 URL">
              <input
                value={form.posterUrl}
                onChange={(e) => set("posterUrl", e.target.value)}
                className="form-input"
                placeholder="https://..."
              />
            </FormField>
            <FormField label="官方链接">
              <input
                value={form.officialUrl}
                onChange={(e) => set("officialUrl", e.target.value)}
                className="form-input"
                placeholder="https://..."
              />
            </FormField>
          </div>

          <FormField label="标签（逗号分隔）">
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              className="form-input"
              placeholder="平面设计, 插画, AIGC"
            />
          </FormField>
        </section>

        {/* ── Section 2: 结构详情（可折叠） ── */}
        <section>
          <CollapseToggle
            open={showDetails}
            onClick={() => setShowDetails(!showDetails)}
          >
            结构详情（选填）
          </CollapseToggle>

          {showDetails && (
            <div
              style={{
                paddingLeft: 16,
                borderLeft: "2px solid var(--hairline)",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                marginTop: 16,
              }}
            >
              <FormField label="设计类别（逗号分隔）">
                <input
                  value={form.categories}
                  onChange={(e) => set("categories", e.target.value)}
                  className="form-input"
                  placeholder="视觉传达, 动画视频, 交互设计"
                />
              </FormField>

              <FormField label="参赛资格">
                <textarea
                  value={form.eligibility}
                  onChange={(e) => set("eligibility", e.target.value)}
                  className="form-input form-textarea"
                  rows={2}
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="报名费 (¥)">
                  <input
                    type="number"
                    value={form.entryFeeAmount}
                    onChange={(e) => set("entryFeeAmount", e.target.value)}
                    className="form-input"
                  />
                </FormField>
                <FormField label="费用说明">
                  <input
                    value={form.entryFeeNote}
                    onChange={(e) => set("entryFeeNote", e.target.value)}
                    className="form-input"
                    placeholder="如：免费 / 学生组 ¥50"
                  />
                </FormField>
              </div>

              <FormField label="奖项设置">
                <textarea
                  value={form.awards}
                  onChange={(e) => set("awards", e.target.value)}
                  className="form-input form-textarea"
                  rows={2}
                />
              </FormField>

              <FormField label="作品格式要求">
                <textarea
                  value={form.specFormat}
                  onChange={(e) => set("specFormat", e.target.value)}
                  className="form-input form-textarea"
                  rows={2}
                />
              </FormField>

              <FormField label="AIGC 政策">
                <input
                  value={form.aiPolicy}
                  onChange={(e) => set("aiPolicy", e.target.value)}
                  className="form-input"
                  placeholder="如：禁止AIGC / 设有AIGC赛道"
                />
              </FormField>

              <FormField label="赛程节点（JSON 格式）">
                <textarea
                  value={form.deadlines}
                  onChange={(e) => set("deadlines", e.target.value)}
                  className="form-input form-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
                  rows={3}
                  placeholder='[{"label":"报名截止","date":"2026-03-15"},{"label":"作品提交","date":"2026-03-25"}]'
                />
              </FormField>
            </div>
          )}
        </section>

        {/* ── Section 3: 正文（可折叠） ── */}
        <section>
          <CollapseToggle
            open={showBody}
            onClick={() => setShowBody(!showBody)}
          >
            正文 Markdown（选填）
          </CollapseToggle>

          {showBody && (
            <div
              style={{
                paddingLeft: 16,
                borderLeft: "2px solid var(--hairline)",
                marginTop: 16,
              }}
            >
              <FormField label="完整通知正文">
                <textarea
                  value={form.detailBody}
                  onChange={(e) => set("detailBody", e.target.value)}
                  className="form-input form-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
                  rows={12}
                  placeholder="完整的赛事通知正文..."
                />
              </FormField>
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,61,139,0.06)",
              color: "var(--accent-magenta)",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: "-0.08px",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-3"
          style={{
            paddingTop: 32,
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <button
            type="button"
            onClick={() => doSave("published")}
            disabled={saving || !form.title}
            className="btn-primary"
          >
            {saving ? "保存中..." : "保存并发布"}
          </button>
          <button
            type="button"
            onClick={() => doSave("draft")}
            disabled={saving || !form.title}
            className="btn-secondary"
          >
            存草稿
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-eyebrow"
      style={{ color: "rgba(0,0,0,0.3)", marginBottom: 20 }}
    >
      {children}
    </p>
  );
}

/* ── Form field ── */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label className="form-label">
        {label}
        {required && (
          <span style={{ color: "var(--accent-magenta)", marginLeft: 2 }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}

/* ── Collapse toggle ── */
function CollapseToggle({
  open,
  onClick,
  children,
}: {
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "8px 0",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "rgba(0,0,0,0.35)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(0,0,0,0.35)";
      }}
    >
      <span
        style={{
          transition: "transform 0.2s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          fontSize: 14,
        }}
      >
        &#8250;
      </span>
      {children}
    </button>
  );
}
