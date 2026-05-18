"use client";

interface Props {
  filters: { q: string; level: string; tag: string; phase: string };
  onChange: (f: { q: string; level: string; tag: string; phase: string }) => void;
}

const PHASES = ["open", "upcoming", "closed"] as const;
const PHASE_LABELS: Record<string, string> = { open: "征稿中", upcoming: "即将开始", closed: "已截止" };
const LEVELS = ["国家级", "行业"];
const FIELDS = ["视觉传达", "工业设计", "数字媒体", "环境艺术"];

function PillRow({ label, options, active, onSelect, onClear }: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  onSelect: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="filter-row">
      <span className="filter-row-label">{label}</span>
      <button
        className={"pill" + (!active ? " active" : "")}
        onClick={onClear}
      >
        全部
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          className={"pill" + (active === o.value ? " active" : "")}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function CompetitionFilters({ filters, onChange }: Props) {
  const phaseOptions = PHASES.map((v) => ({ value: v, label: PHASE_LABELS[v] }));
  const levelOptions = LEVELS.map((v) => ({ value: v, label: v }));
  const certOptions = [{ value: "moe", label: "教育部赛事" }];
  const fieldOptions = FIELDS.map((v) => ({ value: v, label: v }));

  return (
    <div className="filter-bar" id="filterBar">
      <PillRow
        label="状态"
        options={phaseOptions}
        active={filters.phase}
        onSelect={(v) => onChange({ ...filters, phase: filters.phase === v ? "" : v })}
        onClear={() => onChange({ ...filters, phase: "" })}
      />
      <PillRow
        label="级别"
        options={levelOptions}
        active={filters.level}
        onSelect={(v) => onChange({ ...filters, level: filters.level === v ? "" : v })}
        onClear={() => onChange({ ...filters, level: "" })}
      />
      <PillRow
        label="保研"
        options={certOptions}
        active={filters.tag === "moe" ? "moe" : ""}
        onSelect={(v) => onChange({ ...filters, tag: filters.tag === v ? "" : v })}
        onClear={() => onChange({ ...filters, tag: "" })}
      />
      <PillRow
        label="方向"
        options={fieldOptions}
        active={filters.tag === "moe" ? "" : filters.tag}
        onSelect={(v) => onChange({ ...filters, tag: filters.tag === v ? "" : v })}
        onClear={() => onChange({ ...filters, tag: "" })}
      />
    </div>
  );
}
