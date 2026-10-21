import { useState } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

type RiskLevel = "High" | "Medium" | "Low";
type ScenarioStatus = "Current" | "AI Recommended" | "Alternative" | "Applied";

interface Scenario {
  id: string;
  name: string;
  maintenance: string;
  window: string;
  delay: number;
  conflicts: number;
  risk: RiskLevel;
  score: number;
  status: ScenarioStatus;
  affectedTrains: number;
  crewAvailable: number;
  crewTotal: number;
  opportunityScore: number;
  description: string;
  pros: string[];
  cons: string[];
}

const BASE_SCENARIOS: Scenario[] = [
  {
    id: "s1",
    name: "Current Plan",
    maintenance: "S12",
    window: "09:00–13:30",
    delay: 21,
    conflicts: 3,
    risk: "High",
    score: 72,
    status: "Current",
    affectedTrains: 4,
    crewAvailable: 8,
    crewTotal: 10,
    opportunityScore: 72,
    description: "The existing scheduled maintenance plan with known timing conflicts.",
    pros: ["Crew already assigned", "Part of existing schedule"],
    cons: ["3 active conflicts", "High predicted delay", "Peak traffic window"],
  },
  {
    id: "s2",
    name: "AI Optimized",
    maintenance: "S12",
    window: "11:30–13:30",
    delay: 8,
    conflicts: 0,
    risk: "Low",
    score: 94.7,
    status: "AI Recommended",
    affectedTrains: 1,
    crewAvailable: 8,
    crewTotal: 10,
    opportunityScore: 94.7,
    description: "AI-selected window with low train density and full crew availability.",
    pros: ["Zero conflicts", "Lowest predicted delay", "Crew fully available", "Deadline satisfied"],
    cons: ["Slightly later than original plan"],
  },
  {
    id: "s3",
    name: "Alternative Window",
    maintenance: "S12",
    window: "15:00–17:00",
    delay: 14,
    conflicts: 1,
    risk: "Medium",
    score: 86,
    status: "Alternative",
    affectedTrains: 2,
    crewAvailable: 6,
    crewTotal: 10,
    opportunityScore: 86,
    description: "Afternoon window offering moderate disruption with partial crew availability.",
    pros: ["Low morning disruption", "More preparation time"],
    cons: ["1 conflict with T203", "Partial crew only", "Afternoon peak risk"],
  },
];

// ─── Color maps ────────────────────────────────────────────────────────────────

const RISK_C:  Record<RiskLevel, string> = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const RISK_BG: Record<RiskLevel, string> = { High: "#fef2f2", Medium: "#fffbeb", Low: "#f0fdf4" };
const RISK_BD: Record<RiskLevel, string> = { High: "#fca5a5", Medium: "#fde68a", Low: "#bbf7d0" };

const STATUS_C:  Record<ScenarioStatus, string> = { "Current": "#2563eb", "AI Recommended": "#7c3aed", "Alternative": "#7a8898", "Applied": "#16a34a" };
const STATUS_BG: Record<ScenarioStatus, string> = { "Current": "#eff4ff", "AI Recommended": "#f5f3ff", "Alternative": "#f8fafc", "Applied": "#f0fdf4" };
const STATUS_BD: Record<ScenarioStatus, string> = { "Current": "#bfcffd", "AI Recommended": "#c4b5fd", "Alternative": "#dde2ea", "Applied": "#bbf7d0" };

// ─── Small helpers ─────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: RISK_C[risk], backgroundColor: RISK_BG[risk], border: `1px solid ${RISK_BD[risk]}`, borderRadius: 4, padding: "2px 8px" }}>
      {risk}
    </span>
  );
}

function StatusBadge({ status }: { status: ScenarioStatus }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: STATUS_C[status], backgroundColor: STATUS_BG[status], border: `1px solid ${STATUS_BD[status]}`, borderRadius: 4, padding: "2px 8px" }}>
      {status === "Applied" ? "✓ Applied" : status}
    </span>
  );
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 90 ? "#16a34a" : score >= 80 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8edf3" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        fontFamily="var(--font-brand)" fontSize={score >= 10 ? 12 : 13} fontWeight="700" fill={color}>
        {score % 1 !== 0 ? score.toFixed(0) : score}
      </text>
    </svg>
  );
}

function MiniBar({ value, max, color, bg }: { value: number; max: number; color: string; bg: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 5, backgroundColor: bg, borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.35s" }} />
    </div>
  );
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────────

function KPICards({ appliedCount }: { appliedCount: number }) {
  const cards = [
    { label: "SCENARIOS CREATED",     value: "12",   sub: "In current session",        color: "#0d1829", bg: "#fff",    bd: "#dde2ea" },
    { label: "SIMULATIONS COMPLETED", value: "18",   sub: "Across all scenarios",       color: "#2563eb", bg: "#eff4ff", bd: "#bfcffd" },
    { label: "BEST SCENARIO SCORE",   value: "94.7", sub: "AI Optimized scenario",      color: "#7c3aed", bg: "#f5f3ff", bd: "#c4b5fd" },
    { label: "CONFLICTS AVOIDED",     value: String(7 + appliedCount * 3), sub: appliedCount > 0 ? `+${appliedCount * 3} from applied` : "By AI planning", color: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {cards.map(c => (
        <div key={c.label} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
          <ULabel>{c.label}</ULabel>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 34, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Scenario Card ─────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, selected, onSelect, onApply }: {
  scenario: Scenario;
  selected: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  const isAI = scenario.status === "AI Recommended";
  const isApplied = scenario.status === "Applied";
  const condColor = scenario.score >= 90 ? "#16a34a" : scenario.score >= 80 ? "#d97706" : "#dc2626";

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: isApplied ? "#fafffe" : isAI ? "#fdfcff" : "#fff",
        border: `1.5px solid ${selected ? "#7c3aed" : isApplied ? "#bbf7d0" : isAI ? "#c4b5fd" : "#dde2ea"}`,
        borderTop: `4px solid ${isApplied ? "#16a34a" : isAI ? "#7c3aed" : RISK_C[scenario.risk]}`,
        borderRadius: 10,
        padding: "18px 20px",
        cursor: "pointer",
        boxShadow: selected
          ? "0 0 0 3px rgba(124,58,237,0.1), 0 2px 8px rgba(13,24,41,0.08)"
          : isAI ? "0 2px 8px rgba(124,58,237,0.08)" : "0 1px 3px rgba(13,24,41,0.05)",
        transition: "all 0.15s",
        position: "relative" as const,
      }}
    >
      {/* AI label */}
      {isAI && (
        <div style={{
          position: "absolute" as const, top: -1, right: 16,
          fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
          color: "#fff", backgroundColor: "#7c3aed",
          padding: "2px 10px", borderRadius: "0 0 6px 6px", letterSpacing: "0.06em",
        }}>◆ AI RECOMMENDED</div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>{scenario.name}</div>
            <StatusBadge status={scenario.status} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>
            Section {scenario.maintenance} · {scenario.window}
          </div>
        </div>
        <ScoreRing score={scenario.score} size={54} />
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { k: "Predicted Delay", v: `${scenario.delay} min`, c: scenario.delay <= 10 ? "#16a34a" : scenario.delay <= 15 ? "#d97706" : "#dc2626" },
          { k: "Conflicts",       v: String(scenario.conflicts), c: scenario.conflicts === 0 ? "#16a34a" : scenario.conflicts === 1 ? "#d97706" : "#dc2626" },
          { k: "Trains Affected", v: String(scenario.affectedTrains), c: "#0d1829" },
        ].map(item => (
          <div key={item.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 7, padding: "9px 12px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0", marginBottom: 3 }}>{item.k}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: item.c }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Risk + crew row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <RiskBadge risk={scenario.risk} />
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>
          Crew: <strong style={{ color: "#0d1829" }}>{scenario.crewAvailable}/{scenario.crewTotal}</strong>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Opportunity Score</span>
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: condColor }}>{scenario.score}/100</span>
        </div>
        <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${scenario.score}%`, backgroundColor: condColor, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Action */}
      <button
        onClick={e => { e.stopPropagation(); onApply(); }}
        style={{
          width: "100%", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
          color: isApplied ? "#16a34a" : isAI ? "#7c3aed" : "#0d1829",
          backgroundColor: isApplied ? "#f0fdf4" : isAI ? "#f5f3ff" : "#f8fafc",
          border: `1px solid ${isApplied ? "#bbf7d0" : isAI ? "#c4b5fd" : "#dde2ea"}`,
          borderRadius: 7, padding: "9px 0", cursor: "pointer", transition: "all 0.18s",
        }}
      >
        {isApplied ? "✓ Applied to Schedule" : `Apply ${scenario.name}`}
      </button>
    </div>
  );
}

// ─── Impact Comparison Table ───────────────────────────────────────────────────

function ImpactComparison({ scenarios }: { scenarios: Scenario[] }) {
  const rows = [
    {
      label: "Maintenance Window",
      render: (s: Scenario) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "#0d1829" }}>{s.window}</span>
      ),
    },
    {
      label: "Predicted Delay",
      render: (s: Scenario) => {
        const c = s.delay <= 10 ? "#16a34a" : s.delay <= 15 ? "#d97706" : "#dc2626";
        const bg = s.delay <= 10 ? "#e8edf3" : s.delay <= 15 ? "#fde68a" : "#fca5a5";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: c, minWidth: 44 }}>{s.delay} min</span>
            <MiniBar value={s.delay} max={25} color={c} bg={bg + "44"} />
          </div>
        );
      },
    },
    {
      label: "Affected Trains",
      render: (s: Scenario) => {
        const c = s.affectedTrains === 0 ? "#16a34a" : s.affectedTrains <= 2 ? "#d97706" : "#dc2626";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: c, minWidth: 20 }}>{s.affectedTrains}</span>
            <MiniBar value={s.affectedTrains} max={5} color={c} bg="#e8edf3" />
          </div>
        );
      },
    },
    {
      label: "Conflicts",
      render: (s: Scenario) => {
        const c = s.conflicts === 0 ? "#16a34a" : s.conflicts === 1 ? "#d97706" : "#dc2626";
        const bg = s.conflicts === 0 ? "#f0fdf4" : s.conflicts === 1 ? "#fffbeb" : "#fef2f2";
        const bd = s.conflicts === 0 ? "#bbf7d0" : s.conflicts === 1 ? "#fde68a" : "#fca5a5";
        return (
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: c, backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: 5, padding: "2px 10px" }}>
            {s.conflicts === 0 ? "None" : s.conflicts}
          </span>
        );
      },
    },
    {
      label: "Crew Availability",
      render: (s: Scenario) => {
        const pct = s.crewAvailable / s.crewTotal;
        const c = pct >= 0.8 ? "#16a34a" : pct >= 0.6 ? "#d97706" : "#dc2626";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: c, minWidth: 44 }}>{s.crewAvailable}/{s.crewTotal}</span>
            <MiniBar value={s.crewAvailable} max={s.crewTotal} color={c} bg="#e8edf3" />
          </div>
        );
      },
    },
    {
      label: "Risk Level",
      render: (s: Scenario) => <RiskBadge risk={s.risk} />,
    },
    {
      label: "Opportunity Score",
      render: (s: Scenario) => {
        const c = s.score >= 90 ? "#16a34a" : s.score >= 80 ? "#d97706" : "#dc2626";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: c, minWidth: 44 }}>{s.score}</span>
            <MiniBar value={s.score} max={100} color={c} bg="#e8edf3" />
          </div>
        );
      },
    },
  ];

  const colW = `${Math.floor(100 / scenarios.length)}%`;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${scenarios.length}, 1fr)`, backgroundColor: "#f8fafc", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ padding: "12px 18px" }} />
        {scenarios.map(s => (
          <div key={s.id} style={{ padding: "12px 16px", borderLeft: "1px solid #e8edf3" }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: s.status === "AI Recommended" ? "#7c3aed" : "#0d1829" }}>
              {s.name}
            </div>
            <StatusBadge status={s.status} />
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: `180px repeat(${scenarios.length}, 1fr)`,
            borderBottom: i < rows.length - 1 ? "1px solid #f0f2f5" : "none",
            backgroundColor: i % 2 === 1 ? "#fafbfc" : "#fff",
          }}
        >
          <div style={{ padding: "13px 18px", display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#374151" }}>{row.label}</span>
          </div>
          {scenarios.map(s => (
            <div key={s.id} style={{ padding: "13px 16px", borderLeft: "1px solid #f0f2f5", display: "flex", alignItems: "center" }}>
              {row.render(s)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Detail Comparison Panel ───────────────────────────────────────────────────

function DetailPanel({ selected, aiRec, onClose }: { selected: Scenario; aiRec: Scenario; onClose: () => void }) {
  if (selected.id === aiRec.id) {
    return (
      <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <ULabel color="#7c3aed">DETAIL COMPARISON</ULabel>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7c3aed", fontWeight: 500 }}>
          ◆ The selected scenario is already the AI Recommended option. It has the best opportunity score and zero conflicts.
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Predicted Delay", selVal: `${selected.delay} min`, aiVal: `${aiRec.delay} min`, better: aiRec.delay < selected.delay },
    { label: "Conflicts",       selVal: String(selected.conflicts), aiVal: String(aiRec.conflicts), better: aiRec.conflicts < selected.conflicts },
    { label: "Affected Trains", selVal: String(selected.affectedTrains), aiVal: String(aiRec.affectedTrains), better: aiRec.affectedTrains < selected.affectedTrains },
    { label: "Score",           selVal: String(selected.score), aiVal: String(aiRec.score), better: aiRec.score > selected.score },
    { label: "Risk",            selVal: selected.risk, aiVal: aiRec.risk, better: aiRec.risk === "Low" && selected.risk !== "Low" },
  ];

  return (
    <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderRadius: 10, padding: "20px", boxShadow: "0 1px 3px rgba(124,58,237,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ULabel color="#7c3aed">DETAIL COMPARISON</ULabel>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Column labels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }} />
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#0d1829", textAlign: "center" as const }}>{selected.name}</div>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", textAlign: "center" as const }}>◆ AI Optimized</div>
      </div>

      {metrics.map(m => (
        <div key={m.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #f0f2f5", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{m.label}</span>
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: "#dc2626", textAlign: "center" as const }}>{m.selVal}</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {m.better && <span style={{ fontSize: 11, color: "#16a34a" }}>▲</span>}
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: m.better ? "#16a34a" : "#0d1829" }}>{m.aiVal}</span>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 14, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
          <strong style={{ color: "#7c3aed" }}>AI Optimized</strong> reduces delay by <strong>{selected.delay - aiRec.delay} min</strong>, eliminates all conflicts, and scores <strong>{(aiRec.score - selected.score).toFixed(1)} points</strong> higher.
        </div>
      </div>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({
  selected,
  aiRec,
  statuses,
  onApply,
  onSimulate,
  showDetail,
  setShowDetail,
}: {
  selected: Scenario;
  aiRec: Scenario;
  statuses: Record<string, ScenarioStatus>;
  onApply: () => void;
  onSimulate: () => void;
  showDetail: boolean;
  setShowDetail: (v: boolean) => void;
}) {
  const isApplied = statuses[selected.id] === "Applied";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* AI Rec header */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>AI SCENARIO RECOMMENDATION</div>
        </div>

        <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 5 }}>RECOMMENDED SCENARIO</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 2 }}>AI Optimized</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7c3aed" }}>S12 · 11:30–13:30</div>
        </div>

        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600, color: "#0d1829", marginBottom: 8 }}>
          "Perform S12 maintenance between 11:30–13:30."
        </div>

        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <ULabel>REASON</ULabel>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
            Low train density, high asset priority, available crew and minimal operational disruption make this the optimal scenario.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onApply}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: isApplied ? "#16a34a" : "#fff",
              backgroundColor: isApplied ? "#f0fdf4" : "#7c3aed",
              border: isApplied ? "1px solid #bbf7d0" : "none",
              borderRadius: 8, padding: "10px 0", cursor: "pointer", transition: "all 0.2s", width: "100%",
            }}
          >{isApplied ? "✓ Scenario Applied" : "Apply Scenario"}</button>

          <button
            onClick={onSimulate}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd",
              borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
            }}
          >▶ Run Simulation</button>

          <button
            onClick={() => setShowDetail(!showDetail)}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              color: showDetail ? "#0d1829" : "#7a8898",
              backgroundColor: showDetail ? "#f0f2f5" : "#f8fafc",
              border: "1px solid #dde2ea",
              borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
            }}
          >{showDetail ? "▲ Hide Details" : "Compare Details"}</button>
        </div>
      </div>

      {/* Selected scenario snapshot */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8edf3" }}>
        <ULabel>SELECTED SCENARIO</ULabel>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>{selected.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898", marginBottom: 12 }}>Section {selected.maintenance} · {selected.window}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { k: "Score",   v: String(selected.score), c: selected.score >= 90 ? "#16a34a" : selected.score >= 80 ? "#d97706" : "#dc2626" },
            { k: "Delay",   v: `${selected.delay} min`, c: selected.delay <= 10 ? "#16a34a" : selected.delay <= 15 ? "#d97706" : "#dc2626" },
            { k: "Conflicts", v: String(selected.conflicts), c: selected.conflicts === 0 ? "#16a34a" : "#dc2626" },
            { k: "Risk",    v: selected.risk, c: RISK_C[selected.risk] },
          ].map(row => (
            <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.k}</span>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: row.c }}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pros / Cons */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <ULabel color="#16a34a">ADVANTAGES</ULabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {selected.pros.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#16a34a", marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <ULabel color="#dc2626">DRAWBACKS</ULabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {selected.cons.map(c => (
                <div key={c} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#dc2626", marginTop: 2, flexShrink: 0 }}>✕</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Scenarios() {
  const [statuses, setStatuses] = useState<Record<string, ScenarioStatus>>({
    s1: "Current", s2: "AI Recommended", s3: "Alternative",
  });
  const [selectedId, setSelectedId] = useState("s2");
  const [showDetail, setShowDetail] = useState(false);

  const scenarios = BASE_SCENARIOS.map(s => ({ ...s, status: statuses[s.id] }));
  const selected = scenarios.find(s => s.id === selectedId) ?? scenarios[1];
  const aiRec    = scenarios.find(s => s.id === "s2")!;
  const appliedCount = Object.values(statuses).filter(v => v === "Applied").length;

  const apply = (id: string) => {
    setStatuses(prev => {
      const next = { ...prev };
      // un-apply others (only one can be applied)
      Object.keys(next).forEach(k => { if (k !== id && next[k] === "Applied") next[k] = BASE_SCENARIOS.find(s => s.id === k)!.status; });
      next[id] = "Applied";
      return next;
    });
  };

  const handleRunSim = () => {
    // Navigate to simulation — since we can't directly change nav, show a toast-style message
    alert("Opening Simulation page for: " + selected.name + "\n\nPlease click 'Simulation' in the sidebar to continue.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              Scenarios
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Compare railway maintenance and operational decisions before applying them to the live network.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#7c3aed", display: "inline-block" }} />
              AI Decision Support Active
            </div>
            {appliedCount > 0 && (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 12px" }}>
                {appliedCount} scenario applied
              </div>
            )}
          </div>
        </div>
        <KPICards appliedCount={appliedCount} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {/* Scenario cards */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Scenario Comparison</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Click a scenario to select and inspect it</div>
              </div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 5, padding: "3px 10px" }}>
                {scenarios.length} scenarios
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {scenarios.map(s => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  selected={selectedId === s.id}
                  onSelect={() => { setSelectedId(s.id); setShowDetail(false); }}
                  onApply={() => apply(s.id)}
                />
              ))}
            </div>
          </div>

          {/* Impact comparison table */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 10 }}>
              Scenario Impact Comparison
            </div>
            <ImpactComparison scenarios={scenarios} />
          </div>

          {/* Detail comparison (inline) */}
          {showDetail && (
            <DetailPanel
              selected={selected}
              aiRec={aiRec}
              onClose={() => setShowDetail(false)}
            />
          )}
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <ULabel>RECOMMENDATION PANEL</ULabel>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <RightPanel
              selected={selected}
              aiRec={aiRec}
              statuses={statuses}
              onApply={() => apply(selectedId)}
              onSimulate={handleRunSim}
              showDetail={showDetail}
              setShowDetail={setShowDetail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
