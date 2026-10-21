import { useState } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

type Risk = "High" | "Medium" | "Low";
type RecStatus = "pending" | "accepted" | "reviewing";

interface Recommendation {
  id: string;
  asset: string;
  section: string;
  risk: Risk;
  condition: number;
  window: string;
  delay: number;
  crew: number;
  score: number;
  status: RecStatus;
  reason: string;
  action: string;
  factors: Factor[];
  alternatives: Alternative[];
  simTrains: SimTrain[];
  simSections: string[];
}

interface Factor {
  label: string;
  value: number;     // 0–100
  unit?: string;
  display: string;
  sentiment: "good" | "warn" | "bad";
}

interface Alternative {
  window: string;
  delay: number;
  risk: Risk;
  score: number;
  trains: number;
  note: string;
}

interface SimTrain {
  id: string;
  impact: "None" | "Minor" | "Moderate";
  delay: string;
}

const RECS: Recommendation[] = [
  {
    id: "r1", asset: "Section S12", section: "S12", risk: "High", condition: 63,
    window: "11:30–13:30", delay: 21, crew: 8, score: 94.7, status: "pending",
    action: "Schedule Maintenance",
    reason: "Low train density, high asset risk, available crew and deadline requirements make this the optimal maintenance window.",
    factors: [
      { label: "Asset Risk",            value: 90, display: "High",    sentiment: "bad"  },
      { label: "Track Condition",       value: 37, display: "63%",     sentiment: "bad"  },
      { label: "Train Density",         value: 22, display: "Low",     sentiment: "good" },
      { label: "Crew Availability",     value: 88, display: "8 of 10", sentiment: "good" },
      { label: "Maintenance Deadline",  value: 75, display: "7 days",  sentiment: "warn" },
      { label: "Expected Delay",        value: 42, display: "21 min",  sentiment: "warn" },
      { label: "Operational Conflicts", value: 15, display: "1 minor", sentiment: "good" },
    ],
    alternatives: [
      { window: "17:00–19:00", delay: 14, risk: "Low",    score: 78.3, trains: 1, note: "Evening window · low traffic" },
      { window: "22:00–01:00", delay: 4,  risk: "Low",    score: 91.1, trains: 0, note: "Off-peak · no conflicts"      },
    ],
    simTrains: [
      { id: "T201", impact: "Minor",    delay: "+4 min"  },
      { id: "T202", impact: "Moderate", delay: "+21 min" },
      { id: "T203", impact: "None",     delay: "0 min"   },
    ],
    simSections: ["S12", "S11 (partial)"],
  },
  {
    id: "r2", asset: "Section S13", section: "S13", risk: "High", condition: 77,
    window: "14:00–16:30", delay: 12, crew: 6, score: 88.2, status: "pending",
    action: "Review Recommendation",
    reason: "Section S13 condition is deteriorating. Scheduling during the afternoon window avoids peak-hour conflict.",
    factors: [
      { label: "Asset Risk",            value: 75, display: "High",     sentiment: "bad"  },
      { label: "Track Condition",       value: 57, display: "77%",      sentiment: "warn" },
      { label: "Train Density",         value: 48, display: "Medium",   sentiment: "warn" },
      { label: "Crew Availability",     value: 72, display: "6 of 10",  sentiment: "good" },
      { label: "Maintenance Deadline",  value: 55, display: "14 days",  sentiment: "warn" },
      { label: "Expected Delay",        value: 30, display: "12 min",   sentiment: "warn" },
      { label: "Operational Conflicts", value: 40, display: "2 medium", sentiment: "warn" },
    ],
    alternatives: [
      { window: "19:00–21:00", delay: 6,  risk: "Low",    score: 82.1, trains: 1, note: "Evening window · minimal disruption" },
      { window: "06:00–08:00", delay: 8,  risk: "Medium", score: 74.5, trains: 2, note: "Early morning · moderate traffic"    },
    ],
    simTrains: [
      { id: "T201", impact: "None",     delay: "0 min"   },
      { id: "T203", impact: "Moderate", delay: "+12 min" },
      { id: "T204", impact: "Minor",    delay: "+5 min"  },
    ],
    simSections: ["S13", "STB junction"],
  },
  {
    id: "r3", asset: "Signal S08", section: "S08", risk: "Medium", condition: 81,
    window: "14:00–16:00", delay: 6, crew: 4, score: 76.5, status: "pending",
    action: "Review Recommendation",
    reason: "Signal S08 is approaching its inspection threshold. A brief 2-hour window with minimal crew minimises line disruption.",
    factors: [
      { label: "Asset Risk",            value: 50, display: "Medium",   sentiment: "warn" },
      { label: "Track Condition",       value: 65, display: "81%",      sentiment: "good" },
      { label: "Train Density",         value: 55, display: "Medium",   sentiment: "warn" },
      { label: "Crew Availability",     value: 60, display: "4 of 10",  sentiment: "good" },
      { label: "Maintenance Deadline",  value: 35, display: "21 days",  sentiment: "good" },
      { label: "Expected Delay",        value: 18, display: "6 min",    sentiment: "good" },
      { label: "Operational Conflicts", value: 10, display: "None",     sentiment: "good" },
    ],
    alternatives: [
      { window: "21:00–23:00", delay: 0,  risk: "Low",  score: 93.0, trains: 0, note: "Night window · zero conflicts" },
      { window: "07:00–09:00", delay: 4,  risk: "Low",  score: 80.2, trains: 1, note: "Early window · quiet period"  },
    ],
    simTrains: [
      { id: "T202", impact: "Minor", delay: "+6 min"  },
      { id: "T205", impact: "None",  delay: "0 min"   },
    ],
    simSections: ["S08"],
  },
];

// ─── Colors ────────────────────────────────────────────────────────────────────

const RISK_C: Record<Risk, string> = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const RISK_BG: Record<Risk, string> = { High: "#fef2f2", Medium: "#fffbeb", Low: "#f0fdf4" };
const RISK_BD: Record<Risk, string> = { High: "#fca5a5", Medium: "#fde68a", Low: "#bbf7d0" };
const SENT_C: Record<string, string> = { good: "#16a34a", warn: "#d97706", bad: "#dc2626" };
const SENT_TRACK: Record<string, string> = { good: "#16a34a", warn: "#d97706", bad: "#dc2626" };

const IMPACT_C: Record<string, string> = { None: "#16a34a", Minor: "#d97706", Moderate: "#dc2626" };

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function ULabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: RISK_C[risk], backgroundColor: RISK_BG[risk], border: `1px solid ${RISK_BD[risk]}`, borderRadius: 4, padding: "2px 8px" }}>
      {risk}
    </span>
  );
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 88 ? "#16a34a" : score >= 75 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8edf3" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
        fontFamily="var(--font-brand)" fontSize={12} fontWeight="700" fill={color}>
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

function CondBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.35s" }} />
    </div>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards() {
  const cards = [
    { label: "ASSETS ANALYZED",        value: "48",  sub: "Across Demo Corridor",    color: "#0d1829", bd: "#dde2ea", bg: "#fff"    },
    { label: "HIGH-RISK ASSETS",        value: "12",  sub: "Requiring attention",     color: "#dc2626", bd: "#fca5a5", bg: "#fef2f2" },
    { label: "RECOMMENDED ACTIONS",    value: "9",   sub: "AI-generated this cycle",  color: "#7c3aed", bd: "#c4b5fd", bg: "#f5f3ff" },
    { label: "EST. DELAY REDUCTION",   value: "34%", sub: "If all accepted",          color: "#16a34a", bd: "#bbf7d0", bg: "#f0fdf4" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {cards.map(c => (
        <div key={c.label} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 36, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Recommendation Card ───────────────────────────────────────────────────────

function RecCard({ rec, selected, onSelect, onAccept }: {
  rec: Recommendation;
  selected: boolean;
  onSelect: () => void;
  onAccept: () => void;
}) {
  const accepted = rec.status === "accepted";
  const condColor = rec.condition < 70 ? "#dc2626" : rec.condition < 85 ? "#d97706" : "#16a34a";

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: accepted ? "#f0fdf8" : selected ? "#fdfcff" : "#fff",
        border: `1.5px solid ${selected ? "#7c3aed" : accepted ? "#bbf7d0" : "#dde2ea"}`,
        borderLeft: `4px solid ${selected ? "#7c3aed" : accepted ? "#16a34a" : RISK_C[rec.risk]}`,
        borderRadius: 10,
        padding: "18px 20px",
        cursor: "pointer",
        boxShadow: selected ? "0 0 0 3px rgba(124,58,237,0.08)" : "0 1px 3px rgba(13,24,41,0.05)",
        transition: "all 0.15s",
      } as React.CSSProperties}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>{rec.asset}</div>
            <RiskBadge risk={rec.risk} />
            {accepted && (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px" }}>✓ Accepted</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>Section {rec.section} · {rec.window}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <ScoreRing score={rec.score} size={52} />
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>SCORE</div>
        </div>
      </div>

      {/* Condition bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Condition</span>
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: condColor }}>{rec.condition}%</span>
        </div>
        <CondBar value={rec.condition} color={condColor} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {[
          { k: "Predicted Delay", v: `${rec.delay} min`, c: rec.delay > 15 ? "#dc2626" : rec.delay > 8 ? "#d97706" : "#16a34a" },
          { k: "Crew Available",  v: `${rec.crew} workers`, c: "#0d1829" },
        ].map(item => (
          <div key={item.k}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", marginBottom: 2 }}>{item.k}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: item.c }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Action button */}
      <button
        onClick={e => { e.stopPropagation(); onAccept(); }}
        style={{
          fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
          color: accepted ? "#16a34a" : "#7c3aed",
          backgroundColor: accepted ? "#f0fdf4" : "#f5f3ff",
          border: `1px solid ${accepted ? "#bbf7d0" : "#c4b5fd"}`,
          borderRadius: 7, padding: "8px 0", cursor: "pointer", width: "100%",
          transition: "all 0.18s",
        }}
      >
        {accepted ? "✓ Accepted" : rec.action}
      </button>
    </div>
  );
}

// ─── Right Panel: Optimization Factors ────────────────────────────────────────

function FactorRow({ factor }: { factor: Factor }) {
  const trackColor = SENT_TRACK[factor.sentiment];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>{factor.label}</span>
        <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: SENT_C[factor.sentiment] }}>{factor.display}</span>
      </div>
      <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${factor.value}%`, backgroundColor: trackColor, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─── Inline Panels ─────────────────────────────────────────────────────────────

function ComparePanel({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  return (
    <div style={{ borderTop: "1px solid #e8edf3", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <ULabel>COMPARE ALTERNATIVES</ULabel>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>

      {/* Current recommendation */}
      <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7, padding: "10px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.08em" }}>◆ RECOMMENDED</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "#7c3aed", marginTop: 2 }}>{rec.window}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 1 }}>Delay: {rec.delay} min · {rec.crew} workers</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.07em" }}>SCORE</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{rec.score.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {rec.alternatives.map((alt, i) => (
        <div
          key={i}
          onClick={() => applied !== i && setPicked(p => p === i ? null : i)}
          style={{
            border: `1.5px solid ${applied === i ? "#bbf7d0" : picked === i ? "#2563eb" : "#dde2ea"}`,
            backgroundColor: applied === i ? "#f0fdf4" : picked === i ? "#eff4ff" : "#fff",
            borderRadius: 8, padding: "12px 14px", marginBottom: 8,
            cursor: applied === i ? "default" : "pointer", transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: applied === i ? "#16a34a" : picked === i ? "#2563eb" : "#0d1829", marginBottom: 3 }}>
                {applied === i ? "✓ " : ""}{alt.window}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>
                Delay: {alt.delay} min · {alt.trains} train{alt.trains !== 1 ? "s" : ""} · {alt.note}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.07em" }}>SCORE</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: alt.score > 88 ? "#16a34a" : "#d97706" }}>{alt.score.toFixed(1)}</div>
            </div>
          </div>
          {picked === i && applied !== i && (
            <button
              onClick={e => { e.stopPropagation(); setApplied(i); setPicked(null); }}
              style={{ marginTop: 10, width: "100%", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#fff", backgroundColor: "#2563eb", border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer" }}
            >Apply This Window</button>
          )}
        </div>
      ))}
    </div>
  );
}

function SimPanel({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const runSim = () => {
    setRunning(true); setProgress(0); setDone(false);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setRunning(false); setDone(true); return 100; }
        return Math.min(p + 9, 100);
      });
    }, 100);
  };

  return (
    <div style={{ borderTop: "1px solid #e8edf3", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <ULabel>SIMULATE IMPACT</ULabel>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>

      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginBottom: 14, lineHeight: 1.55 }}>
        Predict the operational impact of maintenance on <strong style={{ color: "#0d1829" }}>{rec.asset}</strong> during <span style={{ fontFamily: "var(--font-mono)", color: "#7c3aed" }}>{rec.window}</span>.
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { k: "Affected Trains", v: String(rec.simTrains.filter(t => t.impact !== "None").length) },
          { k: "Max Delay",       v: `${rec.delay} min` },
          { k: "Sections",        v: String(rec.simSections.length) },
        ].map(c => (
          <div key={c.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "#0d1829" }}>{c.v}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#7a8898", marginTop: 2 }}>{c.k}</div>
          </div>
        ))}
      </div>

      {running && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Simulating…</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#2563eb" }}>{progress}%</span>
          </div>
          <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#2563eb", borderRadius: 3, transition: "width 0.1s" }} />
          </div>
        </div>
      )}

      {done && (
        <>
          <div style={{ marginBottom: 10 }}>
            {rec.simTrains.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", backgroundColor: "#f8fafc", borderRadius: 6, border: "1px solid #dde2ea", marginBottom: 5 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "#0d1829" }}>{t.id}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{t.impact}</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: IMPACT_C[t.impact] }}>{t.delay}</span>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 7, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: "0.08em", marginBottom: 3 }}>AFFECTED SECTIONS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#0d1829" }}>{rec.simSections.join(", ")}</div>
          </div>
        </>
      )}

      <button
        onClick={runSim}
        disabled={running}
        style={{
          fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
          color: "#fff", backgroundColor: running ? "#a8b4c0" : "#2563eb",
          border: "none", borderRadius: 8, padding: "10px 0", cursor: running ? "not-allowed" : "pointer", width: "100%",
        }}
      >
        {done ? "Re-run Simulation" : running ? "Simulating…" : "Run Simulation"}
      </button>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ rec, onAccept, statuses }: {
  rec: Recommendation;
  onAccept: () => void;
  statuses: Record<string, RecStatus>;
}) {
  const [showCompare, setShowCompare] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const accepted = statuses[rec.id] === "accepted";

  const toggleCompare = () => { setShowCompare(v => !v); setShowSim(false); };
  const toggleSim     = () => { setShowSim(v => !v); setShowCompare(false); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Factors */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>OPTIMIZATION FACTORS</div>
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 14 }}>
          {rec.asset} · {rec.window}
        </div>
        {rec.factors.map(f => <FactorRow key={f.label} factor={f} />)}
      </div>

      {/* AI Decision */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <ULabel>AI DECISION</ULabel>

        <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 6 }}>RECOMMENDED ACTION</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 8, lineHeight: 1.4 }}>
            Prioritize {rec.asset} maintenance during {rec.window}.
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 5 }}>REASON</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{rec.reason}</div>
        </div>

        {/* Opportunity score bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Opportunity Score</span>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: rec.score >= 88 ? "#16a34a" : "#d97706" }}>{rec.score} / 100</span>
          </div>
          <div style={{ height: 6, backgroundColor: "#e8edf3", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${rec.score}%`, backgroundColor: rec.score >= 88 ? "#16a34a" : "#d97706", borderRadius: 3, transition: "width 0.4s" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onAccept}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: accepted ? "#16a34a" : "#fff",
              backgroundColor: accepted ? "#f0fdf4" : "#7c3aed",
              border: accepted ? "1px solid #bbf7d0" : "none",
              borderRadius: 8, padding: "10px 0", cursor: "pointer", transition: "all 0.2s", width: "100%",
            }}
          >{accepted ? "✓ Recommendation Accepted" : "Accept Recommendation"}</button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={toggleCompare}
              style={{
                flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
                color: showCompare ? "#0d1829" : "#2563eb",
                backgroundColor: showCompare ? "#f0f2f5" : "#eff4ff",
                border: `1px solid ${showCompare ? "#dde2ea" : "#bfcffd"}`,
                borderRadius: 8, padding: "9px 0", cursor: "pointer",
              }}
            >{showCompare ? "▲ Hide" : "Compare Alternatives"}</button>
            <button
              onClick={toggleSim}
              style={{
                flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
                color: showSim ? "#0d1829" : "#0d1829",
                backgroundColor: showSim ? "#f0f2f5" : "#f8fafc",
                border: `1px solid ${showSim ? "#dde2ea" : "#dde2ea"}`,
                borderRadius: 8, padding: "9px 0", cursor: "pointer",
              }}
            >{showSim ? "▲ Hide" : "Simulate Impact"}</button>
          </div>
        </div>
      </div>

      {showCompare && <ComparePanel rec={rec} onClose={() => setShowCompare(false)} />}
      {showSim     && <SimPanel     rec={rec} onClose={() => setShowSim(false)} />}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Optimization() {
  const [selectedId, setSelectedId] = useState<string>("r1");
  const [statuses, setStatuses] = useState<Record<string, RecStatus>>({ r1: "pending", r2: "pending", r3: "pending" });
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");

  const selected = RECS.find(r => r.id === selectedId) ?? RECS[0];

  const accept = (id: string) =>
    setStatuses(prev => ({ ...prev, [id]: prev[id] === "accepted" ? "pending" : "accepted" }));

  const visible = RECS.filter(r => {
    if (filter === "pending")  return statuses[r.id] !== "accepted";
    if (filter === "accepted") return statuses[r.id] === "accepted";
    return true;
  });

  const acceptedCount = Object.values(statuses).filter(s => s === "accepted").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              AI Optimization
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              AI-powered maintenance planning and operational optimization.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#7c3aed", display: "inline-block" }} />
              AI Engine Active
            </div>
            {acceptedCount > 0 && (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 12px" }}>
                {acceptedCount} / {RECS.length} Accepted
              </div>
            )}
          </div>
        </div>
        <SummaryCards />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden", padding: "0 28px 24px", gap: 0 }}>

        {/* Left: Recommendations */}
        <div style={{
          backgroundColor: "#fff", border: "1px solid #dde2ea",
          borderRadius: "10px 0 0 10px", borderRight: "none",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>
                AI Maintenance Recommendations
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
                {visible.length} recommendation{visible.length !== 1 ? "s" : ""} · Click to inspect
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "pending", "accepted"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: filter === f ? 600 : 400,
                    color: filter === f ? "#0d1829" : "#7a8898",
                    backgroundColor: filter === f ? "#fff" : "transparent",
                    border: filter === f ? "1px solid #dde2ea" : "1px solid transparent",
                    borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                    boxShadow: filter === f ? "0 1px 2px rgba(13,24,41,0.06)" : "none",
                    textTransform: "capitalize" as const,
                  }}
                >{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {visible.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                <div style={{ fontSize: 32, opacity: 0.25 }}>◆</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "#a8b4c0" }}>No recommendations match this filter.</div>
              </div>
            ) : (
              visible.map(rec => (
                <RecCard
                  key={rec.id}
                  rec={{ ...rec, status: statuses[rec.id] }}
                  selected={selectedId === rec.id}
                  onSelect={() => setSelectedId(rec.id)}
                  onAccept={() => { accept(rec.id); setSelectedId(rec.id); }}
                />
              ))
            )}

            {/* Global accept all */}
            {visible.some(r => statuses[r.id] !== "accepted") && (
              <div style={{
                backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 2 }}>Accept All Recommendations</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>
                    Apply all {visible.filter(r => statuses[r.id] !== "accepted").length} pending AI recommendations to the schedule.
                  </div>
                </div>
                <button
                  onClick={() => RECS.forEach(r => setStatuses(prev => ({ ...prev, [r.id]: "accepted" })))}
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                    color: "#fff", backgroundColor: "#7c3aed", border: "none",
                    borderRadius: 8, padding: "10px 20px", cursor: "pointer", flexShrink: 0,
                  }}
                >Accept All</button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          backgroundColor: "#fff", border: "1px solid #dde2ea",
          borderRadius: "0 10px 10px 0", borderLeft: "1px solid #e8edf3",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898" }}>ANALYSIS PANEL</div>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <RightPanel
              rec={selected}
              onAccept={() => accept(selected.id)}
              statuses={statuses}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
