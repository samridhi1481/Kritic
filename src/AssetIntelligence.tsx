import { useState, useCallback } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

type RiskLevel = "Healthy" | "Warning" | "High Risk" | "Critical";
type Priority  = "Low" | "Medium" | "High" | "Critical";

interface Asset {
  id: string;
  type: string;
  section: string;
  condition: number;
  risk: number;
  safetyCriticality: number;
  operationalCriticality: number;
  priority: Priority;
  status: RiskLevel;
  lastMaintenance: string;
  failureHistory: number;
  maintenanceDeadline: number; // days
  notes: string;
}

const ASSETS: Asset[] = [
  { id: "A102", type: "Track",     section: "S12", condition: 63, risk: 87, safetyCriticality: 92, operationalCriticality: 81, priority: "High",     status: "Critical",  lastMaintenance: "18 days ago", failureHistory: 2, maintenanceDeadline: 5,  notes: "Geometry deformation detected on northern approach." },
  { id: "A103", type: "Signal",    section: "S13", condition: 78, risk: 64, safetyCriticality: 75, operationalCriticality: 69, priority: "Medium",   status: "Warning",   lastMaintenance: "9 days ago",  failureHistory: 1, maintenanceDeadline: 14, notes: "Relay contact wear. Signal timing within spec." },
  { id: "A104", type: "Traction",  section: "S11", condition: 91, risk: 32, safetyCriticality: 58, operationalCriticality: 61, priority: "Low",      status: "Healthy",   lastMaintenance: "3 days ago",  failureHistory: 0, maintenanceDeadline: 60, notes: "All systems nominal. Routine inspection passed." },
  { id: "A105", type: "Track",     section: "S12", condition: 55, risk: 91, safetyCriticality: 95, operationalCriticality: 88, priority: "Critical", status: "Critical",  lastMaintenance: "24 days ago", failureHistory: 3, maintenanceDeadline: 2,  notes: "Rail head cracking detected. Immediate inspection advised." },
  { id: "A108", type: "Switch",    section: "S14", condition: 82, risk: 51, safetyCriticality: 68, operationalCriticality: 72, priority: "Medium",   status: "Warning",   lastMaintenance: "7 days ago",  failureHistory: 1, maintenanceDeadline: 21, notes: "Actuator response time elevated. Monitor recommended." },
  { id: "A111", type: "Signal",    section: "S11", condition: 94, risk: 18, safetyCriticality: 44, operationalCriticality: 38, priority: "Low",      status: "Healthy",   lastMaintenance: "2 days ago",  failureHistory: 0, maintenanceDeadline: 90, notes: "Full signal reset performed last cycle." },
  { id: "A115", type: "Bridge",    section: "S15", condition: 71, risk: 76, safetyCriticality: 88, operationalCriticality: 77, priority: "High",     status: "High Risk", lastMaintenance: "31 days ago", failureHistory: 1, maintenanceDeadline: 8,  notes: "Deck expansion joints showing differential movement." },
  { id: "A120", type: "Traction",  section: "S13", condition: 88, risk: 29, safetyCriticality: 52, operationalCriticality: 58, priority: "Low",      status: "Healthy",   lastMaintenance: "5 days ago",  failureHistory: 0, maintenanceDeadline: 45, notes: "Recent pantograph replacement. Overhead wire contact normal." },
];

const STATUS_META: Record<RiskLevel, { color: string; bg: string; border: string; dot: string }> = {
  "Healthy":   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" },
  "Warning":   { color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  "High Risk": { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", dot: "#dc2626" },
  "Critical":  { color: "#991b1b", bg: "#fff1f2", border: "#fca5a5", dot: "#dc2626" },
};

const PRIORITY_META: Record<Priority, { color: string; bg: string }> = {
  Low:      { color: "#16a34a", bg: "#f0fdf4" },
  Medium:   { color: "#d97706", bg: "#fffbeb" },
  High:     { color: "#dc2626", bg: "#fef2f2" },
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
};

const RISK_DIST = [
  { label: "Healthy",   count: 32, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { label: "Medium",    count:  4, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { label: "High Risk", count:  8, color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  { label: "Critical",  count:  4, color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
];

const STATUS_FILTER_OPTIONS: Array<RiskLevel | "All"> = ["All", "Healthy", "Warning", "High Risk", "Critical"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function pct(v: number) { return `${v}%`; }

function condColor(v: number) {
  if (v >= 85) return "#16a34a";
  if (v >= 70) return "#d97706";
  return "#dc2626";
}

function riskColor(v: number) {
  if (v >= 85) return "#7c3aed";
  if (v >= 65) return "#dc2626";
  if (v >= 45) return "#d97706";
  return "#16a34a";
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 52, height: 5, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#374151", minWidth: 28 }}>{pct(value)}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flex: 1, minWidth: 0 }}>
      <ULabel>{label.toUpperCase()}</ULabel>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 32, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Risk Distribution Chart ───────────────────────────────────────────────────

function RiskDistChart({ onFilterClick, activeFilter }: { onFilterClick: (label: string) => void; activeFilter: string }) {
  const total = RISK_DIST.reduce((s, d) => s + d.count, 0);
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>Risk Distribution</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 16 }}>48 assets · click segment to filter</div>

      {/* Stacked bar */}
      <div style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 14, cursor: "pointer" }}>
        {RISK_DIST.map(d => (
          <div
            key={d.label}
            onClick={() => onFilterClick(d.label)}
            title={`${d.label}: ${d.count}`}
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: d.color,
              opacity: activeFilter === "All" || activeFilter === d.label ? 1 : 0.3,
              transition: "opacity 0.2s",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* Legend + bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RISK_DIST.map(d => (
          <div
            key={d.label}
            onClick={() => onFilterClick(d.label)}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              opacity: activeFilter === "All" || activeFilter === d.label ? 1 : 0.4,
              transition: "opacity 0.2s",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", width: 70 }}>{d.label}</div>
            <div style={{ flex: 1, height: 6, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(d.count / 48) * 100}%`, backgroundColor: d.color, borderRadius: 3 }} />
            </div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: d.color, width: 24, textAlign: "right" as const }}>{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Priority Factors ─────────────────────────────────────────────────────────

function PriorityFactors({ asset }: { asset: Asset }) {
  const factors = [
    { k: "Condition",                v: 100 - asset.condition, c: condColor(asset.condition) },
    { k: "Safety Criticality",       v: asset.safetyCriticality, c: riskColor(asset.safetyCriticality) },
    { k: "Operational Criticality",  v: asset.operationalCriticality, c: riskColor(asset.operationalCriticality) },
    { k: "Failure History",          v: Math.min(asset.failureHistory * 30, 90), c: asset.failureHistory > 1 ? "#dc2626" : "#d97706" },
    { k: "Maintenance Deadline",     v: Math.max(100 - asset.maintenanceDeadline * 4, 10), c: asset.maintenanceDeadline <= 7 ? "#dc2626" : "#d97706" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {factors.map(f => (
        <div key={f.k}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151" }}>{f.k}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: f.c, fontWeight: 600 }}>{f.v}%</span>
          </div>
          <div style={{ height: 7, backgroundColor: "#f0f2f5", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${f.v}%`, backgroundColor: f.c, borderRadius: 4, transition: "width 0.4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Selected Asset Panel ──────────────────────────────────────────────────────

function SelectedAssetPanel({ asset }: { asset: Asset }) {
  const sm = STATUS_META[asset.status];
  const pm = PRIORITY_META[asset.priority];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "#0d1829", letterSpacing: "-0.01em" }}>
            Asset {asset.id}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
            {asset.type} · Section {asset.section}
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: pm.color, backgroundColor: pm.bg, border: `1px solid ${pm.color}33`, borderRadius: 20, padding: "3px 12px" }}>
          {asset.priority} Priority
        </span>
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 8, padding: "10px 14px" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: sm.dot, display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: sm.color }}>{asset.status}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: sm.color }}>{asset.notes.substring(0, 48)}…</span>
      </div>

      {/* Metric grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { k: "Condition",             v: pct(asset.condition),             c: condColor(asset.condition) },
          { k: "Risk Score",            v: pct(asset.risk),                  c: riskColor(asset.risk) },
          { k: "Safety Criticality",    v: pct(asset.safetyCriticality),     c: riskColor(asset.safetyCriticality) },
          { k: "Operational Crit.",     v: pct(asset.operationalCriticality), c: riskColor(asset.operationalCriticality) },
          { k: "Last Maintenance",      v: asset.lastMaintenance,            c: "#374151" },
          { k: "Failure History",       v: `${asset.failureHistory} incidents`, c: asset.failureHistory > 1 ? "#dc2626" : "#d97706" },
        ].map(row => (
          <div key={row.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#a8b4c0", marginBottom: 4 }}>{row.k.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: row.c }}>{row.v}</div>
          </div>
        ))}
      </div>

      {/* Priority factors */}
      <div>
        <ULabel>PRIORITY CONTRIBUTION FACTORS</ULabel>
        <PriorityFactors asset={asset} />
      </div>

      {/* Notes */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px" }}>
        <ULabel>FIELD NOTES</ULabel>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{asset.notes}</div>
      </div>
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({ asset, applied, onFindWindow }: { asset: Asset; applied: boolean; onFindWindow: () => void }) {
  const reasons: Record<string, string[]> = {
    A102: ["High asset risk (87%)", "High safety criticality (92%)", "High operational impact (81%)", "Maintenance deadline in 5 days", "Compatible work available in S12"],
    A103: ["Moderate risk threshold exceeded", "Signal reliability declining", "14-day maintenance window", "Low failure history — early action advised", "Crew available in S13"],
    A104: ["Low risk — no action required now", "Condition nominal at 91%", "Next review in 60 days", "No failure history", "Scheduled routine check sufficient"],
    A105: ["Critical risk (91%) — urgent", "Safety criticality 95% — highest priority", "Operational impact 88% corridor-wide", "Rail cracking — 2-day deadline", "Immediate window required in S12"],
    A108: ["Actuator delay detected", "Safety below threshold at 68%", "Moderate operational dependency", "1 prior failure on record", "Monitor or schedule next 21 days"],
    A111: ["Asset healthy — no action needed", "All indicators nominal", "Next scheduled check sufficient", "No failure history", "Continue routine monitoring"],
    A115: ["High risk bridge structure (76%)", "Safety criticality 88%", "Expansion joint movement progressing", "8-day recommended window", "Crew and access required in S15"],
    A120: ["Asset healthy — low risk (29%)", "Recent pantograph replacement successful", "Routine check adequate", "No failures on record", "No immediate action required"],
  };
  const r = reasons[asset.id] ?? reasons["A104"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>AI ASSET RECOMMENDATION</div>
        </div>

        <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 6 }}>RECOMMENDATION</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600, color: "#0d1829", lineHeight: 1.5 }}>
            "Prioritize {asset.id} for maintenance during the next feasible {asset.section} window."
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {r.map(reason => (
            <div key={reason} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5l2.5 2.5 4-4" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{reason}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onFindWindow}
          style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
            color: applied ? "#16a34a" : "#fff",
            backgroundColor: applied ? "#f0fdf4" : "#7c3aed",
            border: applied ? "1px solid #bbf7d0" : "none",
            borderRadius: 8, padding: "11px 0", cursor: "pointer",
            width: "100%", transition: "all 0.2s",
            boxShadow: applied ? "none" : "0 2px 8px rgba(124,58,237,0.3)",
          }}
        >{applied ? "✓ Window Search Initiated" : "Find Best Window"}</button>
      </div>

      {/* Asset quick-stats */}
      <div style={{ padding: "16px 20px" }}>
        <ULabel>RISK PROFILE</ULabel>
        {[
          { k: "Asset Risk",    v: asset.risk,                  c: riskColor(asset.risk) },
          { k: "Condition",     v: asset.condition,              c: condColor(asset.condition) },
          { k: "Safety",        v: asset.safetyCriticality,      c: riskColor(asset.safetyCriticality) },
          { k: "Operations",    v: asset.operationalCriticality, c: riskColor(asset.operationalCriticality) },
        ].map(row => (
          <div key={row.k} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{row.k}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: row.c }}>{pct(row.v)}</span>
            </div>
            <div style={{ height: 5, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${row.v}%`, backgroundColor: row.c, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AssetIntelligence() {
  const [selectedId, setSelectedId] = useState("A102");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const selected = ASSETS.find(a => a.id === selectedId) ?? ASSETS[0];

  const handleDistClick = useCallback((label: string) => {
    const map: Record<string, string> = {
      "Healthy":   "Healthy",
      "Medium":    "Warning",
      "High Risk": "High Risk",
      "Critical":  "Critical",
    };
    const mapped = map[label] ?? "All";
    setStatusFilter(prev => prev === mapped ? "All" : mapped);
  }, []);

  const handleFindWindow = useCallback(() => {
    setApplied(prev => ({ ...prev, [selectedId]: !prev[selectedId] }));
  }, [selectedId]);

  const filteredAssets = statusFilter === "All"
    ? ASSETS
    : ASSETS.filter(a => a.status === statusFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Page header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em", marginBottom: 5 }}>
              Asset Intelligence
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Evaluate asset condition, safety criticality and operational risk to prioritize maintenance.
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 14px" }}>
            Last updated: 08:47 today
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
          <KpiCard label="Total Assets"   value={48} sub="Across all sections"   color="#0d1829" />
          <KpiCard label="Healthy Assets" value={32} sub="67% of fleet nominal"  color="#16a34a" />
          <KpiCard label="High-Risk Assets" value={12} sub="Require attention"   color="#dc2626" />
          <KpiCard label="Critical Assets"  value={4}  sub="Immediate action"    color="#7c3aed" />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 304px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

          {/* Table card */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, boxShadow: "0 1px 3px rgba(13,24,41,0.05)", display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
            {/* Table header */}
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Asset Risk Overview</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
                    {filteredAssets.length} of {ASSETS.length} assets · click a row to inspect
                  </div>
                </div>
              </div>

              {/* Filter chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {STATUS_FILTER_OPTIONS.map(opt => {
                  const isAll = opt === "All";
                  const active = statusFilter === opt || (isAll && statusFilter === "All");
                  const meta = !isAll ? STATUS_META[opt as RiskLevel] : null;
                  return (
                    <button
                      key={opt}
                      onClick={() => setStatusFilter(statusFilter === opt ? "All" : opt)}
                      style={{
                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                        color: active ? (meta?.color ?? "#2563eb") : "#7a8898",
                        backgroundColor: active ? (meta?.bg ?? "#eff4ff") : "#f8fafc",
                        border: `1px solid ${active ? (meta?.border ?? "#bfcffd") : "#dde2ea"}`,
                        borderRadius: 20, padding: "4px 14px", cursor: "pointer", transition: "all 0.15s",
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "70px 80px 60px 100px 100px 110px 120px 90px 90px",
              padding: "8px 20px",
              borderBottom: "1px solid #f0f2f5",
              backgroundColor: "#fafbfc",
              flexShrink: 0,
            }}>
              {["Asset", "Type", "Sec.", "Condition", "Risk", "Safety Crit.", "Ops Crit.", "Priority", "Status"].map(h => (
                <div key={h} style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0" }}>{h.toUpperCase()}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredAssets.map(asset => {
                const isSelected = asset.id === selectedId;
                const sm = STATUS_META[asset.status];
                const pm = PRIORITY_META[asset.priority];
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedId(asset.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 80px 60px 100px 100px 110px 120px 90px 90px",
                      padding: "12px 20px",
                      borderBottom: "1px solid #f4f6f9",
                      backgroundColor: isSelected ? "#eff4ff" : "transparent",
                      borderLeft: `3px solid ${isSelected ? "#2563eb" : "transparent"}`,
                      cursor: "pointer",
                      transition: "background 0.12s",
                      alignItems: "center",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f8fafc"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                  >
                    <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: isSelected ? "#2563eb" : "#0d1829" }}>{asset.id}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>{asset.type}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>{asset.section}</div>
                    <MiniBar value={asset.condition} color={condColor(asset.condition)} />
                    <MiniBar value={asset.risk} color={riskColor(asset.risk)} />
                    <MiniBar value={asset.safetyCriticality} color={riskColor(asset.safetyCriticality)} />
                    <MiniBar value={asset.operationalCriticality} color={riskColor(asset.operationalCriticality)} />
                    <div>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: pm.color, backgroundColor: pm.bg, border: `1px solid ${pm.color}22`, borderRadius: 20, padding: "2px 10px" }}>
                        {asset.priority}
                      </span>
                    </div>
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: sm.color, backgroundColor: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 20, padding: "2px 10px" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sm.dot, display: "inline-block", flexShrink: 0 }} />
                        {asset.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredAssets.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100 }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#a8b4c0" }}>No assets match the current filter.</div>
                </div>
              )}
            </div>
          </div>

          {/* Risk distribution */}
          <div style={{ flexShrink: 0 }}>
            <RiskDistChart onFilterClick={handleDistClick} activeFilter={statusFilter} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

          {/* Selected asset panel */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, boxShadow: "0 1px 3px rgba(13,24,41,0.05)", padding: "18px 20px", overflowY: "auto", flex: 1 }}>
            <div style={{ borderBottom: "1px solid #e8edf3", paddingBottom: 10, marginBottom: 16 }}>
              <ULabel color="#2563eb">SELECTED ASSET</ULabel>
            </div>
            <SelectedAssetPanel asset={selected} />
          </div>

          {/* AI panel */}
          <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed", borderRadius: 10, boxShadow: "0 1px 4px rgba(124,58,237,0.08)", overflowY: "auto", flexShrink: 0 }}>
            <AIPanel
              asset={selected}
              applied={!!applied[selectedId]}
              onFindWindow={handleFindWindow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
