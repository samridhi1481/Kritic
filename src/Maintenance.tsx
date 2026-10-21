import { useState, useMemo } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

type RiskLevel = "High" | "Medium" | "Low";
type WOStatus = "In Progress" | "Scheduled" | "Recommended" | "Completed";

interface WorkOrder {
  id: string;
  asset: string;
  section: string;
  type: string;
  risk: RiskLevel;
  crew: number;
  window: string;
  status: WOStatus;
  progress?: number;
}

const INITIAL_ORDERS: WorkOrder[] = [
  { id: "MW01", asset: "Track S12", section: "S12", type: "Track Geometry Repair", risk: "High", crew: 8, window: "09:00–13:30", status: "In Progress", progress: 42 },
  { id: "MW02", asset: "Signal S08", section: "S08", type: "Signal Inspection", risk: "Medium", crew: 4, window: "14:00–16:00", status: "Scheduled" },
  { id: "MW03", asset: "OHE S13", section: "S13", type: "OHE Inspection", risk: "High", crew: 6, window: "11:30–13:30", status: "Recommended" },
  { id: "MW04", asset: "Track S11", section: "S11", type: "Track Inspection", risk: "Low", crew: 3, window: "16:00–18:00", status: "Scheduled" },
  { id: "MW05", asset: "Bridge B04", section: "S11", type: "Structural Survey", risk: "Medium", crew: 5, window: "07:00–09:00", status: "Completed", progress: 100 },
  { id: "MW06", asset: "Signal S14", section: "S13", type: "Panel Firmware Update", risk: "Low", crew: 2, window: "10:00–11:00", status: "Completed", progress: 100 },
];

// ─── Color maps ────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<RiskLevel, string> = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const RISK_BG: Record<RiskLevel, string>    = { High: "#fef2f2", Medium: "#fffbeb", Low: "#f0fdf4" };
const RISK_BD: Record<RiskLevel, string>    = { High: "#fca5a5", Medium: "#fde68a", Low: "#bbf7d0" };

const STATUS_COLOR: Record<WOStatus, string>  = { "In Progress": "#2563eb", Scheduled: "#7a8898", Recommended: "#7c3aed", Completed: "#16a34a" };
const STATUS_BG: Record<WOStatus, string>     = { "In Progress": "#eff4ff", Scheduled: "#f8fafc", Recommended: "#f5f3ff", Completed: "#f0fdf4" };
const STATUS_BD: Record<WOStatus, string>     = { "In Progress": "#bfcffd", Scheduled: "#dde2ea", Recommended: "#c4b5fd", Completed: "#bbf7d0" };

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span style={{
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
      color: RISK_COLOR[risk], backgroundColor: RISK_BG[risk],
      border: `1px solid ${RISK_BD[risk]}`, borderRadius: 4, padding: "2px 8px",
    }}>{risk}</span>
  );
}

function StatusBadge({ status }: { status: WOStatus }) {
  const dot = status === "In Progress" ? "●" : status === "Completed" ? "✓" : "○";
  return (
    <span style={{
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
      color: STATUS_COLOR[status], backgroundColor: STATUS_BG[status],
      border: `1px solid ${STATUS_BD[status]}`, borderRadius: 4, padding: "2px 9px",
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" as const,
    }}>
      <span style={{ fontSize: 8 }}>{dot}</span>{status}
    </span>
  );
}

function Btn({ children, variant, onClick, disabled }: { children: React.ReactNode; variant: "primary" | "secondary" | "ghost" | "danger" | "purple"; onClick?: () => void; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { color: "#fff", backgroundColor: "#0d1829", border: "none" },
    secondary: { color: "#0d1829", backgroundColor: "#fff", border: "1px solid #dde2ea" },
    ghost:     { color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd" },
    danger:    { color: "#dc2626", backgroundColor: "#fef2f2", border: "1px solid #fca5a5" },
    purple:    { color: "#fff", backgroundColor: "#7c3aed", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
        borderRadius: 8, padding: "9px 16px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s",
        whiteSpace: "nowrap" as const,
        ...styles[variant],
      }}
    >{children}</button>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ orders }: { orders: WorkOrder[] }) {
  const inProgress = orders.filter(o => o.status === "In Progress").length;
  const completed  = orders.filter(o => o.status === "Completed").length;
  const cards = [
    { label: "CRITICAL ASSETS", value: "12", sub: "Requiring attention", color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
    { label: "MAINTENANCE DUE", value: "8",  sub: "Within planning horizon", color: "#d97706", bg: "#fffbeb", bd: "#fde68a" },
    { label: "IN PROGRESS",     value: String(inProgress), sub: `${inProgress} active work order${inProgress !== 1 ? "s" : ""}`, color: "#2563eb", bg: "#eff4ff", bd: "#bfcffd" },
    { label: "COMPLETED TODAY", value: String(completed + 12), sub: "14 orders closed", color: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {cards.map(c => (
        <div key={c.label} style={{ backgroundColor: "#fff", border: `1px solid ${c.bd}`, borderRadius: 10, padding: "18px 20px", borderTop: `3px solid ${c.color}` }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 38, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Work Orders Table ─────────────────────────────────────────────────────────

const FILTERS = ["All", "Critical", "High Risk", "Scheduled", "In Progress", "Completed"];

function filterOrders(orders: WorkOrder[], f: string): WorkOrder[] {
  if (f === "All")        return orders;
  if (f === "Critical")   return orders.filter(o => o.risk === "High");
  if (f === "High Risk")  return orders.filter(o => o.risk === "High" || o.risk === "Medium");
  if (f === "Scheduled")  return orders.filter(o => o.status === "Scheduled");
  if (f === "In Progress") return orders.filter(o => o.status === "In Progress");
  if (f === "Completed")  return orders.filter(o => o.status === "Completed");
  return orders;
}

const COL_WIDTHS = ["80px", "120px", "80px", "1fr", "90px", "110px", "120px", "130px"];
const COL_LABELS = ["Work Order", "Asset", "Section", "Type", "Risk", "Crew", "Window", "Status"];

function TableHeader() {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: COL_WIDTHS.join(" "),
      padding: "10px 18px", backgroundColor: "#f8fafc",
      borderBottom: "1px solid #e8edf3", gap: 8,
    }}>
      {COL_LABELS.map(h => (
        <div key={h} style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#7a8898" }}>{h}</div>
      ))}
    </div>
  );
}

function TableRow({ order, selected, onClick }: { order: WorkOrder; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: COL_WIDTHS.join(" "),
        padding: "13px 18px", gap: 8, alignItems: "center", cursor: "pointer",
        borderBottom: "1px solid #f0f2f5",
        backgroundColor: selected ? "#f5f3ff" : "#fff",
        borderLeft: `3px solid ${selected ? "#7c3aed" : "transparent"}`,
        transition: "background 0.12s, border-color 0.12s",
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f8fafc"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff"; }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: selected ? "#7c3aed" : "#0d1829" }}>{order.id}</span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829", fontWeight: 500 }}>{order.asset}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>{order.section}</span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151" }}>{order.type}</span>
      <RiskBadge risk={order.risk} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>{order.crew} workers</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>{order.window}</span>
      <StatusBadge status={order.status} />
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({
  order,
  accepted,
  onAccept,
  onSchedule,
  onViewDetails,
}: {
  order: WorkOrder | null;
  accepted: boolean;
  onAccept: () => void;
  onSchedule: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* AI Recommendation */}
      <div style={{ borderBottom: "1px solid #e8edf3", padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>AI MAINTENANCE RECOMMENDATION</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <AIStatRow k="Asset" v="Section S12" />
          <AIStatRow k="Risk" v="High" vColor="#dc2626" />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Condition</span>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>63%</span>
            </div>
            <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3 }}>
              <div style={{ height: "100%", width: "63%", backgroundColor: "#dc2626", borderRadius: 3 }} />
            </div>
          </div>
          <AIStatRow k="Recommended Window" v="11:30–13:30" vColor="#7c3aed" vMono />
          <AIStatRow k="Predicted Delay" v="21 min" vColor="#d97706" />
        </div>

        <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 4 }}>REASON</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
            Low traffic density, high asset priority and crew availability make this window optimal.
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
          >
            {accepted ? "✓ Recommendation Accepted" : "Accept AI Recommendation"}
          </button>
          <button
            onClick={onSchedule}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              color: "#7c3aed", backgroundColor: "#fff",
              border: "1px solid #c4b5fd", borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
            }}
          >
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Selected work order detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        {order ? (
          <>
            <Label>SELECTED WORK ORDER</Label>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: "#0d1829", marginBottom: 12 }}>
              {order.id} — {order.asset}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" as const }}>
              <RiskBadge risk={order.risk} />
              <StatusBadge status={order.status} />
            </div>
            {order.progress != null && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Progress</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: STATUS_COLOR[order.status], fontWeight: 600 }}>{order.progress}%</span>
                </div>
                <div style={{ height: 5, backgroundColor: "#e8edf3", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${order.progress}%`, backgroundColor: STATUS_COLOR[order.status], borderRadius: 3 }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                ["Section", order.section],
                ["Type", order.type],
                ["Crew", `${order.crew} workers`],
                ["Window", order.window],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{k}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#0d1829" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={onViewDetails} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#0d1829", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%" }}>
                View Details
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center", paddingTop: 24 }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>☑</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>Click a work order to inspect it.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIStatRow({ k, v, vColor, vMono }: { k: string; v: string; vColor?: string; vMono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{k}</span>
      <span style={{ fontFamily: vMono ? "var(--font-mono)" : "var(--font-brand)", fontSize: 13, fontWeight: 600, color: vColor ?? "#0d1829" }}>{v}</span>
    </div>
  );
}

// ─── Create Work Order Modal ───────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (wo: WorkOrder) => void }) {
  const [form, setForm] = useState({ asset: "", section: "", type: "", risk: "Medium" as RiskLevel, crew: "4", windowStart: "09:00", windowEnd: "11:00" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.asset || !form.section || !form.type) return;
    const newId = `MW${String(Math.floor(Math.random() * 90) + 10)}`;
    onCreate({
      id: newId, asset: form.asset, section: form.section, type: form.type,
      risk: form.risk, crew: parseInt(form.crew) || 4,
      window: `${form.windowStart}–${form.windowEnd}`, status: "Scheduled",
    });
    setSubmitted(true);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829",
    backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7,
    padding: "9px 12px", outline: "none", width: "100%", boxSizing: "border-box" as const,
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Create Work Order" onClose={onClose} />
      <div style={{ padding: "24px" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>Work Order Created</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>The work order has been added and assigned to the schedule.</div>
            <button onClick={onClose} style={{ marginTop: 20, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#fff", backgroundColor: "#0d1829", border: "none", borderRadius: 8, padding: "10px 28px", cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Asset Name">
                <input style={inputStyle} placeholder="e.g. Track S12" value={form.asset} onChange={set("asset")} />
              </Field>
              <Field label="Section">
                <input style={inputStyle} placeholder="e.g. S12" value={form.section} onChange={set("section")} />
              </Field>
            </div>
            <Field label="Maintenance Type">
              <input style={inputStyle} placeholder="e.g. Track Geometry Repair" value={form.type} onChange={set("type")} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Risk Level">
                <select style={inputStyle} value={form.risk} onChange={set("risk") as React.ChangeEventHandler<HTMLSelectElement>}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </Field>
              <Field label="Crew Size">
                <input style={inputStyle} type="number" min={1} max={30} value={form.crew} onChange={set("crew")} />
              </Field>
            </div>
            <Field label="Maintenance Window">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input style={{ ...inputStyle, width: "auto", flex: 1 }} type="time" value={form.windowStart} onChange={set("windowStart")} />
                <span style={{ color: "#7a8898", fontSize: 13 }}>to</span>
                <input style={{ ...inputStyle, width: "auto", flex: 1 }} type="time" value={form.windowEnd} onChange={set("windowEnd")} />
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleSubmit} disabled={!form.asset || !form.section || !form.type}
                style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#fff", backgroundColor: (!form.asset || !form.section || !form.type) ? "#a8b4c0" : "#0d1829", border: "none", borderRadius: 8, padding: "11px 0", cursor: (!form.asset || !form.section || !form.type) ? "not-allowed" : "pointer" }}>
                Create Work Order
              </button>
              <button onClick={onClose} style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#0d1829", backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ─── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const windows = [
    { label: "11:30–13:30", score: 94.7, impact: "Low", trains: 1, note: "AI recommended" },
    { label: "14:00–16:00", score: 71.2, impact: "Medium", trains: 3, note: "Moderate disruption" },
    { label: "22:00–02:00", score: 88.4, impact: "Minimal", trains: 0, note: "Off-peak" },
  ];
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Schedule Maintenance — Section S12" onClose={onClose} />
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {confirmed ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>Scheduled</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", marginTop: 6 }}>Maintenance for Section S12 confirmed for {windows[picked].label}. Crew notified.</div>
            <button onClick={onClose} style={{ marginTop: 20, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#fff", backgroundColor: "#7c3aed", border: "none", borderRadius: 8, padding: "10px 28px", cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>Select a maintenance window ranked by opportunity score.</div>
            {windows.map((w, i) => (
              <div key={i} onClick={() => setPicked(i)} style={{
                border: `1.5px solid ${picked === i ? "#7c3aed" : "#dde2ea"}`,
                backgroundColor: picked === i ? "#f5f3ff" : "#fff",
                borderRadius: 8, padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "all 0.15s",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: picked === i ? "#7c3aed" : "#0d1829" }}>{w.label}</span>
                    {i === 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#7c3aed", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 4, padding: "1px 6px" }}>AI</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Impact: {w.impact} · {w.trains} train{w.trains !== 1 ? "s" : ""} affected · {w.note}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#7a8898", letterSpacing: "0.08em" }}>SCORE</div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: w.score > 90 ? "#16a34a" : w.score > 80 ? "#d97706" : "#7a8898" }}>{w.score}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setConfirmed(true)} style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "#fff", backgroundColor: "#7c3aed", border: "none", borderRadius: 8, padding: "12px 0", cursor: "pointer" }}>
              Confirm Schedule
            </button>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ─── View Details Modal ────────────────────────────────────────────────────────

function DetailsModal({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`${order.id} — ${order.asset}`} onClose={onClose} />
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <RiskBadge risk={order.risk} />
          <StatusBadge status={order.status} />
        </div>
        {order.progress != null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Completion progress</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: STATUS_COLOR[order.status] }}>{order.progress}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: "#e8edf3", borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${order.progress}%`, backgroundColor: STATUS_COLOR[order.status], borderRadius: 3 }} />
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["Work Order", order.id],
            ["Asset", order.asset],
            ["Section", order.section],
            ["Type", order.type],
            ["Risk", order.risk],
            ["Crew", `${order.crew} workers`],
            ["Window", order.window],
            ["Status", order.status],
          ].map(([k, v]) => (
            <div key={k} style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7, padding: "10px 14px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7a8898", marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600, color: "#0d1829" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#7a8898", letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
            {order.id === "MW01"
              ? "Track geometry deviation detected at chainage 4.2–5.8 km. Rail wear on outer rail exceeds threshold. Ballast settlement observed. Priority remediation in progress."
              : "Routine maintenance scheduled per planned cycle. No abnormal findings at pre-inspection."}
          </div>
        </div>
        <button onClick={onClose} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#fff", backgroundColor: "#0d1829", border: "none", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Close</button>
      </div>
    </Overlay>
  );
}

// ─── Modal primitives ──────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(13,24,41,0.38)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(13,24,41,0.18)", border: "1px solid #dde2ea", width: 540, maxHeight: "82vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #dde2ea" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>{title}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#7a8898", lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}>×</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#7a8898", letterSpacing: "0.07em", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Maintenance() {
  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_ORDERS);
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>("MW01");
  const [aiAccepted, setAiAccepted] = useState(false);
  const [modal, setModal] = useState<"create" | "schedule" | "details" | null>(null);

  const filtered = useMemo(() => filterOrders(orders, filter), [orders, filter]);
  const selected = orders.find(o => o.id === selectedId) ?? null;

  const handleCreate = (wo: WorkOrder) => setOrders(prev => [wo, ...prev]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              Maintenance
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Predictive maintenance planning, work orders and asset health.
            </p>
          </div>
          <Btn variant="primary" onClick={() => setModal("create")}>+ Create Work Order</Btn>
        </div>
        <SummaryCards orders={orders} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 288px", gap: 0, overflow: "hidden", padding: "0 28px 24px" }}>
        {/* Work orders table */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: "10px 0 0 10px", borderRight: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Table header bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>
              Maintenance Work Orders
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 400, color: "#7a8898", marginLeft: 10 }}>{filtered.length} orders</span>
            </div>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 4 }}>
              {FILTERS.map(f => {
                const active = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: active ? 600 : 400,
                    color: active ? "#0d1829" : "#7a8898",
                    backgroundColor: active ? "#fff" : "transparent",
                    border: active ? "1px solid #dde2ea" : "1px solid transparent",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                    boxShadow: active ? "0 1px 2px rgba(13,24,41,0.06)" : "none",
                    transition: "all 0.12s",
                  }}>{f}</button>
                );
              })}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ flexShrink: 0 }}>
            <TableHeader />
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--font-ui)", fontSize: 13, color: "#a8b4c0" }}>
                No work orders match this filter.
              </div>
            ) : (
              filtered.map(order => (
                <TableRow
                  key={order.id}
                  order={order}
                  selected={selectedId === order.id}
                  onClick={() => setSelectedId(prev => prev === order.id ? null : order.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: "0 10px 10px 0", borderLeft: "1px solid #e8edf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <RightPanel
            order={selected}
            accepted={aiAccepted}
            onAccept={() => setAiAccepted(v => !v)}
            onSchedule={() => setModal("schedule")}
            onViewDetails={() => selected && setModal("details")}
          />
        </div>
      </div>

      {/* Modals */}
      {modal === "create"   && <CreateModal  onClose={() => setModal(null)} onCreate={handleCreate} />}
      {modal === "schedule" && <ScheduleModal onClose={() => setModal(null)} />}
      {modal === "details"  && selected && <DetailsModal order={selected} onClose={() => setModal(null)} />}
    </div>
  );
}
