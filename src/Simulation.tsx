import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SimState = "idle" | "running" | "done";

interface SimConfig {
  scenario: string;
  duration: number;
  startTime: string;
  traffic: string;
}

interface SimResult {
  delay: number;
  trains: number;
  conflicts: number;
  impact: "Low" | "Medium" | "High";
  success: boolean;
  message: string;
}

// ─── Static data ───────────────────────────────────────────────────────────────

const SCENARIOS = [
  "S12 Maintenance Window",
  "S13 Maintenance Window",
  "Signal S08 Inspection",
  "Full Corridor Maintenance",
  "Off-peak Track Repair",
];

const SCENARIO_RESULTS: Record<string, Omit<SimResult, "success" | "message">> = {
  "S12 Maintenance Window":  { delay: 8,  trains: 2, conflicts: 0, impact: "Low"    },
  "S13 Maintenance Window":  { delay: 18, trains: 3, conflicts: 2, impact: "Medium" },
  "Signal S08 Inspection":   { delay: 4,  trains: 1, conflicts: 0, impact: "Low"    },
  "Full Corridor Maintenance":{ delay: 42, trains: 5, conflicts: 4, impact: "High"   },
  "Off-peak Track Repair":   { delay: 3,  trains: 0, conflicts: 0, impact: "Low"    },
};

const ALT_WINDOWS = [
  { window: "17:00–19:00", delay: 5,  trains: 1, score: 82.1, note: "Evening · low traffic" },
  { window: "22:00–01:00", delay: 0,  trains: 0, score: 96.3, note: "Off-peak · zero conflict" },
];

// ─── Color maps ────────────────────────────────────────────────────────────────

const IMPACT_C: Record<string, string>  = { Low: "#16a34a", Medium: "#d97706", High: "#dc2626" };
const IMPACT_BG: Record<string, string> = { Low: "#f0fdf4", Medium: "#fffbeb", High: "#fef2f2" };
const IMPACT_BD: Record<string, string> = { Low: "#bbf7d0", Medium: "#fde68a", High: "#fca5a5" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function pointOnSeg(x1: number, y1: number, x2: number, y2: number, t: number): [number, number] {
  return [lerp(x1, x2, t), lerp(y1, y2, t)];
}

// ─── Network SVG ───────────────────────────────────────────────────────────────

const NET = {
  stA: { x: 90,  y: 190 },
  stB: { x: 310, y: 190 },
  stC: { x: 310, y: 330 },
  stD: { x: 560, y: 190 },
};

interface TrainPos { id: string; x: number; y: number; color: string; status: string; }

function SimNetwork({
  simState,
  scenario,
  applyRec,
}: {
  simState: SimState;
  scenario: string;
  applyRec: boolean;
}) {
  const [trainT, setTrainT] = useState({ T201: 0.15, T202: 0.55, T203: 0.3 });
  const [dir, setDir]   = useState({ T201: 1, T202: 1, T203: -1 });
  const animRef = useRef<number | null>(null);
  const stateRef = useRef(simState);
  stateRef.current = simState;

  useEffect(() => {
    const speed = simState === "running" ? 0.035 : 0.02;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTrainT(prev => {
        const next = { ...prev };
        setDir(d => {
          const nd = { ...d };
          (["T201", "T202", "T203"] as const).forEach(id => {
            let t = prev[id] + d[id] * speed * dt;
            if (t > 1) { t = 1; nd[id] = -1; }
            if (t < 0) { t = 0; nd[id] = 1; }
            (next as Record<string, number>)[id] = t;
          });
          return nd;
        });
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [simState]);

  const W = 680, H = 360;
  const { stA, stB, stC, stD } = NET;

  const isCritical = scenario === "S12 Maintenance Window" || scenario === "S13 Maintenance Window";
  const s12Critical = scenario === "S12 Maintenance Window" || scenario === "Full Corridor Maintenance";
  const s13Warn     = scenario === "S13 Maintenance Window" || scenario === "Full Corridor Maintenance";

  const s12Color = s12Critical ? "#dc2626" : "#16a34a";
  const s13Color = s13Warn ? "#d97706" : "#16a34a";

  // Train positions
  const t201Pos = pointOnSeg(stA.x, stA.y, stD.x, stD.y, trainT.T201);
  const t202Pos = pointOnSeg(stA.x, stA.y, stD.x, stD.y, trainT.T202);
  const t203Pos = pointOnSeg(stB.x, stB.y, stC.x, stC.y, trainT.T203);

  // Maintenance marker on S12 mid
  const mwX = (stB.x + stD.x) / 2;
  const mwY = stB.y;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* Grid */}
      {[80, 160, 240, 320, 400, 480, 560, 640].map(x => (
        <line key={`vg${x}`} x1={x} y1={20} x2={x} y2={H - 20} stroke="#f0f2f5" strokeWidth={1} />
      ))}
      {[80, 160, 240, 320].map(y => (
        <line key={`hg${y}`} x1={20} y1={y} x2={W - 20} y2={y} stroke="#f0f2f5" strokeWidth={1} />
      ))}

      {/* ── Tracks ── */}

      {/* S11: A → B */}
      <line x1={stA.x + 16} y1={stA.y} x2={stB.x - 16} y2={stB.y} stroke="#16a34a" strokeWidth={4} strokeLinecap="round" />

      {/* S12: B → D (critical/normal based on scenario) */}
      {s12Critical && simState !== "idle" && (
        <line x1={stB.x + 16} y1={stB.y} x2={stD.x - 16} y2={stD.y} stroke="rgba(220,38,38,0.18)" strokeWidth={14} strokeLinecap="round" />
      )}
      <line x1={stB.x + 16} y1={stB.y} x2={stD.x - 16} y2={stD.y}
        stroke={s12Color} strokeWidth={s12Critical ? 5 : 4} strokeLinecap="round"
        strokeDasharray={s12Critical ? "10 5" : undefined} />

      {/* S13: B → C (branch) */}
      {s13Warn && simState !== "idle" && (
        <line x1={stB.x} y1={stB.y + 16} x2={stC.x} y2={stC.y - 16} stroke="rgba(217,119,6,0.18)" strokeWidth={12} strokeLinecap="round" />
      )}
      <line x1={stB.x} y1={stB.y + 16} x2={stC.x} y2={stC.y - 16}
        stroke={s13Color} strokeWidth={s13Warn ? 4.5 : 4} strokeLinecap="round"
        strokeDasharray={s13Warn ? "8 4" : undefined} />

      {/* Section labels */}
      {[
        { id: "S11", x: (stA.x + stB.x) / 2, y: stA.y - 22, color: "#16a34a", bg: "#f0fdf4" },
        { id: "S12", x: (stB.x + stD.x) / 2, y: stB.y - 24, color: s12Color, bg: s12Critical ? "#fef2f2" : "#f0fdf4", warn: s12Critical },
        { id: "S13", x: stB.x + 46, y: (stB.y + stC.y) / 2 - 10, color: s13Color, bg: s13Warn ? "#fffbeb" : "#f0fdf4" },
      ].map(sec => (
        <g key={sec.id}>
          <rect x={sec.x - 20} y={sec.y - 11} width={sec.warn ? 48 : 40} height={20} rx={4} fill={sec.bg} stroke={sec.color} strokeWidth={1.2} />
          <text x={sec.x + (sec.warn ? 4 : 0)} y={sec.y + 4} textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize={10} fontWeight="700" fill={sec.color}>
            {sec.id}{sec.warn ? " ⚠" : ""}
          </text>
        </g>
      ))}

      {/* Maintenance marker on S12 */}
      {simState !== "idle" && (
        <g>
          <rect x={mwX - 28} y={mwY + 20} width={56} height={26} rx={6}
            fill={applyRec ? "#f0fdf4" : "#f5f3ff"}
            stroke={applyRec ? "#bbf7d0" : "#c4b5fd"} strokeWidth={1.5} />
          <text x={mwX} y={mwY + 28} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={applyRec ? "#16a34a" : "#7c3aed"}>
            {applyRec ? "✓" : "🔧"}
          </text>
          <text x={mwX} y={mwY + 40} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fontWeight="700" fill={applyRec ? "#16a34a" : "#7c3aed"}>
            {applyRec ? "APPLIED" : "MW01"}
          </text>
        </g>
      )}

      {/* ── Stations ── */}
      {[
        { ...stA, label: "Station A", status: "normal" },
        { ...stB, label: "Station B", status: isCritical && simState !== "idle" ? "warning" : "normal" },
        { ...stC, label: "Station C", status: "normal" },
        { ...stD, label: "Station D", status: "normal" },
      ].map(st => {
        const c = st.status === "warning" ? "#d97706" : "#16a34a";
        return (
          <g key={st.label}>
            <circle cx={st.x} cy={st.y} r={20} fill="#fff" stroke="#dde2ea" strokeWidth={1.5} />
            <circle cx={st.x} cy={st.y} r={10} fill={c} opacity={0.15} />
            <circle cx={st.x} cy={st.y} r={6} fill={c} />
            <text x={st.x} y={st.y + 34} textAnchor="middle"
              fontFamily="var(--font-brand)" fontSize={11} fontWeight="700" fill="#0d1829">{st.label}</text>
          </g>
        );
      })}

      {/* ── Trains ── */}
      {([
        { id: "T201", pos: t201Pos, color: "#2563eb" },
        { id: "T202", pos: t202Pos, color: simState !== "idle" && s12Critical ? "#dc2626" : "#2563eb" },
        { id: "T203", pos: t203Pos, color: "#2c4a7c" },
      ] as { id: string; pos: [number, number]; color: string }[]).map(tr => (
        <g key={tr.id}>
          <rect x={tr.pos[0] - 20} y={tr.pos[1] - 10} width={40} height={18} rx={4}
            fill="#fff" stroke={tr.color} strokeWidth={1.5} />
          <text x={tr.pos[0]} y={tr.pos[1] + 4} textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize={9} fontWeight="700" fill={tr.color}>{tr.id}</text>
        </g>
      ))}

      {/* Sim mode watermark */}
      <text x={W - 14} y={H - 12} textAnchor="end"
        fontFamily="var(--font-ui)" fontSize={10} fontWeight="600" fill="#c4b5fd" opacity={0.9}
        letterSpacing="0.05em">
        SIMULATION MODE · WHAT-IF ANALYSIS
      </text>

      {/* Legend */}
      <g>
        {[
          { c: "#16a34a", l: "Normal" },
          { c: "#d97706", l: "Warning" },
          { c: "#dc2626", l: "Critical" },
          { c: "#2563eb", l: "Train" },
          { c: "#7c3aed", l: "AI Rec." },
        ].map((item, i) => (
          <g key={item.l} transform={`translate(${20 + i * 112}, ${H - 20})`}>
            <circle r={5} fill={item.c} />
            <text x={12} y={4} fontFamily="var(--font-ui)" fontSize={10} fill="#7a8898">{item.l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Simulation Progress ───────────────────────────────────────────────────────

function SimProgress({ progress, steps }: { progress: number; steps: string[] }) {
  const stepCount = steps.length;
  const currentStep = Math.min(Math.floor((progress / 100) * stepCount), stepCount - 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829", fontWeight: 500 }}>
          {steps[currentStep]}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>{progress}%</span>
      </div>
      <div style={{ height: 8, backgroundColor: "#e8edf3", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`, borderRadius: 4, transition: "width 0.15s",
          background: "linear-gradient(90deg, #7c3aed, #2563eb)",
        }} />
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              backgroundColor: i <= currentStep ? "#7c3aed" : "#e8edf3",
              border: `2px solid ${i <= currentStep ? "#7c3aed" : "#dde2ea"}`,
              transition: "background 0.3s",
            }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: i <= currentStep ? "#7c3aed" : "#a8b4c0", textAlign: "center" as const, lineHeight: 1.3 }}>
              {s.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Result Cards ──────────────────────────────────────────────────────────────

function ResultCard({ label, value, sub, color, bg, bd }: {
  label: string; value: string; sub?: string; color: string; bg: string; bd: string;
}) {
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.04)" }}>
      <ULabel>{label}</ULabel>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 34, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Compare Alternatives ──────────────────────────────────────────────────────

function ComparePanel({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <ULabel>ALTERNATIVE WINDOWS</ULabel>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {ALT_WINDOWS.map((alt, i) => (
          <div
            key={i}
            onClick={() => applied !== i && setPicked(p => p === i ? null : i)}
            style={{
              border: `1.5px solid ${applied === i ? "#bbf7d0" : picked === i ? "#7c3aed" : "#dde2ea"}`,
              backgroundColor: applied === i ? "#f0fdf4" : picked === i ? "#f5f3ff" : "#fff",
              borderRadius: 8, padding: "14px 16px", cursor: applied === i ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: applied === i ? "#16a34a" : picked === i ? "#7c3aed" : "#0d1829" }}>
                {applied === i ? "✓ " : ""}{alt.window}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.07em" }}>SCORE</div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: alt.score > 90 ? "#16a34a" : "#d97706" }}>{alt.score}</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", lineHeight: 1.4 }}>
              {alt.note}<br />Delay: {alt.delay} min · {alt.trains} train{alt.trains !== 1 ? "s" : ""} affected
            </div>
            {picked === i && applied !== i && (
              <button onClick={e => { e.stopPropagation(); setApplied(i); setPicked(null); }}
                style={{ marginTop: 10, width: "100%", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#fff", backgroundColor: "#7c3aed", border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer" }}>
                Apply Window
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const SIM_STEPS = ["Initialising", "Loading network", "Applying scenario", "Analysing trains", "Computing delays", "Checking conflicts", "Generating report"];

export default function Simulation() {
  const [config, setConfig] = useState<SimConfig>({
    scenario: "S12 Maintenance Window",
    duration: 2,
    startTime: "11:30",
    traffic: "Normal",
  });
  const [simState, setSimState] = useState<SimState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [applyRec, setApplyRec] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSim = useCallback(() => {
    setSimState("running");
    setProgress(0);
    setResult(null);
    setApplyRec(false);
    setShowCompare(false);
    let p = 0;
    intervalRef.current = setInterval(() => {
      p = Math.min(p + 3, 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(intervalRef.current!);
        const base = SCENARIO_RESULTS[config.scenario] ?? SCENARIO_RESULTS["S12 Maintenance Window"];
        const success = base.conflicts === 0;
        setResult({
          ...base,
          success,
          message: success
            ? "Simulation completed successfully — No critical conflicts detected."
            : `Simulation completed — ${base.conflicts} conflict${base.conflicts > 1 ? "s" : ""} detected. Review before applying.`,
        });
        setSimState("done");
      }
    }, 90);
  }, [config.scenario]);

  const resetSim = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSimState("idle");
    setProgress(0);
    setResult(null);
    setApplyRec(false);
    setShowCompare(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829",
    backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7,
    padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box",
    appearance: "none" as const,
  };

  const resultBase = result ? SCENARIO_RESULTS[config.scenario] : null;
  const hasConflict = result && result.conflicts > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              Simulation
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Test maintenance and operational scenarios before applying them to the live railway network.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: simState === "running" ? "#d97706" : simState === "done" ? "#16a34a" : "#7a8898", display: "inline-block" }} />
              {simState === "running" ? "Simulation Running" : simState === "done" ? "Simulation Complete" : "Simulation Ready"}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "ACTIVE SIMULATIONS", value: simState === "running" ? "1" : simState === "done" ? "0" : "0", sub: simState === "running" ? "Running now" : "None active", color: simState === "running" ? "#d97706" : "#0d1829", bg: simState === "running" ? "#fffbeb" : "#fff", bd: simState === "running" ? "#fde68a" : "#dde2ea" },
            { label: "SCENARIOS TESTED",    value: "18", sub: "Since system start", color: "#0d1829", bg: "#fff", bd: "#dde2ea" },
            { label: "CONFLICTS PREDICTED", value: "5",  sub: "Across all scenarios", color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
            { label: "POTENTIAL DELAY REDUCTION", value: "31%", sub: "If AI rec. applied", color: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0" },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
              <ULabel>{c.label}</ULabel>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 34, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 5 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column: Network + Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Network Panel */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e8edf3" }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Railway Network Simulation</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Demo Corridor · {config.scenario}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {simState === "running" && (
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 5, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d97706", display: "inline-block", animation: "none" }} />
                    Simulating
                  </span>
                )}
                {simState === "done" && (
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, padding: "3px 10px" }}>
                    ✓ Complete
                  </span>
                )}
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 5, padding: "3px 10px" }}>
                  Simulation Mode — What-if analysis
                </span>
              </div>
            </div>

            {/* SVG */}
            <div style={{ padding: "16px 12px 8px" }}>
              <SimNetwork simState={simState} scenario={config.scenario} applyRec={applyRec} />
            </div>

            {/* Progress bar during run */}
            {simState === "running" && (
              <div style={{ padding: "0 20px 18px" }}>
                <SimProgress progress={progress} steps={SIM_STEPS} />
              </div>
            )}
          </div>

          {/* Results */}
          {simState === "done" && result && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <ResultCard label="PREDICTED DELAY" value={`${result.delay} min`} sub={result.delay <= 10 ? "Acceptable" : "Review needed"}
                  color={result.delay <= 10 ? "#16a34a" : "#d97706"} bg={result.delay <= 10 ? "#f0fdf4" : "#fffbeb"} bd={result.delay <= 10 ? "#bbf7d0" : "#fde68a"} />
                <ResultCard label="AFFECTED TRAINS" value={String(result.trains)} sub={`${result.trains} train${result.trains !== 1 ? "s" : ""} impacted`}
                  color={result.trains === 0 ? "#16a34a" : "#d97706"} bg={result.trains === 0 ? "#f0fdf4" : "#fffbeb"} bd={result.trains === 0 ? "#bbf7d0" : "#fde68a"} />
                <ResultCard label="CONFLICTS" value={String(result.conflicts)} sub={result.conflicts === 0 ? "None detected" : "Requires attention"}
                  color={result.conflicts === 0 ? "#16a34a" : "#dc2626"} bg={result.conflicts === 0 ? "#f0fdf4" : "#fef2f2"} bd={result.conflicts === 0 ? "#bbf7d0" : "#fca5a5"} />
                <ResultCard label="NETWORK IMPACT" value={result.impact} sub="Overall assessment"
                  color={IMPACT_C[result.impact]} bg={IMPACT_BG[result.impact]} bd={IMPACT_BD[result.impact]} />
              </div>

              {/* Success / conflict message */}
              <div style={{
                backgroundColor: result.success ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${result.success ? "#bbf7d0" : "#fca5a5"}`,
                borderRadius: 10, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  backgroundColor: result.success ? "#16a34a" : "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, color: "#fff",
                }}>
                  {result.success ? "✓" : "⚠"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: result.success ? "#16a34a" : "#dc2626", letterSpacing: "0.08em", marginBottom: 3 }}>
                    {result.success ? "SIMULATION SUCCESSFUL" : "CONFLICTS DETECTED"}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829" }}>{result.message}</div>
                </div>
              </div>

              {/* AI Recommendation */}
              <div style={{
                backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed",
                borderRadius: 10, padding: "20px", boxShadow: "0 1px 3px rgba(124,58,237,0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>◆</div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.04em" }}>AI RECOMMENDATION</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: "#0d1829", marginBottom: 8 }}>
                      Proceed with S12 maintenance between 11:30–13:30.
                    </div>
                    <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 5 }}>REASON</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                        Low train density, sufficient crew availability, and minimal predicted operational disruption make this window optimal.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { k: "Scenario",          v: config.scenario },
                      { k: "Window",            v: config.startTime + "–" + (() => { const [h,m]=config.startTime.split(":").map(Number); const endH=h+config.duration; return `${String(endH).padStart(2,"0")}:${String(m).padStart(2,"0")}`; })() },
                      { k: "Predicted Delay",   v: `${result.delay} min`, c: result.delay <= 10 ? "#16a34a" : "#d97706" },
                      { k: "Confidence",        v: "High · 94.7%",         c: "#7c3aed" },
                    ].map(row => (
                      <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.k}</span>
                        <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: (row as {k: string; v: string; c?: string}).c ?? "#0d1829" }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setApplyRec(v => !v)}
                    style={{
                      flex: 2, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                      color: applyRec ? "#16a34a" : "#fff",
                      backgroundColor: applyRec ? "#f0fdf4" : "#7c3aed",
                      border: applyRec ? "1px solid #bbf7d0" : "none",
                      borderRadius: 8, padding: "11px 0", cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {applyRec ? "✓ Applied to Schedule" : "Apply to Schedule"}
                  </button>
                  <button
                    onClick={() => setShowCompare(v => !v)}
                    style={{
                      flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                      color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd",
                      borderRadius: 8, padding: "11px 0", cursor: "pointer",
                    }}
                  >
                    {showCompare ? "▲ Hide" : "Compare Alternatives"}
                  </button>
                </div>
              </div>

              {showCompare && <ComparePanel onClose={() => setShowCompare(false)} />}
            </>
          )}

          {/* Idle placeholder */}
          {simState === "idle" && (
            <div style={{
              backgroundColor: "#fff", border: "1px dashed #c4b5fd", borderRadius: 10, padding: "28px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" as const,
            }}>
              <div style={{ fontSize: 30, opacity: 0.4 }}>◆</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 600, color: "#7c3aed" }}>Ready to Simulate</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", maxWidth: 340, lineHeight: 1.6 }}>
                Configure a scenario in the controls panel and click <strong>Run Simulation</strong> to analyse its impact on the railway network.
              </div>
            </div>
          )}
        </div>

        {/* Right column: Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Controls card */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3" }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>Simulation Controls</div>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

              <CtrlField label="SCENARIO">
                <select
                  value={config.scenario}
                  onChange={e => { resetSim(); setConfig(c => ({ ...c, scenario: e.target.value })); }}
                  style={inputStyle}
                >
                  {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </CtrlField>

              <CtrlField label="MAINTENANCE DURATION">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {[1, 2, 3, 4].map(h => (
                    <button
                      key={h}
                      onClick={() => setConfig(c => ({ ...c, duration: h }))}
                      style={{
                        flex: 1, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                        color: config.duration === h ? "#fff" : "#7a8898",
                        backgroundColor: config.duration === h ? "#7c3aed" : "#f8fafc",
                        border: `1px solid ${config.duration === h ? "#7c3aed" : "#dde2ea"}`,
                        borderRadius: 7, padding: "8px 0", cursor: "pointer", transition: "all 0.12s",
                      }}
                    >{h}h</button>
                  ))}
                </div>
              </CtrlField>

              <CtrlField label="START TIME">
                <input type="time" value={config.startTime}
                  onChange={e => setConfig(c => ({ ...c, startTime: e.target.value }))}
                  style={inputStyle} />
              </CtrlField>

              <CtrlField label="TRAIN TRAFFIC">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Normal", "High", "Low"].map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig(c => ({ ...c, traffic: t }))}
                      style={{
                        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, textAlign: "left" as const,
                        color: config.traffic === t ? "#fff" : "#374151",
                        backgroundColor: config.traffic === t ? "#2563eb" : "#f8fafc",
                        border: `1px solid ${config.traffic === t ? "#2563eb" : "#dde2ea"}`,
                        borderRadius: 7, padding: "8px 14px", cursor: "pointer", transition: "all 0.12s",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      {t}
                      {config.traffic === t && <span style={{ fontSize: 10 }}>●</span>}
                    </button>
                  ))}
                </div>
              </CtrlField>

              {/* Config summary */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px" }}>
                <ULabel>CONFIGURATION SUMMARY</ULabel>
                {[
                  { k: "Window", v: `${config.startTime} + ${config.duration}h` },
                  { k: "Traffic", v: config.traffic },
                  { k: "Scenario", v: config.scenario.length > 22 ? config.scenario.slice(0, 22) + "…" : config.scenario },
                ].map(row => (
                  <div key={row.k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{row.k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "#0d1829" }}>{row.v}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={runSim}
                disabled={simState === "running"}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
                  color: "#fff", backgroundColor: simState === "running" ? "#a8b4c0" : "#7c3aed",
                  border: "none", borderRadius: 9, padding: "13px 0",
                  cursor: simState === "running" ? "not-allowed" : "pointer",
                  boxShadow: simState !== "running" ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {simState === "running" ? `Simulating… ${progress}%` : "▶  Run Simulation"}
              </button>

              <button
                onClick={resetSim}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                  color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea",
                  borderRadius: 9, padding: "10px 0", cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Recent simulations */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
            <ULabel>RECENT SIMULATIONS</ULabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {[
                { name: "S12 Window", result: "No conflicts", color: "#16a34a", time: "10:21" },
                { name: "S13 Window", result: "2 conflicts", color: "#dc2626", time: "09:55" },
                { name: "Signal S08", result: "Delay: 4 min", color: "#d97706", time: "09:30" },
              ].map(sim => (
                <div key={sim.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", backgroundColor: "#f8fafc", borderRadius: 7, border: "1px solid #e8edf3" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "#0d1829" }}>{sim.name}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: sim.color }}>{sim.result}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a8b4c0" }}>{sim.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CtrlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <ULabel>{label}</ULabel>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829",
  backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7,
  padding: "9px 12px", outline: "none", width: "100%", boxSizing: "border-box",
};
