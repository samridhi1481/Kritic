import { useState } from "react"
import CorridorIntelligence from "./components/CorridorIntelligence"

// ─── Shared style helpers ────────────────────────────────────────────────────

const S = {
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #dde2ea",
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(13,24,41,0.06)",
  } as React.CSSProperties,
  label: {
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.09em",
    color: "#7a8898",
  } as React.CSSProperties,
  mono: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
  } as React.CSSProperties,
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

type KPIProps = {
  label: string
  value: string
  sub: string
  trend?: string
  trendUp?: boolean
  accent?: string
  accentBg?: string
}

function KPICard({
  label,
  value,
  sub,
  trend,
  trendUp,
  accent,
  accentBg,
}: KPIProps) {
  return (
    <div
      style={{
        ...S.card,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={S.label}>{label}</div>
      <div
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: accent ?? "#0d1829",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "#7a8898",
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
      {trend && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            backgroundColor: accentBg ?? (trendUp ? "#f0fdf4" : "#fef2f2"),
            border: `1px solid ${trendUp ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 4,
            padding: "2px 7px",
            alignSelf: "flex-start",
            marginTop: 2,
          }}
        >
          <span
            style={{ fontSize: 10, color: trendUp ? "#16a34a" : "#dc2626" }}
          >
            {trendUp ? "▲" : "▼"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              color: trendUp ? "#16a34a" : "#dc2626",
            }}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Network SVG ─────────────────────────────────────────────────────────────

function NetworkDiagram({ onSectionClick }: { onSectionClick: () => void }) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  // Layout constants
  const W = 680
  const H = 240

  // Station positions
  const stA = { x: 70, y: 80 }
  const stB = { x: 280, y: 80 }
  const stD = { x: 560, y: 80 }
  const stC = { x: 390, y: 190 }

  // Section midpoints for labels
  const s11mid = { x: (stA.x + stB.x) / 2, y: stA.y - 22 }
  const s12mid = { x: (stB.x + stC.x) / 2 + 10, y: (stB.y + stC.y) / 2 - 10 }
  const s13mid = { x: (stB.x + stD.x) / 2, y: stB.y - 22 }
  const s14mid = { x: stD.x + 30, y: stD.y - 20 }

  const trainY = stA.y

  const sections = [
    {
      id: "S11",
      x1: stA.x + 16,
      y1: stA.y,
      x2: stB.x - 16,
      y2: stB.y,
      risk: "low",
    },
    {
      id: "S12",
      x1: stB.x + 8,
      y1: stB.y + 12,
      x2: stC.x - 12,
      y2: stC.y - 12,
      risk: "high",
    },
    {
      id: "S13",
      x1: stB.x + 16,
      y1: stB.y,
      x2: stD.x - 16,
      y2: stD.y,
      risk: "medium",
    },
  ]

  const trains = [
    { id: "T201", x: 148, y: trainY - 2, color: "#2563eb" },
    { id: "T202", x: 390, y: trainY - 2, color: "#16a34a" },
    { id: "T203", x: 320, y: 135, color: "#d97706" },
  ]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* Grid background lines */}
      {[40, 120, 200].map((y) => (
        <line
          key={y}
          x1={20}
          y1={y}
          x2={W - 20}
          y2={y}
          stroke="#f0f2f5"
          strokeWidth={1}
        />
      ))}

      {/* Track sections */}
      {sections.map((sec) => {
        const isHigh = sec.risk === "high"
        const isMed = sec.risk === "medium"
        const isHovered = hoveredSection === sec.id
        const color = isHigh ? "#dc2626" : isMed ? "#d97706" : "#2c4a7c"
        const strokeW = isHigh ? 4 : 3
        return (
          <g key={sec.id}>
            {/* Shadow / glow for high risk */}
            {isHigh && (
              <line
                x1={sec.x1}
                y1={sec.y1}
                x2={sec.x2}
                y2={sec.y2}
                stroke="rgba(220,38,38,0.2)"
                strokeWidth={10}
                strokeLinecap="round"
              />
            )}
            <line
              x1={sec.x1}
              y1={sec.y1}
              x2={sec.x2}
              y2={sec.y2}
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={isHigh ? "8 4" : undefined}
              style={{ cursor: isHigh ? "pointer" : "default" }}
              onClick={isHigh ? onSectionClick : undefined}
              onMouseEnter={() => setHoveredSection(sec.id)}
              onMouseLeave={() => setHoveredSection(null)}
            />
            {isHovered && isHigh && (
              <line
                x1={sec.x1}
                y1={sec.y1}
                x2={sec.x2}
                y2={sec.y2}
                stroke="rgba(220,38,38,0.15)"
                strokeWidth={14}
                strokeLinecap="round"
              />
            )}
          </g>
        )
      })}

      {/* S12 Label badge */}
      <g style={{ cursor: "pointer" }} onClick={onSectionClick}>
        <rect
          x={s12mid.x - 22}
          y={s12mid.y - 11}
          width={44}
          height={20}
          rx={4}
          fill="#dc2626"
        />
        <text
          x={s12mid.x}
          y={s12mid.y + 4}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fontWeight="600"
          fill="#fff"
        >
          S12 ⚠
        </text>
      </g>

      {/* S11 label */}
      <rect
        x={s11mid.x - 16}
        y={s11mid.y - 11}
        width={32}
        height={18}
        rx={3}
        fill="#eff4ff"
      />
      <text
        x={s11mid.x}
        y={s11mid.y + 3}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        fill="#2563eb"
      >
        S11
      </text>

      {/* S13 label */}
      <rect
        x={s13mid.x - 16}
        y={s13mid.y - 11}
        width={32}
        height={18}
        rx={3}
        fill="#fffbeb"
      />
      <text
        x={s13mid.x}
        y={s13mid.y + 3}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        fill="#d97706"
      >
        S13
      </text>

      {/* Stations */}
      {[
        { ...stA, label: "Station A", status: "green" },
        { ...stB, label: "Station B", status: "amber" },
        { ...stD, label: "Station D", status: "green" },
        { ...stC, label: "Station C", status: "blue" },
      ].map((st) => {
        const c =
          st.status === "green"
            ? "#16a34a"
            : st.status === "amber"
              ? "#d97706"
              : "#2563eb"
        return (
          <g key={st.label}>
            <circle
              cx={st.x}
              cy={st.y}
              r={14}
              fill="#ffffff"
              stroke="#dde2ea"
              strokeWidth={1.5}
            />
            <circle cx={st.x} cy={st.y} r={8} fill={c} opacity={0.2} />
            <circle cx={st.x} cy={st.y} r={5} fill={c} />
            <text
              x={st.x}
              y={st.y + 28}
              textAnchor="middle"
              fontFamily="var(--font-ui)"
              fontSize={11}
              fontWeight="600"
              fill="#0d1829"
            >
              {st.label}
            </text>
          </g>
        )
      })}

      {/* Trains */}
      {trains.map((t) => (
        <g key={t.id}>
          <rect
            x={t.x - 18}
            y={t.y - 8}
            width={36}
            height={14}
            rx={3}
            fill={t.color}
            opacity={0.15}
            stroke={t.color}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={t.y + 3}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={9}
            fontWeight="600"
            fill={t.color}
          >
            {t.id}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g>
        <circle cx={W - 160} cy={H - 18} r={4} fill="#16a34a" />
        <text
          x={W - 152}
          y={H - 14}
          fontFamily="var(--font-ui)"
          fontSize={10}
          fill="#7a8898"
        >
          Normal
        </text>
        <circle cx={W - 110} cy={H - 18} r={4} fill="#d97706" />
        <text
          x={W - 102}
          y={H - 14}
          fontFamily="var(--font-ui)"
          fontSize={10}
          fill="#7a8898"
        >
          Warning
        </text>
        <circle cx={W - 55} cy={H - 18} r={4} fill="#dc2626" />
        <text
          x={W - 47}
          y={H - 14}
          fontFamily="var(--font-ui)"
          fontSize={10}
          fill="#7a8898"
        >
          Critical
        </text>
      </g>
    </svg>
  )
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const HOURS = [6, 8, 10, 12, 14, 16, 18]
const HOUR_SPAN = 12 // 06:00 to 18:00

function pct(hour: number, minuteFrac = 0) {
  return ((hour - 6 + minuteFrac / 60) / HOUR_SPAN) * 100
}

type Block = {
  label: string
  start: number // hour decimal
  end: number
  color: string
  bg: string
  border: string
  pattern?: "conflict"
}

const TIMELINE_ROWS: {
  label: string
  abbr: string
  color: string
  blocks: Block[]
}[] = [
  {
    label: "Track",
    abbr: "TRK",
    color: "#2563eb",
    blocks: [
      {
        label: "S11 Inspection",
        start: 7,
        end: 9,
        color: "#2563eb",
        bg: "#eff4ff",
        border: "#bfcffd",
      },
      {
        label: "S12 Maint. (Rec.)",
        start: 11.5,
        end: 13.5,
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#c4b5fd",
      },
      {
        label: "S13 Maint. ⚠ CONFLICT",
        start: 14,
        end: 16.5,
        color: "#dc2626",
        bg: "#fef2f2",
        border: "#fca5a5",
        pattern: "conflict",
      },
    ],
  },
  {
    label: "Signalling",
    abbr: "SIG",
    color: "#16a34a",
    blocks: [
      {
        label: "Signal Check B-D",
        start: 8.5,
        end: 11,
        color: "#16a34a",
        bg: "#f0fdf4",
        border: "#bbf7d0",
      },
      {
        label: "Panel Update",
        start: 14,
        end: 15.5,
        color: "#16a34a",
        bg: "#f0fdf4",
        border: "#bbf7d0",
      },
    ],
  },
  {
    label: "Traction",
    abbr: "TRC",
    color: "#d97706",
    blocks: [
      {
        label: "OHE Inspection",
        start: 9.5,
        end: 12,
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fde68a",
      },
    ],
  },
  {
    label: "Engineering",
    abbr: "ENG",
    color: "#7a8898",
    blocks: [
      {
        label: "Ballast Survey",
        start: 7,
        end: 9,
        color: "#7a8898",
        bg: "#f8fafc",
        border: "#dde2ea",
      },
      {
        label: "Bridge Inspection",
        start: 13,
        end: 15,
        color: "#7a8898",
        bg: "#f8fafc",
        border: "#dde2ea",
      },
    ],
  },
  {
    label: "Train Ops",
    abbr: "OPS",
    color: "#1e3a5f",
    blocks: [
      {
        label: "T201",
        start: 6.5,
        end: 8.5,
        color: "#2c4a7c",
        bg: "#f0f4ff",
        border: "#c7d7f0",
      },
      {
        label: "T202",
        start: 9.5,
        end: 12.5,
        color: "#2c4a7c",
        bg: "#f0f4ff",
        border: "#c7d7f0",
      },
      {
        label: "T203  ⚠ CONFLICT",
        start: 13.5,
        end: 17,
        color: "#dc2626",
        bg: "#fef2f2",
        border: "#fca5a5",
        pattern: "conflict",
      },
      {
        label: "T204",
        start: 15,
        end: 18,
        color: "#2c4a7c",
        bg: "#f0f4ff",
        border: "#c7d7f0",
      },
    ],
  },
]

function Timeline() {
  const rowH = 38
  const labelW = 100

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 700 }}>
        {/* Hour labels */}
        <div style={{ display: "flex", marginLeft: labelW, marginBottom: 6 }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                flex: h === 18 ? "0 0 0" : 1,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#7a8898",
                textAlign: "left",
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Rows */}
        {TIMELINE_ROWS.map((row) => (
          <div
            key={row.label}
            style={{ display: "flex", alignItems: "center", marginBottom: 6 }}
          >
            {/* Row label */}
            <div
              style={{
                width: labelW,
                flexShrink: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 500,
                color: "#0d1829",
                paddingRight: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: row.color,
                  flexShrink: 0,
                }}
              />
              {row.label}
            </div>

            {/* Track */}
            <div
              style={{
                flex: 1,
                position: "relative",
                height: rowH,
                backgroundColor: "#f8fafc",
                borderRadius: 4,
                border: "1px solid #dde2ea",
                overflow: "hidden",
              }}
            >
              {/* Hour grid lines */}
              {HOURS.slice(1, -1).map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${pct(h)}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: "#e8edf3",
                  }}
                />
              ))}

              {/* Current time line ~10:30 */}
              <div
                style={{
                  position: "absolute",
                  left: `${pct(10, 30)}%`,
                  top: 0,
                  bottom: 0,
                  width: 1.5,
                  backgroundColor: "#2563eb",
                  opacity: 0.5,
                  zIndex: 5,
                }}
              />

              {/* Blocks */}
              {row.blocks.map((block, i) => {
                const left = pct(block.start)
                const width = pct(block.end) - pct(block.start)
                const isConflict = block.pattern === "conflict"
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${width}%`,
                      top: 4,
                      bottom: 4,
                      backgroundColor: block.bg,
                      border: `1px solid ${block.border}`,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 6,
                      paddingRight: 4,
                      overflow: "hidden",
                      zIndex: isConflict ? 3 : 2,
                      cursor: "default",
                      backgroundImage: isConflict
                        ? `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 4px,
                            rgba(220,38,38,0.07) 4px,
                            rgba(220,38,38,0.07) 8px
                          )`
                        : undefined,
                    }}
                    title={block.label}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10,
                        fontWeight: 500,
                        color: block.color,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {block.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Overview ────────────────────────────────────────────────────────────

export default function Overview() {
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [conflictDismissed, setConflictDismissed] = useState(false)
  const [accepted, setAccepted] = useState(false)

  return (
    <div
      style={{
        padding: "28px 32px 40px",
        overflowY: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: 26,
                fontWeight: 700,
                color: "#0d1829",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Railway Operations Command Center
            </h1>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
                color: "#7c3aed",
                backgroundColor: "#f5f3ff",
                border: "1px solid #c4b5fd",
                borderRadius: 20,
                padding: "3px 10px",
                letterSpacing: "0.02em",
                flexShrink: 0,
              }}
            >
              ● Demo Corridor · Demo Data
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "#7a8898",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            Predictive maintenance planning · Coordinated maintenance ·
            Operational resilience
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              ...S.mono,
              color: "#7a8898",
              backgroundColor: "#f8fafc",
              border: "1px solid #dde2ea",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 11,
            }}
          >
            Last updated: 10:34:21
          </div>
          <button
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              color: "#2563eb",
              backgroundColor: "#eff4ff",
              border: "1px solid #bfcffd",
              borderRadius: 6,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 14,
        }}
      >
        <KPICard
          label="ASSET AVAILABILITY"
          value="98.2%"
          sub="2,759 / 2,807 assets"
          trend="+0.3% today"
          trendUp
        />
        <KPICard
          label="MAINTENANCE COMPLETION"
          value="84%"
          sub="19 of 23 orders complete"
          trend="+2% today"
          trendUp
        />
        <KPICard
          label="ACTIVE MAINTENANCE"
          value="7"
          sub={"3 Track · 2 Signalling\n1 Traction · 1 Engineering"}
          accent="#2563eb"
        />
        <KPICard
          label="OPERATIONAL CONFLICTS"
          value="3"
          sub="Requires attention"
          accent="#dc2626"
          accentBg="#fef2f2"
          trend="Urgent"
          trendUp={false}
        />
        <KPICard
          label="PREDICTED DELAY"
          value="21 min"
          sub="Across affected trains"
          accent="#d97706"
          accentBg="#fffbeb"
          trend="▲ 4 min vs. yesterday"
          trendUp={false}
        />
        <KPICard
          label="HIGH-RISK ASSETS"
          value="12"
          sub="4 critical"
          accent="#dc2626"
          accentBg="#fef2f2"
          trend="4 critical"
          trendUp={false}
        />
      </div>

      {/* ── External Corridor Intelligence ── */}
      <CorridorIntelligence />

      {/* ── Middle Row: Network + Insights ── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}
      >
        {/* Network Status */}
        <div
          style={{
            ...S.card,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ ...S.label, marginBottom: 4 }}>NETWORK STATUS</div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0d1829",
                }}
              >
                Demo Corridor — Live View
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <StatusPill
                color="#16a34a"
                bg="#f0fdf4"
                border="#bbf7d0"
                label="S11 Normal"
              />
              <StatusPill
                color="#d97706"
                bg="#fffbeb"
                border="#fde68a"
                label="S13 Warning"
              />
              <StatusPill
                color="#dc2626"
                bg="#fef2f2"
                border="#fca5a5"
                label="S12 Critical"
              />
            </div>
          </div>

          {/* Network diagram */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e8edf3",
              padding: "12px 8px",
            }}
          >
            <NetworkDiagram
              onSectionClick={() => setSectionExpanded((v) => !v)}
            />
          </div>

          {/* Section detail */}
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Condition ring */}
            <div
              style={{
                position: "relative",
                width: 56,
                height: 56,
                flexShrink: 0,
              }}
            >
              <svg width={56} height={56} viewBox="0 0 56 56">
                <circle
                  cx={28}
                  cy={28}
                  r={22}
                  fill="none"
                  stroke="#fecaca"
                  strokeWidth={5}
                />
                <circle
                  cx={28}
                  cy={28}
                  r={22}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={5}
                  strokeDasharray={`${2 * Math.PI * 22 * 0.63} ${2 * Math.PI * 22 * 0.37}`}
                  strokeDashoffset={2 * Math.PI * 22 * 0.25}
                  strokeLinecap="round"
                />
                <text
                  x={28}
                  y={33}
                  textAnchor="middle"
                  fontFamily="var(--font-brand)"
                  fontSize={13}
                  fontWeight="700"
                  fill="#dc2626"
                >
                  63%
                </text>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0d1829",
                  marginBottom: 6,
                }}
              >
                Section S12
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#dc2626",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: 4,
                    padding: "1px 7px",
                  }}
                >
                  HIGH RISK
                </span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { k: "Condition", v: "63%", c: "#dc2626" },
                  { k: "Traffic", v: "HIGH", c: "#d97706" },
                  { k: "Risk", v: "HIGH", c: "#dc2626" },
                  { k: "Active Trains", v: "4", c: "#0d1829" },
                  { k: "Maint. Pending", v: "3", c: "#0d1829" },
                ].map((item) => (
                  <div key={item.k}>
                    <div style={{ ...S.label, marginBottom: 2 }}>{item.k}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-brand)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: item.c,
                      }}
                    >
                      {item.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 500,
                color: "#dc2626",
                backgroundColor: "#ffffff",
                border: "1px solid #fca5a5",
                borderRadius: 7,
                padding: "8px 18px",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              View Section →
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <div
          style={{
            ...S.card,
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderTop: "3px solid #7c3aed",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "#f5f3ff",
                border: "1px solid #c4b5fd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ◆
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#7c3aed",
                  letterSpacing: "0.05em",
                }}
              >
                RAILTWIN AI INSIGHTS
              </div>
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #ede9fe",
              margin: "0",
            }}
          />

          {/* Priority alert */}
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 7,
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                color: "#dc2626",
                letterSpacing: "0.09em",
                marginBottom: 4,
              }}
            >
              ▲ HIGH PRIORITY
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "#0d1829",
                lineHeight: 1.5,
              }}
            >
              Asset A102 requires maintenance within the recommended planning
              horizon.
            </div>
          </div>

          {/* Recommended window */}
          <div>
            <div style={{ ...S.label, marginBottom: 8 }}>
              RECOMMENDED WINDOW
            </div>
            <div
              style={{
                backgroundColor: "#f5f3ff",
                border: "1px solid #c4b5fd",
                borderRadius: 7,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0d1829",
                  marginBottom: 2,
                }}
              >
                Section S12
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#7c3aed",
                  marginBottom: 4,
                }}
              >
                11:30–13:30
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "#7a8898",
                }}
              >
                2-hour window · low disruption
              </div>
            </div>
          </div>

          {/* Why this window */}
          <div>
            <div style={{ ...S.label, marginBottom: 8 }}>WHY THIS WINDOW?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                "Low train density",
                "High asset priority",
                "Track + Signalling compatible",
                "Crew available",
                "Deadline satisfied",
              ].map((reason) => (
                <div
                  key={reason}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: "#ede9fe",
                      border: "1px solid #c4b5fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l2 2 3-3"
                        stroke="#7c3aed"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "#374151",
                    }}
                  >
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunity score */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #dde2ea",
              borderRadius: 7,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ ...S.label }}>OPPORTUNITY SCORE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#16a34a",
                }}
              >
                94.7
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "#7a8898",
                }}
              >
                / 100
              </span>
            </div>
          </div>

          {/* Score bar */}
          <div
            style={{
              height: 5,
              backgroundColor: "#e8edf3",
              borderRadius: 3,
              overflow: "hidden",
              marginTop: -8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: "94.7%",
                backgroundColor: "#16a34a",
                borderRadius: 3,
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              onClick={() => setAccepted(true)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 600,
                color: accepted ? "#16a34a" : "#ffffff",
                backgroundColor: accepted ? "#f0fdf4" : "#7c3aed",
                border: accepted ? "1px solid #bbf7d0" : "1px solid #7c3aed",
                borderRadius: 8,
                padding: "10px 0",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {accepted ? "✓ Recommendation Accepted" : "Accept Recommendation"}
            </button>
            <button
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 500,
                color: "#7c3aed",
                backgroundColor: "#ffffff",
                border: "1px solid #c4b5fd",
                borderRadius: 8,
                padding: "9px 0",
                cursor: "pointer",
              }}
            >
              View Alternatives
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Operations Timeline ── */}
      <div style={{ ...S.card, padding: "20px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ ...S.label, marginBottom: 4 }}>ACTIVE OPERATIONS</div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 15,
                fontWeight: 600,
                color: "#0d1829",
              }}
            >
              Today's Maintenance &amp; Train Schedule
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 3,
                  backgroundColor: "#2563eb",
                  borderRadius: 2,
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "#7a8898",
                }}
              >
                Current time
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 12,
                  borderRadius: 2,
                  background:
                    "repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(220,38,38,0.15) 2px, rgba(220,38,38,0.15) 4px)",
                  border: "1px solid #fca5a5",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "#7a8898",
                }}
              >
                Conflict
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: "#f5f3ff",
                  border: "1px solid #c4b5fd",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "#7a8898",
                }}
              >
                AI Recommended
              </span>
            </div>
          </div>
        </div>
        <Timeline />
      </div>

      {/* ── Conflict Alert ── */}
      {!conflictDismissed && (
        <div
          style={{
            ...S.card,
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 16,
              color: "#fff",
            }}
          >
            ⚠
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 700,
                color: "#dc2626",
                letterSpacing: "0.09em",
                marginBottom: 3,
              }}
            >
              CONFLICT DETECTED
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "#0d1829",
              }}
            >
              Track maintenance on S13 (14:00–16:30) overlaps with Train T203
              movement (13:30–17:00). Estimated delay impact: 18 minutes.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: "#dc2626",
                border: "none",
                borderRadius: 7,
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Resolve
            </button>
            <button
              onClick={() => setConflictDismissed(true)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 500,
                color: "#dc2626",
                backgroundColor: "#ffffff",
                border: "1px solid #fca5a5",
                borderRadius: 7,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({
  color,
  bg,
  border,
  label,
}: {
  color: string
  bg: string
  border: string
  label: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 5,
        padding: "3px 9px",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  )
}
