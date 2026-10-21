import { useState, useRef, useCallback } from "react";

// ─── Data per time range ───────────────────────────────────────────────────────

type TimeRange = "Today" | "7 Days" | "30 Days" | "90 Days";
type AssetFilter = "All" | "Track" | "Signal" | "Traction" | "Engineering";
type StatusFilter = "All" | "Healthy" | "Warning" | "Critical";

interface DataSet {
  labels: string[];
  assetHealth: number[];          // 0–100
  maintenanceDone: number[];      // count
  maintenancePending: number[];   // count
  delays: number[];               // minutes
  conflicts: number[];            // count
  workOrders: Record<string, number>; // by asset type
  riskDist: { healthy: number; medium: number; high: number };
  kpi: {
    reliability: string;
    onTime: string;
    mtbf: string;
    costAvoided: string;
    downtimeReduced: string;
    criticalIssues: number;
  };
}

const DATASETS: Record<TimeRange, DataSet> = {
  "Today": {
    labels: ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00"],
    assetHealth: [91,91,92,92,93,93,94,94],
    maintenanceDone: [1,2,3,4,5,5,6,6],
    maintenancePending: [8,7,6,5,4,4,3,3],
    delays: [24,22,20,18,15,12,10,8],
    conflicts: [3,3,2,2,2,1,1,0],
    workOrders: { Track: 6, Signal: 4, Traction: 3, Engineering: 2 },
    riskDist: { healthy: 68, medium: 20, high: 12 },
    kpi: { reliability: "94.1%", onTime: "93.2%", mtbf: "412 hrs", costAvoided: "₹16.2L", downtimeReduced: "22%", criticalIssues: 14 },
  },
  "7 Days": {
    labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    assetHealth: [89,90,91,92,93,94,94],
    maintenanceDone: [3,5,6,8,10,12,14],
    maintenancePending: [10,9,8,7,6,5,4],
    delays: [28,24,21,18,15,12,10],
    conflicts: [4,4,3,3,2,1,1],
    workOrders: { Track: 14, Signal: 9, Traction: 7, Engineering: 5 },
    riskDist: { healthy: 71, medium: 18, high: 11 },
    kpi: { reliability: "95.0%", onTime: "94.1%", mtbf: "418 hrs", costAvoided: "₹17.4L", downtimeReduced: "24%", criticalIssues: 13 },
  },
  "30 Days": {
    labels: ["W1","W2","W3","W4","W5"],
    assetHealth: [87,89,91,93,95],
    maintenanceDone: [8,14,18,22,25],
    maintenancePending: [15,12,9,7,5],
    delays: [32,27,22,17,13],
    conflicts: [5,4,3,2,1],
    workOrders: { Track: 28, Signal: 18, Traction: 14, Engineering: 9 },
    riskDist: { healthy: 74, medium: 16, high: 10 },
    kpi: { reliability: "96.4%", onTime: "94.8%", mtbf: "428 hrs", costAvoided: "₹18.6L", downtimeReduced: "27%", criticalIssues: 12 },
  },
  "90 Days": {
    labels: ["Month 1","Month 2","Month 3"],
    assetHealth: [82,88,95],
    maintenanceDone: [32,54,72],
    maintenancePending: [28,18,8],
    delays: [38,28,14],
    conflicts: [8,5,2],
    workOrders: { Track: 68, Signal: 44, Traction: 35, Engineering: 22 },
    riskDist: { healthy: 78, medium: 14, high: 8 },
    kpi: { reliability: "97.1%", onTime: "95.6%", mtbf: "441 hrs", costAvoided: "₹24.8L", downtimeReduced: "34%", criticalIssues: 10 },
  },
};

// ─── Colors ────────────────────────────────────────────────────────────────────

const C = {
  blue:   "#2563eb",
  green:  "#16a34a",
  amber:  "#d97706",
  red:    "#dc2626",
  purple: "#7c3aed",
  navy:   "#0d1829",
  muted:  "#7a8898",
  border: "#dde2ea",
  bg:     "#f8fafc",
  gridLine: "#e8edf3",
};

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? C.muted, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── SVG Tooltip ──────────────────────────────────────────────────────────────

interface TooltipState { x: number; y: number; content: React.ReactNode; visible: boolean; }

// ─── Line Chart ───────────────────────────────────────────────────────────────

interface LineSeries {
  values: number[];
  color: string;
  label: string;
  dash?: string;
}

function LineChart({
  title,
  series,
  labels,
  yUnit = "",
  yMin: yMinProp,
  yMax: yMaxProp,
  height = 180,
}: {
  title: string;
  series: LineSeries[];
  labels: string[];
  yUnit?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: null, visible: false });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const ML = 44, MR = 16, MT = 12, MB = 28;
  const VW = 500, VH = height;
  const cw = VW - ML - MR;
  const ch = VH - MT - MB;

  const allVals = series.flatMap(s => s.values);
  const yMin = yMinProp ?? Math.max(0, Math.min(...allVals) - (Math.max(...allVals) - Math.min(...allVals)) * 0.15);
  const yMax = yMaxProp ?? Math.max(...allVals) + (Math.max(...allVals) - Math.min(...allVals)) * 0.15;
  const n = labels.length;

  const xPos = (i: number) => ML + (n <= 1 ? cw / 2 : (i / (n - 1)) * cw);
  const yPos = (v: number) => MT + (1 - clamp((v - yMin) / (yMax - yMin), 0, 1)) * ch;

  const yTicks = 4;
  const yStep = (yMax - yMin) / yTicks;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    const frac = clamp((svgX - ML) / cw, 0, 1);
    const idx = Math.round(frac * (n - 1));
    setHoverIdx(idx);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 8,
      visible: true,
      content: (
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{labels[idx]}</div>
          {series.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: C.navy }}>{s.label}: </span>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: s.color }}>{s.values[idx]}{yUnit}</span>
            </div>
          ))}
        </div>
      ),
    });
  }, [series, labels, n, cw, yUnit]);

  return (
    <div style={{ position: "relative" }}>
      {/* Legend */}
      {series.length > 1 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          {series.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 16, height: 2, backgroundColor: s.color, display: "inline-block", borderRadius: 1 }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: C.muted }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(t => ({ ...t, visible: false })); setHoverIdx(null); }}
      >
        {/* Y grid lines + labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = yMin + i * yStep;
          const y = yPos(v);
          return (
            <g key={i}>
              <line x1={ML} y1={y} x2={VW - MR} y2={y} stroke={C.gridLine} strokeWidth={1} />
              <text x={ML - 6} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9} fill={C.muted}>
                {Math.round(v)}{yUnit}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {labels.map((lbl, i) => (
          <text key={lbl} x={xPos(i)} y={VH - 4} textAnchor="middle"
            fontFamily="var(--font-ui)" fontSize={9} fill={hoverIdx === i ? C.navy : C.muted}
            fontWeight={hoverIdx === i ? "600" : "400"}>
            {lbl}
          </text>
        ))}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line x1={xPos(hoverIdx)} y1={MT} x2={xPos(hoverIdx)} y2={VH - MB}
            stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* Series */}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [xPos(i), yPos(v)] as [number, number]);
          const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
          const areaPath = `${linePath} L ${xPos(n - 1)} ${VH - MB} L ${xPos(0)} ${VH - MB} Z`;
          const fillId = `fill-${si}-${s.label.replace(/\s/g, "")}`;

          return (
            <g key={s.label}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.08 : 0.12} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              {si === 0 && <path d={areaPath} fill={`url(#${fillId})`} />}
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={s.dash} />
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={hoverIdx === i ? 5 : 3}
                  fill="#fff" stroke={s.color} strokeWidth={2}
                  style={{ transition: "r 0.1s" }} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div style={{
          position: "absolute", left: Math.min(tooltip.x + 12, 340), top: tooltip.y,
          backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 8,
          padding: "10px 12px", boxShadow: "0 4px 16px rgba(13,24,41,0.12)",
          pointerEvents: "none", zIndex: 20, minWidth: 120,
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({
  data,
  colors,
  height = 180,
}: {
  data: { label: string; value: number }[];
  colors: string[];
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const VW = 500, VH = height;
  const ML = 40, MR = 16, MT = 12, MB = 32;
  const cw = VW - ML - MR;
  const ch = VH - MT - MB;

  const maxVal = Math.max(...data.map(d => d.value));
  const barW  = Math.min(60, (cw / data.length) * 0.55);
  const gap   = cw / data.length;

  const yTicks = 4;
  const yStep  = Math.ceil(maxVal / yTicks / 5) * 5;
  const yMax   = yStep * yTicks;

  const xPos = (i: number) => ML + gap * i + gap / 2;
  const barH = (v: number) => (v / yMax) * ch;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" as const }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: C.muted }}>{d.label}</span>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block", overflow: "visible" }}>
        {/* Y grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = i * yStep;
          const y = MT + (1 - v / yMax) * ch;
          return (
            <g key={i}>
              <line x1={ML} y1={y} x2={VW - MR} y2={y} stroke={C.gridLine} strokeWidth={1} />
              <text x={ML - 6} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9} fill={C.muted}>{v}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const bh = barH(d.value);
          const bx = xPos(i) - barW / 2;
          const by = MT + ch - bh;
          const color = colors[i % colors.length];
          const isHov = hovered === i;
          return (
            <g key={d.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}>
              <rect x={bx} y={by} width={barW} height={bh} rx={4} ry={4}
                fill={isHov ? color : color + "cc"}
                style={{ transition: "fill 0.12s" }} />
              {/* Value label */}
              <text x={xPos(i)} y={by - 5} textAnchor="middle"
                fontFamily="var(--font-brand)" fontSize={10} fontWeight="700" fill={color}
                opacity={isHov ? 1 : 0} style={{ transition: "opacity 0.12s" }}>
                {d.value}
              </text>
              {/* Always show on hover */}
              {isHov && (
                <text x={xPos(i)} y={by - 5} textAnchor="middle"
                  fontFamily="var(--font-brand)" fontSize={10} fontWeight="700" fill={color}>
                  {d.value}
                </text>
              )}
              <text x={xPos(i)} y={VH - 4} textAnchor="middle"
                fontFamily="var(--font-ui)" fontSize={9}
                fill={isHov ? C.navy : C.muted} fontWeight={isHov ? "600" : "400"}>
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line x1={ML} y1={MT + ch} x2={VW - MR} y2={MT + ch} stroke={C.border} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

// ─── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, d) => s + d.value, 0);
  const cx = 100, cy = 100, R = 76, r = 50;

  let cumAngle = -Math.PI / 2;
  const arcs = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const start = cumAngle;
    cumAngle += angle;
    return { ...seg, startAngle: start, endAngle: cumAngle };
  });

  function arc(startA: number, endA: number, outerR: number, innerR: number, expand = 0) {
    const midA = (startA + endA) / 2;
    const ox = expand ? Math.cos(midA) * expand : 0;
    const oy = expand ? Math.sin(midA) * expand : 0;
    const x1 = cx + ox + Math.cos(startA) * outerR, y1 = cy + oy + Math.sin(startA) * outerR;
    const x2 = cx + ox + Math.cos(endA)   * outerR, y2 = cy + oy + Math.sin(endA)   * outerR;
    const x3 = cx + ox + Math.cos(endA)   * innerR, y3 = cy + oy + Math.sin(endA)   * innerR;
    const x4 = cx + ox + Math.cos(startA) * innerR, y4 = cy + oy + Math.sin(startA) * innerR;
    const lg = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${lg} 0 ${x4} ${y4} Z`;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => (
          <path key={a.label}
            d={arc(a.startAngle, a.endAngle, R, r, hovered === i ? 5 : 0)}
            fill={a.color}
            opacity={hovered !== null && hovered !== i ? 0.55 : 1}
            style={{ transition: "all 0.15s", cursor: "pointer" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)} />
        ))}
        {/* Center */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="var(--font-brand)" fontSize={22} fontWeight="700" fill={C.navy}>
          {hovered !== null ? arcs[hovered].value : total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontFamily="var(--font-ui)" fontSize={9} fill={C.muted}>
          {hovered !== null ? arcs[hovered].label.toUpperCase() : "TOTAL ASSETS"}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {arcs.map((a, i) => (
          <div key={a.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default", opacity: hovered !== null && hovered !== i ? 0.5 : 1, transition: "opacity 0.15s" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: a.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: C.navy }}>{a.label}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: a.color }}>{a.value}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart Card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, onClick }: { title: string; sub?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10,
        padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</div>
        {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────────

function KPICards({ kpi }: { kpi: DataSet["kpi"] }) {
  const cards = [
    { label: "ASSET RELIABILITY",      value: kpi.reliability,    color: C.green,  bg: "#f0fdf4", bd: "#bbf7d0" },
    { label: "ON-TIME PERFORMANCE",    value: kpi.onTime,         color: C.blue,   bg: "#eff4ff", bd: "#bfcffd" },
    { label: "MTBF",                   value: kpi.mtbf,           color: C.navy,   bg: "#fff",    bd: "#dde2ea" },
    { label: "MAINTENANCE COST AVOIDED", value: kpi.costAvoided,  color: C.purple, bg: "#f5f3ff", bd: "#c4b5fd" },
    { label: "DOWNTIME REDUCED",       value: kpi.downtimeReduced, color: C.green, bg: "#f0fdf4", bd: "#bbf7d0" },
    { label: "OPEN CRITICAL ISSUES",   value: String(kpi.criticalIssues), color: C.red, bg: "#fef2f2", bd: "#fca5a5" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {cards.map(c => (
        <div key={c.label} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(13,24,41,0.04)" }}>
          <ULabel>{c.label}</ULabel>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({
  timeRange, setTimeRange,
  assetFilter, setAssetFilter,
  statusFilter, setStatusFilter,
}: {
  timeRange: TimeRange; setTimeRange: (v: TimeRange) => void;
  assetFilter: AssetFilter; setAssetFilter: (v: AssetFilter) => void;
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
}) {
  const chip = (label: string, active: boolean, onClick: () => void, color = C.blue) => (
    <button key={label} onClick={onClick} style={{
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: active ? 600 : 400,
      color: active ? "#fff" : C.muted,
      backgroundColor: active ? color : "#fff",
      border: `1px solid ${active ? color : C.border}`,
      borderRadius: 6, padding: "5px 12px", cursor: "pointer", transition: "all 0.12s",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "12px 18px", boxShadow: "0 1px 3px rgba(13,24,41,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ULabel>TIME RANGE</ULabel>
        <div style={{ display: "flex", gap: 4 }}>
          {(["Today","7 Days","30 Days","90 Days"] as TimeRange[]).map(t => chip(t, timeRange === t, () => setTimeRange(t)))}
        </div>
      </div>
      <div style={{ width: 1, height: 28, backgroundColor: C.border }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ULabel>ASSET TYPE</ULabel>
        <div style={{ display: "flex", gap: 4 }}>
          {(["All","Track","Signal","Traction","Engineering"] as AssetFilter[]).map(a => chip(a, assetFilter === a, () => setAssetFilter(a), C.navy))}
        </div>
      </div>
      <div style={{ width: 1, height: 28, backgroundColor: C.border }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ULabel>STATUS</ULabel>
        <div style={{ display: "flex", gap: 4 }}>
          {(["All","Healthy","Warning","Critical"] as StatusFilter[]).map(s => {
            const sc = s === "Healthy" ? C.green : s === "Warning" ? C.amber : s === "Critical" ? C.red : C.navy;
            return chip(s, statusFilter === s, () => setStatusFilter(s), sc);
          })}
        </div>
      </div>
    </div>
  );
}

// ─── AI Insights Panel ─────────────────────────────────────────────────────────

const INSIGHTS = [
  { icon: "↓", color: C.green,  text: "S12 maintenance optimization reduced predicted delay by 13 min." },
  { icon: "↓", color: C.green,  text: "Critical asset count decreased by 8% this period." },
  { icon: "◆", color: C.purple, text: "AI-recommended maintenance windows improved schedule efficiency." },
  { icon: "⚠", color: C.amber,  text: "S13 should be prioritized for the next maintenance cycle." },
];

function InsightsPanel({
  onExport,
  onViewDetails,
}: {
  onExport: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: C.purple, letterSpacing: "0.05em" }}>AI ANALYTICS INSIGHTS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {INSIGHTS.map((ins, i) => (
            <div key={i} style={{
              backgroundColor: i === 3 ? "#fffbeb" : i < 2 ? "#f0fdf4" : "#f5f3ff",
              border: `1px solid ${i === 3 ? "#fde68a" : i < 2 ? "#bbf7d0" : "#c4b5fd"}`,
              borderRadius: 8, padding: "11px 14px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: ins.color, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.55 }}>{ins.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onExport} style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
            color: "#fff", backgroundColor: C.purple, border: "none",
            borderRadius: 8, padding: "10px 0", cursor: "pointer", width: "100%",
          }}>Export Report</button>
          <button onClick={onViewDetails} style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
            color: C.blue, backgroundColor: "#eff4ff", border: "1px solid #bfcffd",
            borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
          }}>View Details</button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ borderTop: "1px solid #e8edf3", padding: "16px 20px" }}>
        <ULabel>PERIOD SUMMARY</ULabel>
        {[
          { k: "Avg. Delay Improvement", v: "−13 min", c: C.green },
          { k: "AI Windows Applied",     v: "9",       c: C.purple },
          { k: "Schedule Efficiency",    v: "+18%",    c: C.blue },
          { k: "Assets Monitored",       v: "2,807",   c: C.navy },
        ].map(row => (
          <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: C.muted }}>{row.k}</span>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: row.c }}>{row.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Export Toast ──────────────────────────────────────────────────────────────

function ExportToast({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 40, zIndex: 200,
      backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10,
      padding: "16px 20px", boxShadow: "0 8px 32px rgba(13,24,41,0.14)",
      display: "flex", alignItems: "center", gap: 14, minWidth: 320,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 2 }}>Report Exported</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: C.muted }}>RailTwin_Analytics_Report.pdf — 2.4 MB</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ ds, onClose }: { ds: DataSet; onClose: () => void }) {
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10,
      padding: "20px", boxShadow: "0 2px 8px rgba(13,24,41,0.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: C.navy }}>Detailed Analytics Breakdown</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { k: "Peak Delay Period", v: `${Math.max(...ds.delays)} min`, c: C.red },
          { k: "Min Delay Period",  v: `${Math.min(...ds.delays)} min`, c: C.green },
          { k: "Total Maintenance Jobs", v: String(ds.maintenanceDone[ds.maintenanceDone.length-1]), c: C.blue },
          { k: "Peak Conflicts",    v: String(Math.max(...ds.conflicts)), c: C.red },
          { k: "Health Improvement", v: `+${ds.assetHealth[ds.assetHealth.length-1] - ds.assetHealth[0]}%`, c: C.green },
          { k: "Work Orders Total", v: String(Object.values(ds.workOrders).reduce((a, b) => a + b, 0)), c: C.navy },
        ].map(row => (
          <div key={row.k} style={{ backgroundColor: C.bg, border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.muted, marginBottom: 4 }}>{row.k}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: row.c }}>{row.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30 Days");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showExport, setShowExport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const ds = DATASETS[timeRange];

  // Apply asset filter to work orders
  const filteredWO = assetFilter === "All"
    ? ds.workOrders
    : Object.fromEntries(Object.entries(ds.workOrders).filter(([k]) => k === assetFilter));

  // Apply status filter to risk distribution (visual hint)
  const riskMultiplier = statusFilter === "Healthy" ? { healthy: 1, medium: 0, high: 0 }
    : statusFilter === "Warning" ? { healthy: 0, medium: 1, high: 0 }
    : statusFilter === "Critical" ? { healthy: 0, medium: 0, high: 1 }
    : { healthy: 1, medium: 1, high: 1 };

  const riskSegs = [
    { label: "Healthy",     value: ds.riskDist.healthy * (riskMultiplier.healthy || 0.01 * (statusFilter === "All" ? 1 : 0)), color: C.green },
    { label: "Medium Risk", value: ds.riskDist.medium  * (riskMultiplier.medium  || 0.01 * (statusFilter === "All" ? 1 : 0)), color: C.amber },
    { label: "High Risk",   value: ds.riskDist.high    * (riskMultiplier.high    || 0.01 * (statusFilter === "All" ? 1 : 0)), color: C.red },
  ].filter(s => s.value > 0);

  const handleExport = () => { setShowExport(true); setTimeout(() => setShowExport(false), 4000); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: C.navy, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Analytics</h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: C.muted, margin: 0 }}>
              Monitor maintenance performance, asset health, delays and operational trends across the railway network.
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: C.muted, backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.green, display: "inline-block" }} />
            Live · {timeRange} view
          </div>
        </div>
        <KPICards kpi={ds.kpi} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Filter bar */}
        <FilterBar
          timeRange={timeRange} setTimeRange={setTimeRange}
          assetFilter={assetFilter} setAssetFilter={setAssetFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        />

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "start" }}>

          {/* Charts column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Row 1: Asset health + Maintenance completion */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <ChartCard
                title="Asset Health Trend"
                sub={`Network-wide average · ${timeRange}`}
                onClick={() => setShowDetail(v => !v)}
              >
                <LineChart
                  title=""
                  series={[{ values: ds.assetHealth, color: C.green, label: "Asset Health" }]}
                  labels={ds.labels}
                  yUnit="%"
                  yMin={Math.max(0, Math.min(...ds.assetHealth) - 5)}
                  yMax={Math.min(100, Math.max(...ds.assetHealth) + 3)}
                />
              </ChartCard>

              <ChartCard
                title="Maintenance Completion"
                sub={`Jobs completed vs pending · ${timeRange}`}
                onClick={() => setShowDetail(v => !v)}
              >
                <LineChart
                  title=""
                  series={[
                    { values: ds.maintenanceDone,    color: C.green, label: "Completed" },
                    { values: ds.maintenancePending, color: C.amber, label: "Pending",  dash: "5 3" },
                  ]}
                  labels={ds.labels}
                  yUnit=""
                />
              </ChartCard>
            </div>

            {/* Row 2: Delay & Conflict trend */}
            <ChartCard
              title="Delay & Conflict Trend"
              sub={`Predicted delays (min) and operational conflicts · ${timeRange}`}
              onClick={() => setShowDetail(v => !v)}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Predicted Delays (min)</div>
                  <LineChart
                    title=""
                    series={[{ values: ds.delays, color: C.red, label: "Delay" }]}
                    labels={ds.labels}
                    yUnit=" min"
                    yMin={0}
                    height={150}
                  />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Operational Conflicts</div>
                  <LineChart
                    title=""
                    series={[{ values: ds.conflicts, color: C.amber, label: "Conflicts" }]}
                    labels={ds.labels}
                    yUnit=""
                    yMin={0}
                    height={150}
                  />
                </div>
              </div>
            </ChartCard>

            {/* Row 3: Work orders + Risk distribution */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <ChartCard
                title="Work Orders by Asset Type"
                sub={`Total orders · ${timeRange}`}
                onClick={() => setShowDetail(v => !v)}
              >
                <BarChart
                  data={Object.entries(filteredWO).map(([label, value]) => ({ label, value }))}
                  colors={[C.blue, C.green, C.amber, C.muted]}
                />
              </ChartCard>

              <ChartCard
                title="Risk Distribution"
                sub={`Asset health classification · ${timeRange}`}
                onClick={() => setShowDetail(v => !v)}
              >
                {riskSegs.length > 0
                  ? <DonutChart segments={riskSegs} />
                  : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, fontFamily: "var(--font-ui)", fontSize: 13, color: "#a8b4c0" }}>No data for selected filter</div>
                }
              </ChartCard>
            </div>

            {/* Detail drawer (inline) */}
            {showDetail && (
              <DetailDrawer ds={ds} onClose={() => setShowDetail(false)} />
            )}
          </div>

          {/* Right panel */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", position: "sticky" as const, top: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3" }}>
              <ULabel>INTELLIGENCE PANEL</ULabel>
            </div>
            <InsightsPanel onExport={handleExport} onViewDetails={() => setShowDetail(v => !v)} />
          </div>
        </div>
      </div>

      {/* Export toast */}
      {showExport && <ExportToast onClose={() => setShowExport(false)} />}
    </div>
  );
}
