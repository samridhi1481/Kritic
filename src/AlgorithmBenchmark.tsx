import { useState, useEffect, useRef } from "react";

// ─── Data ──────────────────────────────────────────────────────────────────────

type AlgoId = "greedy" | "dept" | "railtwin";

interface Metric {
  key: string;
  label: string;
  unit: string;
  higherBetter: boolean;
  explain: string;
  values: Record<AlgoId, number>;
  format: (v: number) => string;
}

const ALGOS: Array<{ id: AlgoId; label: string; sub: string; icon: string; color: string; bg: string; border: string }> = [
  { id: "greedy",   label: "Greedy Scheduling",       sub: "First-fit heuristic per department",   icon: "⚡", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { id: "dept",     label: "Department-wise Scheduling", sub: "Optimized within each department",   icon: "🏗", color: "#2563eb", bg: "#eff4ff", border: "#bfcffd" },
  { id: "railtwin", label: "RailTwin AI",               sub: "Cross-department constraint solver", icon: "◆", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
];

const METRICS: Metric[] = [
  {
    key: "completion",  label: "Maintenance Completion", unit: "%",    higherBetter: true,
    explain: "Percentage of scheduled maintenance tasks successfully completed within the planning horizon.",
    values: { greedy: 76, dept: 82, railtwin: 89 },
    format: v => `${v}%`,
  },
  {
    key: "blocks",      label: "Coordinated Blocks",    unit: "",     higherBetter: false,
    explain: "Total number of maintenance blocks scheduled. Fewer coordinated blocks means greater efficiency.",
    values: { greedy: 11, dept: 9, railtwin: 7 },
    format: v => String(v),
  },
  {
    key: "blockHours",  label: "Total Block Hours",     unit: "h",    higherBetter: false,
    explain: "Cumulative hours of track/section access required. Lower values reduce operational impact.",
    values: { greedy: 47, dept: 39, railtwin: 31 },
    format: v => `${v}h`,
  },
  {
    key: "delay",       label: "Predicted Train Delay", unit: "min",  higherBetter: false,
    explain: "Estimated total additional delay introduced to train services by the maintenance schedule.",
    values: { greedy: 47, dept: 32, railtwin: 21 },
    format: v => `${v} min`,
  },
  {
    key: "conflicts",   label: "Operational Conflicts", unit: "",     higherBetter: false,
    explain: "Number of scheduling conflicts detected: resource clashes, crew overlaps, or train path violations.",
    values: { greedy: 9, dept: 6, railtwin: 3 },
    format: v => String(v),
  },
  {
    key: "availability",label: "Asset Availability",   unit: "%",    higherBetter: true,
    explain: "Percentage of total asset-hours remaining available for revenue operations during the plan.",
    values: { greedy: 94.1, dept: 96.0, railtwin: 98.2 },
    format: v => `${v.toFixed(1)}%`,
  },
  {
    key: "stability",   label: "Schedule Stability",   unit: "%",    higherBetter: true,
    explain: "Resilience of the plan to minor disruptions — higher values mean fewer cascading changes.",
    values: { greedy: 78, dept: 85, railtwin: 94 },
    format: v => `${v}%`,
  },
  {
    key: "runtime",     label: "Solver Runtime",       unit: "s",    higherBetter: false,
    explain: "Time taken by the algorithm to produce a complete schedule. RailTwin AI trades a small runtime increase for substantially better outcomes.",
    values: { greedy: 0.8, dept: 1.4, railtwin: 2.1 },
    format: v => `${v}s`,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function rankColor(rank: 1 | 2 | 3): string {
  return rank === 1 ? "#16a34a" : rank === 2 ? "#d97706" : "#dc2626";
}

function getRank(metric: Metric, algoId: AlgoId): 1 | 2 | 3 {
  const vals = ALGOS.map(a => ({ id: a.id, v: metric.values[a.id] }));
  vals.sort((a, b) => metric.higherBetter ? b.v - a.v : a.v - b.v);
  return (vals.findIndex(x => x.id === algoId) + 1) as 1 | 2 | 3;
}

function normalizeBar(metric: Metric, algoId: AlgoId): number {
  const vals = Object.values(metric.values);
  const min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) return 100;
  const v = metric.values[algoId];
  return metric.higherBetter
    ? ((v - min) / (max - min)) * 100
    : ((max - v) / (max - min)) * 100;
}

// ─── Algorithm Card ────────────────────────────────────────────────────────────

function AlgoCard({ algo, selected, onClick, ran }: {
  algo: typeof ALGOS[0]; selected: boolean; onClick: () => void; ran: boolean;
}) {
  const isAI = algo.id === "railtwin";
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, borderRadius: 10, padding: "16px 18px", cursor: "pointer", transition: "all 0.18s",
        backgroundColor: selected ? algo.bg : "#fff",
        border: `2px solid ${selected ? algo.color : "#dde2ea"}`,
        boxShadow: selected ? `0 0 0 3px ${algo.color}18` : "0 1px 3px rgba(13,24,41,0.05)",
        position: "relative" as const,
      }}
    >
      {isAI && (
        <div style={{ position: "absolute", top: -1, right: 12, fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: "0 0 6px 6px", padding: "2px 10px" }}>
          RECOMMENDED
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: selected ? algo.color : "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.18s" }}>
          <span style={{ filter: selected ? "none" : "grayscale(1)" }}>{algo.icon}</span>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: selected ? algo.color : "#0d1829" }}>{algo.label}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 1 }}>{algo.sub}</div>
        </div>
      </div>
      {ran && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { k: "Delay",       v: METRICS.find(m => m.key === "delay")!.format(METRICS.find(m => m.key === "delay")!.values[algo.id]) },
            { k: "Conflicts",   v: METRICS.find(m => m.key === "conflicts")!.format(METRICS.find(m => m.key === "conflicts")!.values[algo.id]) },
            { k: "Completion",  v: METRICS.find(m => m.key === "completion")!.format(METRICS.find(m => m.key === "completion")!.values[algo.id]) },
            { k: "Stability",   v: METRICS.find(m => m.key === "stability")!.format(METRICS.find(m => m.key === "stability")!.values[algo.id]) },
          ].map(row => (
            <div key={row.k} style={{ backgroundColor: selected ? "rgba(255,255,255,0.65)" : "#f8fafc", borderRadius: 6, padding: "7px 10px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", marginBottom: 2 }}>{row.k.toUpperCase()}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: selected ? algo.color : "#374151" }}>{row.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comparison Table ──────────────────────────────────────────────────────────

function ComparisonTable({ selectedAlgo, tooltipKey, setTooltipKey }: {
  selectedAlgo: AlgoId;
  tooltipKey: string | null;
  setTooltipKey: (k: string | null) => void;
}) {
  return (
    <div style={{ border: "1px solid #dde2ea", borderRadius: 10, overflow: "hidden" }}>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr", backgroundColor: "#fafbfc", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ padding: "12px 16px", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0" }}>METRIC</div>
        {ALGOS.map(algo => (
          <div key={algo.id} style={{ padding: "12px 16px", fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: algo.id === selectedAlgo ? algo.color : "#374151", backgroundColor: algo.id === selectedAlgo ? algo.bg : "transparent", borderLeft: "1px solid #e8edf3", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{algo.icon}</span>
            {algo.label}
            {algo.id === "railtwin" && <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#7c3aed", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 10, padding: "1px 7px", marginLeft: 2 }}>AI</span>}
          </div>
        ))}
      </div>

      {METRICS.map((metric, i) => {
        const isHovered = tooltipKey === metric.key;
        return (
          <div key={metric.key}>
            <div
              style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr", backgroundColor: isHovered ? "#f5f8ff" : i % 2 === 1 ? "#fafbfc" : "#fff", cursor: "pointer", transition: "background 0.12s" }}
              onClick={() => setTooltipKey(isHovered ? null : metric.key)}
            >
              {/* Label */}
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#374151" }}>{metric.label}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#bfcffd", backgroundColor: "#eff4ff", border: "1px solid #dbeafe", borderRadius: 10, padding: "1px 6px" }}>?</span>
              </div>

              {ALGOS.map(algo => {
                const rank = getRank(metric, algo.id);
                const barW = normalizeBar(metric, algo.id);
                const isSelected = algo.id === selectedAlgo;
                return (
                  <div key={algo.id} style={{ padding: "10px 16px", borderLeft: "1px solid #f0f2f5", backgroundColor: isSelected ? `${algo.color}08` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: rankColor(rank) }}>
                        {metric.format(metric.values[algo.id])}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: rankColor(rank), backgroundColor: rank === 1 ? "#dcfce7" : rank === 2 ? "#fef9c3" : "#fee2e2", border: `1px solid ${rankColor(rank)}33`, borderRadius: 10, padding: "1px 6px" }}>
                        #{rank}
                      </span>
                    </div>
                    <div style={{ height: 5, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barW}%`, backgroundColor: algo.color, borderRadius: 3, opacity: isSelected ? 1 : 0.45, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tooltip row */}
            {isHovered && (
              <div style={{ gridColumn: "1/-1", backgroundColor: "#eff4ff", borderTop: "1px solid #dbeafe", borderBottom: "1px solid #dbeafe", padding: "10px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#2563eb" }}>i</span>
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#1e3a5f", lineHeight: 1.55 }}>{metric.explain}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function MetricBarChart({ metric, selectedAlgo }: { metric: Metric; selectedAlgo: AlgoId }) {
  const maxVal = Math.max(...Object.values(metric.values));
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(13,24,41,0.04)" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 12 }}>{metric.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ALGOS.map(algo => {
          const v = metric.values[algo.id];
          const barPct = (v / maxVal) * 100;
          const rank = getRank(metric, algo.id);
          const isSelected = algo.id === selectedAlgo;
          return (
            <div key={algo.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: isSelected ? algo.color : "#7a8898", fontWeight: isSelected ? 700 : 400 }}>{algo.label}</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 11, fontWeight: 700, color: rankColor(rank) }}>{metric.format(v)}</span>
              </div>
              <div style={{ height: 7, backgroundColor: "#f0f2f5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, backgroundColor: isSelected ? algo.color : `${algo.color}55`, borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1.5px solid #bfcffd", borderTop: "3px solid #2563eb", borderRadius: 10, padding: "22px 24px", boxShadow: "0 2px 10px rgba(37,99,235,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>Detailed Benchmark Results</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Simulated values · Demo Corridor · Not real railway data</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {METRICS.map(m => {
          const rtVal = m.values.railtwin;
          const greedyVal = m.values.greedy;
          const rawDiff = m.higherBetter
            ? Math.round(((rtVal - greedyVal) / greedyVal) * 100)
            : Math.round(((greedyVal - rtVal) / greedyVal) * 100);
          const isRuntime = m.key === "runtime";
          const improvLabel = isRuntime
            ? `${rtVal / greedyVal}× compute vs Greedy`
            : rawDiff >= 0
              ? `+${rawDiff}% vs Greedy`
              : `${rawDiff}% vs Greedy`;
          const improvColor = isRuntime ? "#d97706" : rawDiff >= 0 ? "#16a34a" : "#dc2626";
          return (
            <div key={m.key} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px" }}>
              <ULabel>{m.label.toUpperCase()}</ULabel>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "#7c3aed", letterSpacing: "-0.01em" }}>{m.format(rtVal)}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: improvColor, marginTop: 4 }}>
                {improvLabel}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px" }}>
        <ULabel color="#7c3aed">METHODOLOGY NOTE</ULabel>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.65 }}>
          All values shown are simulated benchmark results generated from a synthetic Demo Corridor dataset. They are intended to illustrate relative algorithmic performance only and do not represent real railway operational data, outcomes, or guarantees. RailTwin AI results depend on actual network size, traffic density, maintenance load, and constraint configuration.
        </div>
      </div>
    </div>
  );
}

// ─── Optimization Impact ───────────────────────────────────────────────────────

function OptimizationImpact() {
  const improvements = [
    { label: "Fewer blocks",          value: "36%", c: "#16a34a" },
    { label: "Fewer conflicts",        value: "67%", c: "#16a34a" },
    { label: "Lower predicted delay",  value: "55%", c: "#16a34a" },
  ];

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 18 }}>Optimization Impact</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "center" }}>
        {/* Before */}
        <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 14 }}>BEFORE — Independent Scheduling</div>
          {[
            { k: "Blocks",         v: "11 blocks",  c: "#dc2626" },
            { k: "Conflicts",      v: "9 conflicts", c: "#dc2626" },
            { k: "Estimated Delay", v: "47 min",    c: "#dc2626" },
          ].map(row => (
            <div key={row.k} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #fca5a5" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#fca5a5", marginBottom: 2 }}>{row.k.toUpperCase()}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: row.c }}>{row.v}</div>
            </div>
          ))}
        </div>

        {/* Arrow + improvements */}
        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f5f3ff", border: "1.5px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 5l4 3-4 3" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {improvements.map(imp => (
              <div key={imp.label} style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 10px", textAlign: "center" as const }}>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: imp.c }}>−{imp.value}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 600, color: "#15803d", letterSpacing: "0.04em" }}>{imp.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* After */}
        <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 14 }}>AFTER — RailTwin AI Coordinated Optimization</div>
          {[
            { k: "Coordinated Blocks", v: "7 blocks",   c: "#16a34a" },
            { k: "Conflicts",           v: "3 conflicts", c: "#16a34a" },
            { k: "Estimated Delay",    v: "21 min",      c: "#16a34a" },
          ].map(row => (
            <div key={row.k} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #bbf7d0" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#86efac", marginBottom: 2 }}>{row.k.toUpperCase()}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: row.c }}>{row.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Run Benchmark Progress ────────────────────────────────────────────────────

function RunBenchmarkBar({ progress }: { progress: number }) {
  const stages = ["Greedy Scheduling", "Department-wise Scheduling", "RailTwin AI", "Analyzing results"];
  const stageIdx = progress < 30 ? 0 : progress < 60 ? 1 : progress < 85 ? 2 : 3;

  return (
    <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>Running Benchmark…</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7c3aed" }}>{Math.round(progress)}%</div>
      </div>
      <div style={{ height: 8, backgroundColor: "#ede9fe", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#7c3aed", borderRadius: 4, transition: "width 0.1s" }} />
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7c3aed" }}>
        Testing: {stages[stageIdx]}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AlgorithmBenchmark() {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoId>("railtwin");
  const [tooltipKey, setTooltipKey]     = useState<string | null>(null);
  const [benchmarkState, setBenchmarkState] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress]         = useState(0);
  const [showDetail, setShowDetail]     = useState(false);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const runBenchmark = () => {
    if (benchmarkState === "running") return;
    setBenchmarkState("running");
    setProgress(0);
    setShowDetail(false);

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (Math.random() * 3 + 1);
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          setBenchmarkState("done");
          return 100;
        }
        return next;
      });
    }, 60);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
              <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em" }}>
                Algorithm Benchmark
              </h1>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20, padding: "3px 12px" }}>
                SIMULATED VALUES
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Compare scheduling approaches and measure the operational impact of RailTwin AI. <em>Demo data only — not real railway results.</em>
            </p>
          </div>
          <button
            onClick={runBenchmark}
            disabled={benchmarkState === "running"}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
              color: benchmarkState === "done" ? "#16a34a" : "#fff",
              backgroundColor: benchmarkState === "running" ? "#a8b4c0" : benchmarkState === "done" ? "#f0fdf4" : "#7c3aed",
              border: benchmarkState === "done" ? "1px solid #bbf7d0" : "none",
              borderRadius: 9, padding: "10px 22px", cursor: benchmarkState === "running" ? "not-allowed" : "pointer",
              boxShadow: benchmarkState === "done" || benchmarkState === "running" ? "none" : "0 2px 10px rgba(124,58,237,0.35)",
              transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {benchmarkState === "running" ? (
              <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "none" }} /> Running…</>
            ) : benchmarkState === "done" ? "✓ Benchmark Complete" : "▶ Run Benchmark"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Algorithm cards */}
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            {ALGOS.map(algo => (
              <AlgoCard
                key={algo.id} algo={algo}
                selected={selectedAlgo === algo.id}
                onClick={() => setSelectedAlgo(algo.id)}
                ran={benchmarkState !== "idle"}
              />
            ))}
          </div>

          {/* Progress bar */}
          {benchmarkState === "running" && (
            <div style={{ flexShrink: 0 }}>
              <RunBenchmarkBar progress={progress} />
            </div>
          )}

          {/* Comparison table */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Metric Comparison</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Click a row to see the metric definition · #1 = best</div>
              </div>
              {benchmarkState === "done" && (
                <button
                  onClick={() => setShowDetail(v => !v)}
                  style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 7, padding: "6px 16px", cursor: "pointer" }}
                >
                  {showDetail ? "▲ Close Results" : "View Detailed Results"}
                </button>
              )}
            </div>
            <ComparisonTable
              selectedAlgo={selectedAlgo}
              tooltipKey={tooltipKey}
              setTooltipKey={setTooltipKey}
            />
          </div>

          {/* Detail drawer */}
          {showDetail && <DetailDrawer onClose={() => setShowDetail(false)} />}

          {/* Mini bar charts */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 12 }}>Visual Comparison</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {METRICS.slice(0, 4).map(m => (
                <MetricBarChart key={m.key} metric={m} selectedAlgo={selectedAlgo} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
              {METRICS.slice(4).map(m => (
                <MetricBarChart key={m.key} metric={m} selectedAlgo={selectedAlgo} />
              ))}
            </div>
          </div>

          {/* Optimization impact */}
          <div style={{ flexShrink: 0 }}>
            <OptimizationImpact />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed", borderRadius: 10, boxShadow: "0 1px 4px rgba(124,58,237,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>BENCHMARK INSIGHT</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Summary */}
            <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", lineHeight: 1.65, fontStyle: "italic" }}>
                "RailTwin AI produces a more coordinated maintenance plan while reducing operational disruption across all benchmarked metrics."
              </div>
            </div>

            {/* Why RailTwin AI wins */}
            <div>
              <ULabel color="#7c3aed">WHY RAILTWIN AI SCORES HIGHER</ULabel>
              {[
                "Multiple departments coordinated in a single pass",
                "Safety constraints enforced as hard constraints",
                "Train conflicts reduced via path-aware scheduling",
                "Maintenance priorities preserved across blocks",
                "Human approval remains required before activation",
              ].map(r => (
                <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2.5 2.5 4-4" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.45 }}>{r}</span>
                </div>
              ))}
            </div>

            {/* Selected algo stats */}
            <div>
              <ULabel>SELECTED: {ALGOS.find(a => a.id === selectedAlgo)?.label.toUpperCase()}</ULabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {METRICS.map(m => {
                  const v = m.values[selectedAlgo];
                  const rank = getRank(m, selectedAlgo);
                  return (
                    <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{m.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: rankColor(rank) }}>{m.format(v)}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: rankColor(rank), backgroundColor: rank === 1 ? "#dcfce7" : rank === 2 ? "#fef9c3" : "#fee2e2", border: `1px solid ${rankColor(rank)}33`, borderRadius: 8, padding: "1px 5px" }}>#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px" }}>
              <ULabel color="#d97706">DEMO DISCLAIMER</ULabel>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
                All values are simulated from a synthetic Demo Corridor dataset. Results will vary with real network size, traffic density and constraint configuration.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
