import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType = "station" | "section" | "train" | "maintenance";

interface Station {
  id: string;
  label: string;
  x: number;
  y: number;
  status: "normal" | "warning" | "critical";
  platforms: number;
  activeTrains: number;
}

interface Section {
  id: string;
  label: string;
  from: string;
  to: string;
  status: "normal" | "warning" | "critical";
  condition: number;
  risk: "low" | "medium" | "high";
  activeTrains: number;
  maintenancePending: number;
  recommendedWindow?: string;
  predictedDelay?: number;
  length: string;
}

interface Train {
  id: string;
  route: string[];
  speed: number;
  status: "on-time" | "delayed" | "maintenance";
  type: string;
  operator: string;
}

interface MaintenanceWork {
  id: string;
  sectionId: string;
  type: string;
  crew: number;
  startTime: string;
  endTime: string;
  progress: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATIONS: Station[] = [
  { id: "STA", label: "Station A", x: 100, y: 200, status: "normal", platforms: 4, activeTrains: 2 },
  { id: "STB", label: "Station B", x: 340, y: 200, status: "warning", platforms: 6, activeTrains: 4 },
  { id: "STC", label: "Station C", x: 340, y: 360, status: "normal", platforms: 2, activeTrains: 1 },
  { id: "STD", label: "Station D", x: 600, y: 200, status: "normal", platforms: 3, activeTrains: 2 },
];

const SECTIONS: Section[] = [
  {
    id: "S11",
    label: "Section S11",
    from: "STA",
    to: "STB",
    status: "normal",
    condition: 91,
    risk: "low",
    activeTrains: 2,
    maintenancePending: 0,
    length: "12.4 km",
  },
  {
    id: "S12",
    label: "Section S12",
    from: "STB",
    to: "STC",
    status: "critical",
    condition: 63,
    risk: "high",
    activeTrains: 4,
    maintenancePending: 3,
    recommendedWindow: "11:30–13:30",
    predictedDelay: 21,
    length: "8.1 km",
  },
  {
    id: "S13",
    label: "Section S13",
    from: "STB",
    to: "STD",
    status: "warning",
    condition: 77,
    risk: "medium",
    activeTrains: 2,
    maintenancePending: 1,
    length: "15.7 km",
  },
];

const TRAINS: Train[] = [
  { id: "T201", route: ["STA", "STB", "STD"], speed: 120, status: "on-time", type: "Passenger Express", operator: "NR" },
  { id: "T202", route: ["STB", "STC"], speed: 80, status: "delayed", type: "Regional", operator: "NR" },
];

const MAINTENANCE: MaintenanceWork[] = [
  { id: "MW01", sectionId: "S12", type: "Track Geometry Repair", crew: 8, startTime: "09:00", endTime: "13:30", progress: 42 },
];

// ─── Color helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  normal: "#16a34a",
  warning: "#d97706",
  critical: "#dc2626",
  "on-time": "#16a34a",
  delayed: "#d97706",
  maintenance: "#7a8898",
};

const STATUS_BG: Record<string, string> = {
  normal: "#f0fdf4",
  warning: "#fffbeb",
  critical: "#fef2f2",
  low: "#f0fdf4",
  medium: "#fffbeb",
  high: "#fef2f2",
};

const STATUS_BORDER: Record<string, string> = {
  normal: "#bbf7d0",
  warning: "#fde68a",
  critical: "#fca5a5",
  low: "#bbf7d0",
  medium: "#fde68a",
  high: "#fca5a5",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f2f5" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600, color: color ?? "#0d1829" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const c = STATUS_COLOR[status] ?? "#7a8898";
  const bg = STATUS_BG[status] ?? "#f8fafc";
  const bd = STATUS_BORDER[status] ?? "#dde2ea";
  return (
    <span style={{
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
      color: c, backgroundColor: bg, border: `1px solid ${bd}`,
      borderRadius: 4, padding: "2px 8px", letterSpacing: "0.02em",
      textTransform: "capitalize" as const,
    }}>
      {label ?? status}
    </span>
  );
}

function ConditionBar({ value, color }: { value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Condition</span>
        <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        backgroundColor: "rgba(13,24,41,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 20px 60px rgba(13,24,41,0.2)",
          border: "1px solid #dde2ea", width: 520, maxHeight: "80vh", overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #dde2ea",
        }}>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 18,
              color: "#7a8898", lineHeight: 1, padding: "2px 6px", borderRadius: 4,
            }}
          >×</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

function DetailModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const cond = section.condition;
  const color = section.status === "critical" ? "#dc2626" : section.status === "warning" ? "#d97706" : "#16a34a";
  return (
    <Modal title={`${section.label} — Full Details`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <StatusBadge status={section.status} label={section.status.charAt(0).toUpperCase() + section.status.slice(1)} />
          <StatusBadge status={section.risk} label={`${section.risk.charAt(0).toUpperCase() + section.risk.slice(1)} risk`} />
        </div>
        <ConditionBar value={cond} color={color} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            ["Section ID", section.id],
            ["From → To", `${section.from} → ${section.to}`],
            ["Length", section.length],
            ["Active Trains", section.activeTrains],
            ["Maintenance Pending", section.maintenancePending],
            ["Risk Level", section.risk.toUpperCase()],
            ...(section.recommendedWindow ? [["Rec. Window", section.recommendedWindow]] : []),
            ...(section.predictedDelay != null ? [["Predicted Delay", `${section.predictedDelay} min`]] : []),
          ].map(([k, v]) => (
            <div key={k as string} style={{ backgroundColor: "#f8fafc", borderRadius: 7, padding: "10px 14px", border: "1px solid #dde2ea" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7a8898", marginBottom: 4 }}>{k as string}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 600, color: "#0d1829" }}>{v as string}</div>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "14px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.08em", marginBottom: 6 }}>INSPECTION NOTES</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
            Track geometry deviation detected at chainage 4.2–5.8 km. Rail wear exceeds threshold on outer rail. Ballast settlement observed. Immediate remediation recommended.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const [selectedWindow, setSelectedWindow] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const windows = [
    { label: "11:30 – 13:30", score: 94.7, impact: "Low", trains: 1 },
    { label: "14:00 – 16:00", score: 71.2, impact: "Medium", trains: 3 },
    { label: "22:00 – 02:00", score: 88.4, impact: "Minimal", trains: 0 },
  ];
  if (submitted) return (
    <Modal title="Maintenance Scheduled" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>
          Maintenance Scheduled
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>
          {section.label} maintenance scheduled for {windows[selectedWindow].label}. Crew notified.
        </div>
      </div>
    </Modal>
  );
  return (
    <Modal title={`Schedule Maintenance — ${section.label}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>
          Select a maintenance window. Windows are ranked by opportunity score.
        </div>
        {windows.map((w, i) => (
          <div
            key={i}
            onClick={() => setSelectedWindow(i)}
            style={{
              border: `1.5px solid ${selectedWindow === i ? "#7c3aed" : "#dde2ea"}`,
              backgroundColor: selectedWindow === i ? "#f5f3ff" : "#ffffff",
              borderRadius: 8, padding: "14px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "all 0.15s",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: selectedWindow === i ? "#7c3aed" : "#0d1829" }}>{w.label}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 3 }}>
                Impact: {w.impact} · {w.trains} train{w.trains !== 1 ? "s" : ""} affected
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#7a8898", letterSpacing: "0.08em" }}>SCORE</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: w.score > 90 ? "#16a34a" : w.score > 80 ? "#d97706" : "#7a8898" }}>{w.score}</div>
            </div>
          </div>
        ))}
        <button
          onClick={() => setSubmitted(true)}
          style={{
            fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
            color: "#ffffff", backgroundColor: "#7c3aed", border: "none",
            borderRadius: 8, padding: "12px 0", cursor: "pointer", marginTop: 4,
          }}
        >
          Confirm Schedule
        </button>
      </div>
    </Modal>
  );
}

function SimulateModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const runSim = () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); setRunning(false); setDone(true); return 100; }
        return p + 8;
      });
    }, 120);
  };

  return (
    <Modal title={`Simulate Impact — ${section.label}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!done ? (
          <>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", lineHeight: 1.6 }}>
              Run a simulation to predict the operational impact of maintenance on {section.label} during the recommended window (11:30–13:30).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["Affected Trains", "4"], ["Est. Delay", "21 min"], ["Sections", "2"]].map(([k, v]) => (
                <div key={k} style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: "#0d1829" }}>{v}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 3 }}>{k}</div>
                </div>
              ))}
            </div>
            {running && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Simulation running…</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#2563eb" }}>{progress}%</span>
                </div>
                <div style={{ height: 6, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#2563eb", borderRadius: 3, transition: "width 0.1s" }} />
                </div>
              </div>
            )}
            <button
              onClick={runSim}
              disabled={running}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
                color: "#ffffff", backgroundColor: running ? "#7a8898" : "#2563eb",
                border: "none", borderRadius: 8, padding: "12px 0", cursor: running ? "not-allowed" : "pointer",
              }}
            >
              {running ? "Simulating…" : "Run Simulation"}
            </button>
          </>
        ) : (
          <>
            <div style={{ backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#2563eb", letterSpacing: "0.08em", marginBottom: 6 }}>SIMULATION COMPLETE</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829", lineHeight: 1.6 }}>
                Maintenance during 11:30–13:30 is predicted to cause a 21-minute delay for T202 and minor schedule adjustment for T201. No critical conflicts detected.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { train: "T201", impact: "Minor", delay: "+4 min", color: "#d97706" },
                { train: "T202", impact: "Moderate", delay: "+21 min", color: "#dc2626" },
                { train: "T203", impact: "None", delay: "0 min", color: "#16a34a" },
              ].map((row) => (
                <div key={row.train} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: 7, border: "1px solid #dde2ea" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#0d1829" }}>{row.train}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.impact}</span>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: row.color }}>{row.delay}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#ffffff", backgroundColor: "#16a34a", border: "none", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>
                Accept &amp; Schedule
              </button>
              <button onClick={() => { setDone(false); setProgress(0); }} style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>
                Re-run
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Network Canvas ────────────────────────────────────────────────────────────

const SVG_W = 760;
const SVG_H = 440;

// Track path definitions: arrays of [x, y] points
const TRACK_PATHS: Record<string, [number, number][]> = {
  S11: [[100, 200], [340, 200]],
  S12: [[340, 200], [340, 360]],
  S13: [[340, 200], [600, 200]],
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function pointOnPath(path: [number, number][], t: number): [number, number] {
  if (path.length < 2) return path[0];
  const seg = Math.min(Math.floor(t * (path.length - 1)), path.length - 2);
  const segT = t * (path.length - 1) - seg;
  return [lerp(path[seg][0], path[seg + 1][0], segT), lerp(path[seg][1], path[seg + 1][1], segT)];
}

interface TrainState { id: string; t: number; sectionId: string; forward: boolean; color: string; status: "on-time" | "delayed" | "maintenance"; }

function NetworkCanvas({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string, type: AssetType) => void;
}) {
  const [trains, setTrains] = useState<TrainState[]>([
    { id: "T201", t: 0.15, sectionId: "S11", forward: true, color: "#2563eb", status: "on-time" },
    { id: "T202", t: 0.6, sectionId: "S12", forward: true, color: "#d97706", status: "delayed" },
  ]);

  const animRef = useRef<number | null>(null);
  const trainsRef = useRef(trains);
  trainsRef.current = trains;

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTrains((prev) =>
        prev.map((tr) => {
          const speed = tr.status === "delayed" ? 0.025 : 0.04;
          let newT = tr.forward ? tr.t + dt * speed : tr.t - dt * speed;
          let forward = tr.forward;
          if (newT >= 1) { newT = 1; forward = false; }
          if (newT <= 0) { newT = 0; forward = true; }
          return { ...tr, t: newT, forward };
        })
      );
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const trackStroke = (sec: Section) => {
    if (sec.status === "critical") return "#dc2626";
    if (sec.status === "warning") return "#d97706";
    return "#16a34a";
  };

  const isSelected = (id: string) => selectedId === id;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: "block", cursor: "default" }}
    >
      {/* Background grid */}
      {Array.from({ length: 9 }, (_, i) => (i + 1) * 80).map((x) => (
        <line key={`vg${x}`} x1={x} y1={20} x2={x} y2={SVG_H - 20} stroke="#f0f2f5" strokeWidth={1} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (i + 1) * 80).map((y) => (
        <line key={`hg${y}`} x1={20} y1={y} x2={SVG_W - 20} y2={y} stroke="#f0f2f5" strokeWidth={1} />
      ))}

      {/* Track sections */}
      {SECTIONS.map((sec) => {
        const path = TRACK_PATHS[sec.id];
        if (!path || path.length < 2) return null;
        const [x1, y1] = path[0];
        const [x2, y2] = path[path.length - 1];
        const sel = isSelected(sec.id);
        const color = trackStroke(sec);

        return (
          <g key={sec.id} style={{ cursor: "pointer" }} onClick={() => onSelect(sec.id, "section")}>
            {/* Hit area */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={20} />
            {/* Glow on critical */}
            {sec.status === "critical" && (
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(220,38,38,0.15)" strokeWidth={14} strokeLinecap="round" />
            )}
            {/* Selection highlight */}
            {sel && (
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={14} strokeLinecap="round" opacity={0.18} />
            )}
            {/* Main track */}
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={sel ? 6 : 4}
              strokeLinecap="round"
              strokeDasharray={sec.status === "critical" ? "10 5" : undefined}
            />
            {/* Section label badge */}
            <SectionBadge sec={sec} path={path} selected={sel} color={color} />
          </g>
        );
      })}

      {/* Maintenance work icon on S12 */}
      {MAINTENANCE.map((mw) => {
        const path = TRACK_PATHS[mw.sectionId];
        if (!path) return null;
        const [mx, my] = pointOnPath(path, 0.45);
        const isSel = isSelected(mw.id);
        return (
          <g
            key={mw.id}
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); onSelect(mw.id, "maintenance"); }}
          >
            <rect x={mx - 22} y={my - 16} width={44} height={28} rx={6}
              fill="#fffbeb" stroke={isSel ? "#d97706" : "#fde68a"} strokeWidth={isSel ? 2 : 1} />
            <text x={mx} y={my - 2} textAnchor="middle" fontSize={11} fontFamily="var(--font-ui)" fill="#d97706">🔧</text>
            <text x={mx} y={my + 9} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fontWeight="600" fill="#d97706">MW01</text>
          </g>
        );
      })}

      {/* Stations */}
      {STATIONS.map((st) => {
        const sel = isSelected(st.id);
        const color = STATUS_COLOR[st.status];
        return (
          <g key={st.id} style={{ cursor: "pointer" }} onClick={() => onSelect(st.id, "station")}>
            {sel && <circle cx={st.x} cy={st.y} r={28} fill={color} opacity={0.12} />}
            <circle cx={st.x} cy={st.y} r={20} fill="#ffffff" stroke={sel ? color : "#dde2ea"} strokeWidth={sel ? 2.5 : 1.5} />
            <circle cx={st.x} cy={st.y} r={10} fill={color} opacity={0.2} />
            <circle cx={st.x} cy={st.y} r={6} fill={color} />
            <text x={st.x} y={st.y + 34}
              textAnchor="middle" fontFamily="var(--font-brand)" fontSize={12} fontWeight="700" fill="#0d1829">
              {st.label}
            </text>
            <text x={st.x} y={st.y + 47}
              textAnchor="middle" fontFamily="var(--font-ui)" fontSize={10} fill="#7a8898">
              {st.platforms} platforms
            </text>
          </g>
        );
      })}

      {/* Animated trains */}
      {trains.map((tr) => {
        const path = TRACK_PATHS[tr.sectionId];
        if (!path) return null;
        const [tx, ty] = pointOnPath(path, tr.t);
        const sel = isSelected(tr.id);
        const color = tr.color;
        return (
          <g key={tr.id} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSelect(tr.id, "train"); }}>
            {sel && <rect x={tx - 22} y={ty - 14} width={44} height={22} rx={5} fill={color} opacity={0.15} />}
            <rect x={tx - 18} y={ty - 10} width={36} height={18} rx={4}
              fill={sel ? color : "#ffffff"} stroke={color} strokeWidth={1.5} />
            <text x={tx} y={ty + 5} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={9} fontWeight="700"
              fill={sel ? "#ffffff" : color}>
              {tr.id}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g>
        {[
          { color: "#16a34a", label: "Normal" },
          { color: "#d97706", label: "Warning" },
          { color: "#dc2626", label: "Critical" },
          { color: "#2563eb", label: "Train" },
        ].map((item, i) => (
          <g key={item.label} transform={`translate(${30 + i * 100}, ${SVG_H - 20})`}>
            <circle r={5} cy={0} fill={item.color} />
            <text x={12} y={4} fontFamily="var(--font-ui)" fontSize={11} fill="#7a8898">{item.label}</text>
          </g>
        ))}
        <text x={SVG_W - 20} y={SVG_H - 12} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="#a8b4c0">
          Click any element to inspect
        </text>
      </g>
    </svg>
  );
}

function SectionBadge({ sec, path, selected, color }: { sec: Section; path: [number, number][]; selected: boolean; color: string }) {
  const [mx, my] = pointOnPath(path, 0.5);
  const isVert = path[0][0] === path[path.length - 1][0];
  const bx = isVert ? mx + 28 : mx;
  const by = isVert ? my : my - 22;
  return (
    <g>
      <rect x={bx - 18} y={by - 12} width={36} height={18} rx={4}
        fill={selected ? color : "#ffffff"}
        stroke={color}
        strokeWidth={selected ? 0 : 1.5} />
      <text x={bx} y={by + 3} textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize={10} fontWeight="700"
        fill={selected ? "#ffffff" : color}>
        {sec.id}
      </text>
    </g>
  );
}

// ─── Selected Asset Panel ──────────────────────────────────────────────────────

function AssetPanel({
  selectedId,
  selectedType,
  onViewDetails,
  onSchedule,
  onSimulate,
}: {
  selectedId: string | null;
  selectedType: AssetType | null;
  onViewDetails: () => void;
  onSchedule: () => void;
  onSimulate: () => void;
}) {
  if (!selectedId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: "0 24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⬡</div>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 600, color: "#0d1829" }}>No Asset Selected</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", lineHeight: 1.6 }}>
          Click a station, track section, train or maintenance work on the network to inspect it here.
        </div>
      </div>
    );
  }

  if (selectedType === "station") {
    const st = STATIONS.find((s) => s.id === selectedId);
    if (!st) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 4 }}>SELECTED ASSET · STATION</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#0d1829" }}>{st.label}</div>
        </div>
        <StatusBadge status={st.status} label={st.status.charAt(0).toUpperCase() + st.status.slice(1)} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <StatRow label="Station ID" value={st.id} />
          <StatRow label="Platforms" value={st.platforms} />
          <StatRow label="Active Trains" value={st.activeTrains} color="#2563eb" />
          <StatRow label="Status" value={st.status.charAt(0).toUpperCase() + st.status.slice(1)} color={STATUS_COLOR[st.status]} />
        </div>
        <button onClick={onViewDetails} style={btnStyle("primary")}>View Details</button>
      </div>
    );
  }

  if (selectedType === "train") {
    const tr = TRAINS.find((t) => t.id === selectedId);
    if (!tr) return null;
    const color = tr.status === "on-time" ? "#16a34a" : "#d97706";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 4 }}>SELECTED ASSET · TRAIN</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#0d1829" }}>{tr.id}</div>
        </div>
        <StatusBadge status={tr.status} label={tr.status === "on-time" ? "On Time" : "Delayed"} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <StatRow label="Train ID" value={tr.id} />
          <StatRow label="Type" value={tr.type} />
          <StatRow label="Operator" value={tr.operator} />
          <StatRow label="Speed" value={`${tr.speed} km/h`} />
          <StatRow label="Route" value={tr.route.join(" → ")} />
          <StatRow label="Status" value={tr.status === "on-time" ? "On Time" : "Delayed"} color={color} />
        </div>
        <button onClick={onSimulate} style={btnStyle("primary")}>Simulate Impact</button>
      </div>
    );
  }

  if (selectedType === "maintenance") {
    const mw = MAINTENANCE.find((m) => m.id === selectedId);
    if (!mw) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 4 }}>SELECTED ASSET · MAINTENANCE</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#0d1829" }}>{mw.id}</div>
        </div>
        <StatusBadge status="warning" label="In Progress" />
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 6 }}>Progress</div>
          <div style={{ height: 6, backgroundColor: "#e8edf3", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${mw.progress}%`, backgroundColor: "#d97706", borderRadius: 3 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#d97706", marginTop: 4 }}>{mw.progress}% complete</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <StatRow label="Work Order" value={mw.id} />
          <StatRow label="Section" value={mw.sectionId} />
          <StatRow label="Type" value={mw.type} />
          <StatRow label="Crew" value={`${mw.crew} workers`} />
          <StatRow label="Window" value={`${mw.startTime} – ${mw.endTime}`} />
        </div>
        <button onClick={onSimulate} style={btnStyle("primary")}>Simulate Impact</button>
      </div>
    );
  }

  // Section
  const sec = SECTIONS.find((s) => s.id === selectedId);
  if (!sec) return null;
  const condColor = sec.status === "critical" ? "#dc2626" : sec.status === "warning" ? "#d97706" : "#16a34a";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 4 }}>SELECTED ASSET · TRACK SECTION</div>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "#0d1829" }}>{sec.label}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        <StatusBadge status={sec.status} label={`Status: ${sec.status.charAt(0).toUpperCase() + sec.status.slice(1)}`} />
        <StatusBadge status={sec.risk} label={`Risk: ${sec.risk.charAt(0).toUpperCase() + sec.risk.slice(1)}`} />
      </div>

      <ConditionBar value={sec.condition} color={condColor} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <StatRow label="Active Trains" value={sec.activeTrains} color="#2563eb" />
        <StatRow label="Maintenance Pending" value={sec.maintenancePending} color={sec.maintenancePending > 0 ? "#d97706" : "#0d1829"} />
        {sec.recommendedWindow && (
          <StatRow label="Rec. Window" value={sec.recommendedWindow} color="#7c3aed" />
        )}
        {sec.predictedDelay != null && (
          <StatRow label="Predicted Delay" value={`${sec.predictedDelay} min`} color="#dc2626" />
        )}
        <StatRow label="Length" value={sec.length} />
      </div>

      {sec.status === "critical" && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, padding: "10px 14px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.08em", marginBottom: 3 }}>CRITICAL CONDITION</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            Asset requires maintenance within the recommended planning horizon. Track geometry deviation detected.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onViewDetails} style={btnStyle("primary")}>View Details</button>
        <button onClick={onSchedule} style={btnStyle("secondary")}>Schedule Maintenance</button>
        <button onClick={onSimulate} style={btnStyle("ghost")}>Simulate Impact</button>
      </div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary" | "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
    borderRadius: 8, padding: "10px 0", cursor: "pointer", border: "none",
    width: "100%",
  };
  if (variant === "primary") return { ...base, color: "#ffffff", backgroundColor: "#0d1829" };
  if (variant === "secondary") return { ...base, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd" };
  return { ...base, color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd" };
}

// ─── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ filter, setFilter }: { filter: string; setFilter: (f: string) => void }) {
  const filters = ["All", "Normal", "Warning", "Critical", "Trains", "Maintenance"];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {filters.map((f) => {
        const active = filter === f;
        return (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? "#0d1829" : "#7a8898",
              backgroundColor: active ? "#ffffff" : "transparent",
              border: active ? "1px solid #dde2ea" : "1px solid transparent",
              borderRadius: 6, padding: "5px 12px", cursor: "pointer",
              boxShadow: active ? "0 1px 2px rgba(13,24,41,0.06)" : "none",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NetworkTwin() {
  const [selectedId, setSelectedId] = useState<string | null>("S12");
  const [selectedType, setSelectedType] = useState<AssetType | null>("section");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState<"detail" | "schedule" | "simulate" | null>(null);

  const handleSelect = useCallback((id: string, type: AssetType) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setSelectedType((prev) => (prev !== null && selectedId === id ? null : type));
  }, [selectedId]);

  const selectedSection = SECTIONS.find((s) => s.id === selectedId) ?? SECTIONS[1];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Page header */}
      <div style={{ padding: "22px 28px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700,
              color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em",
            }}>
              Network Twin
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Live digital representation of railway infrastructure, assets, tracks and operational status.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block", boxShadow: "0 0 0 2px rgba(22,163,74,0.2)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898" }}>Live · Updating</span>
            </div>
            <FilterBar filter={filter} setFilter={setFilter} />
          </div>
        </div>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", gap: 0, overflow: "hidden", padding: "0 28px 24px" }}>
        {/* Network canvas */}
        <div style={{
          backgroundColor: "#ffffff", border: "1px solid #dde2ea", borderRadius: "10px 0 0 10px",
          borderRight: "none", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Canvas toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderBottom: "1px solid #e8edf3",
          }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "3 Sections", color: "#7a8898" },
                { label: "4 Stations", color: "#7a8898" },
                { label: "2 Active Trains", color: "#2563eb" },
                { label: "1 Maintenance Work", color: "#d97706" },
              ].map((item) => (
                <span key={item.label} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: item.color, fontWeight: 500 }}>
                  {item.label}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["⊕", "⊖", "⤢"].map((icon) => (
                <button
                  key={icon}
                  style={{
                    background: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6,
                    width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#7a8898",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* SVG canvas */}
          <div style={{ flex: 1, overflow: "hidden", padding: "16px" }}>
            <NetworkCanvas selectedId={selectedId} onSelect={handleSelect} />
          </div>

          {/* Status strip */}
          <div style={{ borderTop: "1px solid #e8edf3", padding: "10px 18px", display: "flex", gap: 20 }}>
            {[
              { id: "S11", label: "S11", status: "normal", condition: 91 },
              { id: "S12", label: "S12", status: "critical", condition: 63 },
              { id: "S13", label: "S13", status: "warning", condition: 77 },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleSelect(sec.id, "section")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: selectedId === sec.id ? STATUS_BG[sec.status] : "transparent",
                  border: `1px solid ${selectedId === sec.id ? STATUS_BORDER[sec.status] : "transparent"}`,
                  borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STATUS_COLOR[sec.status], flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: STATUS_COLOR[sec.status] }}>{sec.label}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{sec.condition}%</span>
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a8b4c0" }}>Demo Corridor · 36.2 km total</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          backgroundColor: "#ffffff", border: "1px solid #dde2ea", borderRadius: "0 10px 10px 0",
          borderLeft: "1px solid #e8edf3", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898" }}>SELECTED ASSET</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <AssetPanel
              selectedId={selectedId}
              selectedType={selectedType}
              onViewDetails={() => setModal("detail")}
              onSchedule={() => setModal("schedule")}
              onSimulate={() => setModal("simulate")}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "detail" && (
        <DetailModal section={selectedSection} onClose={() => setModal(null)} />
      )}
      {modal === "schedule" && (
        <ScheduleModal section={selectedSection} onClose={() => setModal(null)} />
      )}
      {modal === "simulate" && (
        <SimulateModal section={selectedSection} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
