import { useState, useMemo } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

type ResultType = "Completed" | "Recommended" | "Approved" | "Warning" | "Modified" | "Rejected";
type UserType   = "Planner" | "RailTwin AI" | "Supervisor";
type ActionType = "Optimization Run" | "Schedule Updated" | "Plan Approved" | "Conflict Detected" | "Schedule Modified" | "Plan Rejected" | "Safety Alert" | "Crew Reassigned";

interface AuditRecord {
  id: string;
  timestamp: string;
  user: UserType;
  action: ActionType;
  schedule: string;
  scenario: string;
  result: ResultType;
  detail: RecordDetail;
}

interface RecordDetail {
  network: string;
  assets: number;
  trains: number;
  maintenanceRequests: number;
  weights: Array<{ k: string; v: number }>;
  constraints: Array<{ k: string; met: boolean }>;
  output: { blocks: number; delay: number; conflicts: number; availability: number };
  metrics: { opportunityScore: number; preserved: number };
  approvalSteps: Array<{ label: string; done: boolean; active?: boolean }>;
  notes: string;
}

const RECORDS: AuditRecord[] = [
  {
    id: "AUD-001",
    timestamp: "14:32", user: "RailTwin AI",   action: "Optimization Run",    schedule: "SCH-104", scenario: "SC-12", result: "Completed",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 7, maintenanceRequests: 47,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 88 }, { k: "Coordination", v: 76 }, { k: "Train Disruption", v: 82 }, { k: "Block Reduction", v: 70 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 7, delay: 21, conflicts: 3, availability: 98.2 },
      metrics: { opportunityScore: 94.7, preserved: 94 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true }, { label: "Approved", done: true }],
      notes: "Full optimization across 48 assets. 7 coordinated blocks produced. Opportunity score 94.7.",
    },
  },
  {
    id: "AUD-002",
    timestamp: "14:45", user: "RailTwin AI",   action: "Schedule Updated",    schedule: "SCH-104", scenario: "SC-12", result: "Recommended",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 7, maintenanceRequests: 47,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 88 }, { k: "Coordination", v: 76 }, { k: "Train Disruption", v: 82 }, { k: "Block Reduction", v: 70 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 7, delay: 21, conflicts: 3, availability: 98.2 },
      metrics: { opportunityScore: 94.7, preserved: 94 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true, active: true }, { label: "Approved", done: false }],
      notes: "Schedule SCH-104 updated with AI recommended window 11:30–13:30.",
    },
  },
  {
    id: "AUD-003",
    timestamp: "15:02", user: "Planner",        action: "Plan Approved",       schedule: "SCH-104", scenario: "SC-12", result: "Approved",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 7, maintenanceRequests: 47,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 88 }, { k: "Coordination", v: 76 }, { k: "Train Disruption", v: 82 }, { k: "Block Reduction", v: 70 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 7, delay: 21, conflicts: 3, availability: 98.2 },
      metrics: { opportunityScore: 94.7, preserved: 94 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true }, { label: "Approved", done: true }],
      notes: "Human approval granted by Planner at 15:02. Plan applied to live operations.",
    },
  },
  {
    id: "AUD-004",
    timestamp: "15:18", user: "RailTwin AI",   action: "Conflict Detected",   schedule: "SCH-105", scenario: "SC-13", result: "Warning",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 6, maintenanceRequests: 44,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 80 }, { k: "Coordination", v: 68 }, { k: "Train Disruption", v: 90 }, { k: "Block Reduction", v: 65 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: false }, { k: "Train Conflict", met: false }, { k: "Department", met: true }],
      output: { blocks: 9, delay: 38, conflicts: 5, availability: 95.1 },
      metrics: { opportunityScore: 71.2, preserved: 82 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true, active: true }, { label: "Pending Approval", done: false }, { label: "Approved", done: false }],
      notes: "2 train conflicts detected in proposed SCH-105 window. Planner notified.",
    },
  },
  {
    id: "AUD-005",
    timestamp: "15:31", user: "Planner",        action: "Schedule Modified",   schedule: "SCH-105", scenario: "SC-13", result: "Modified",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 6, maintenanceRequests: 44,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 80 }, { k: "Coordination", v: 68 }, { k: "Train Disruption", v: 90 }, { k: "Block Reduction", v: 65 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 8, delay: 29, conflicts: 1, availability: 96.7 },
      metrics: { opportunityScore: 82.4, preserved: 89 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true, active: true }, { label: "Approved", done: false }],
      notes: "Planner shifted window from 15:00 to 13:00–15:00. Conflict resolved. Re-submitted for approval.",
    },
  },
  {
    id: "AUD-006",
    timestamp: "15:46", user: "Planner",        action: "Plan Rejected",       schedule: "SCH-106", scenario: "SC-14", result: "Rejected",
    detail: {
      network: "Demo Corridor", assets: 45, trains: 5, maintenanceRequests: 39,
      weights: [{ k: "Safety", v: 98 }, { k: "Maintenance", v: 72 }, { k: "Coordination", v: 60 }, { k: "Train Disruption", v: 88 }, { k: "Block Reduction", v: 55 }],
      constraints: [{ k: "Safety", met: false }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: false }, { k: "Department", met: true }],
      output: { blocks: 6, delay: 44, conflicts: 4, availability: 92.3 },
      metrics: { opportunityScore: 58.9, preserved: 76 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true }, { label: "Approved", done: false }],
      notes: "Plan rejected due to unresolved safety constraint violation in section S14.",
    },
  },
  {
    id: "AUD-007",
    timestamp: "16:04", user: "Supervisor",     action: "Safety Alert",        schedule: "SCH-106", scenario: "SC-14", result: "Warning",
    detail: {
      network: "Demo Corridor", assets: 45, trains: 5, maintenanceRequests: 39,
      weights: [{ k: "Safety", v: 100 }, { k: "Maintenance", v: 60 }, { k: "Coordination", v: 50 }, { k: "Train Disruption", v: 70 }, { k: "Block Reduction", v: 40 }],
      constraints: [{ k: "Safety", met: false }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 0, delay: 0, conflicts: 0, availability: 92.3 },
      metrics: { opportunityScore: 0, preserved: 76 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: false }, { label: "Approved", done: false }],
      notes: "Supervisor escalated safety alert for asset A105 in section S14. Immediate review required.",
    },
  },
  {
    id: "AUD-008",
    timestamp: "16:19", user: "RailTwin AI",   action: "Crew Reassigned",     schedule: "SCH-107", scenario: "SC-12", result: "Completed",
    detail: {
      network: "Demo Corridor", assets: 48, trains: 7, maintenanceRequests: 47,
      weights: [{ k: "Safety", v: 95 }, { k: "Maintenance", v: 88 }, { k: "Coordination", v: 76 }, { k: "Train Disruption", v: 82 }, { k: "Block Reduction", v: 70 }],
      constraints: [{ k: "Safety", met: true }, { k: "Resources", met: true }, { k: "Deadline", met: true }, { k: "Train Conflict", met: true }, { k: "Department", met: true }],
      output: { blocks: 7, delay: 18, conflicts: 0, availability: 99.1 },
      metrics: { opportunityScore: 96.2, preserved: 97 },
      approvalSteps: [{ label: "Optimization Generated", done: true }, { label: "Planner Reviewed", done: true }, { label: "Pending Approval", done: true }, { label: "Approved", done: true }],
      notes: "Crew Team C4 automatically reassigned following Team C2 unavailability. No disruption.",
    },
  },
];

const RESULT_META: Record<ResultType, { color: string; bg: string; border: string }> = {
  Completed:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  Recommended: { color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  Approved:    { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  Warning:     { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  Modified:    { color: "#2563eb", bg: "#eff4ff", border: "#bfcffd" },
  Rejected:    { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

const USER_META: Record<UserType, { color: string; bg: string; initials: string }> = {
  "Planner":     { color: "#2563eb", bg: "#eff4ff", initials: "PL" },
  "RailTwin AI": { color: "#7c3aed", bg: "#f5f3ff", initials: "AI" },
  "Supervisor":  { color: "#d97706", bg: "#fffbeb", initials: "SV" },
};

const USER_OPTIONS:   Array<"All" | UserType>   = ["All", "Planner", "RailTwin AI", "Supervisor"];
const ACTION_OPTIONS: Array<"All" | ActionType> = ["All", "Optimization Run", "Schedule Updated", "Plan Approved", "Conflict Detected", "Schedule Modified", "Plan Rejected", "Safety Alert", "Crew Reassigned"];
const RESULT_OPTIONS: Array<"All" | ResultType> = ["All", "Completed", "Recommended", "Approved", "Warning", "Modified", "Rejected"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Chip({ label, active, color, bg, border, onClick }: {
  label: string; active: boolean; color?: string; bg?: string; border?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
        color:           active && color  ? color  : "#7a8898",
        backgroundColor: active && bg     ? bg     : "#f8fafc",
        border: `1px solid ${active && border ? border : "#dde2ea"}`,
        borderRadius: 20, padding: "4px 14px", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const,
      }}
    >{label}</button>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ record, onClose }: { record: AuditRecord; onClose: () => void }) {
  const d = record.detail;
  const rm = RESULT_META[record.result];

  return (
    <div style={{ backgroundColor: "#fff", border: "1.5px solid #bfcffd", borderTop: "3px solid #2563eb", borderRadius: 10, padding: "22px 24px", boxShadow: "0 2px 10px rgba(37,99,235,0.1)" }}>
      {/* Drawer header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: "#0d1829" }}>Decision Record · {record.id}</div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: rm.color, backgroundColor: rm.bg, border: `1px solid ${rm.border}`, borderRadius: 20, padding: "2px 12px" }}>
              {record.result}
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>
            {record.action} · {record.schedule} · {record.scenario} · {record.timestamp}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
        {/* Input Dataset */}
        <div>
          <ULabel color="#2563eb">INPUT DATASET</ULabel>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              { k: "Network",               v: d.network },
              { k: "Assets",                v: d.assets },
              { k: "Trains",                v: d.trains },
              { k: "Maintenance Requests",  v: d.maintenanceRequests },
            ].map(row => (
              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{row.k}</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#0d1829" }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Objective Weights */}
        <div>
          <ULabel color="#7c3aed">OBJECTIVE WEIGHTS</ULabel>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {d.weights.map(w => (
              <div key={w.k}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151" }}>{w.k}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "#7c3aed" }}>{w.v}%</span>
                </div>
                <div style={{ height: 4, backgroundColor: "#ede9fe", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${w.v}%`, backgroundColor: "#7c3aed", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <ULabel>CONSTRAINTS</ULabel>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, color: "#a8b4c0", marginBottom: 2 }}>
              Solver: RailTwin Optimization Engine
            </div>
            {d.constraints.map(c => (
              <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: c.met ? "#dcfce7" : "#fee2e2", border: `1px solid ${c.met ? "#bbf7d0" : "#fca5a5"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {c.met ? (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2L2 6" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: c.met ? "#374151" : "#dc2626" }}>{c.k}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Output + Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <ULabel color="#16a34a">OUTPUT</ULabel>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { k: "Coordinated Blocks", v: `${d.output.blocks}`, c: "#16a34a" },
                { k: "Predicted Delay",    v: `${d.output.delay} min`, c: d.output.delay > 30 ? "#dc2626" : "#16a34a" },
                { k: "Conflicts",          v: String(d.output.conflicts), c: d.output.conflicts > 0 ? "#d97706" : "#16a34a" },
                { k: "Asset Availability", v: `${d.output.availability}%`, c: "#16a34a" },
              ].map(row => (
                <div key={row.k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{row.k}</span>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: row.c }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <ULabel>METRICS</ULabel>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Opportunity Score</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: d.metrics.opportunityScore >= 80 ? "#16a34a" : "#d97706" }}>{d.metrics.opportunityScore} / 100</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Preserved</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{d.metrics.preserved}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval history + notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <ULabel>APPROVAL HISTORY</ULabel>
          <div style={{ display: "flex", gap: 0 }}>
            {d.approvalSteps.map((step, i) => {
              const isLast = i === d.approvalSteps.length - 1;
              return (
                <div key={step.label} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: step.done ? "#dcfce7" : step.active ? "#eff4ff" : "#f0f2f5", border: `2px solid ${step.done ? "#16a34a" : step.active ? "#2563eb" : "#dde2ea"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {step.done && !step.active && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                      {step.active && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2563eb" }} />
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 600, color: step.done ? "#374151" : "#a8b4c0", textAlign: "center" as const, marginTop: 4, maxWidth: 70 }}>{step.label}</div>
                  </div>
                  {!isLast && <div style={{ flex: 1, height: 2, backgroundColor: step.done ? "#bbf7d0" : "#e8edf3", margin: "0 4px", marginBottom: 20 }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <ULabel>NOTES</ULabel>
          <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{d.notes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export Toast ──────────────────────────────────────────────────────────────

function ExportToast({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, backgroundColor: "#fff", border: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a", borderRadius: 10, padding: "16px 20px", boxShadow: "0 8px 24px rgba(13,24,41,0.12)", display: "flex", alignItems: "center", gap: 14, zIndex: 200, minWidth: 340 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v8M4 7l4 4 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 12h12" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 2 }}>Audit Log Exported</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#166534" }}>audit-log-{new Date().toISOString().slice(0, 10)}.csv downloaded.</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Audit() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [userFilter, setUserFilter]   = useState<string>("All");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [resultFilter, setResultFilter] = useState<string>("All");
  const [showExport, setShowExport]   = useState(false);

  const filtered = useMemo(() => {
    return RECORDS.filter(r => {
      const matchSearch = !search || [r.id, r.user, r.action, r.schedule, r.scenario, r.result]
        .some(v => v.toLowerCase().includes(search.toLowerCase()));
      const matchUser   = userFilter   === "All" || r.user   === userFilter;
      const matchAction = actionFilter === "All" || r.action === actionFilter;
      const matchResult = resultFilter === "All" || r.result === resultFilter;
      return matchSearch && matchUser && matchAction && matchResult;
    });
  }, [search, userFilter, actionFilter, resultFilter]);

  const selectedRecord = selectedId ? RECORDS.find(r => r.id === selectedId) ?? null : null;

  const handleRowClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleExport = () => {
    setShowExport(true);
    setTimeout(() => setShowExport(false), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em", marginBottom: 5 }}>
              Decision Audit
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Track and explain every optimization decision, schedule change and approval for complete traceability.
            </p>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 14px" }}>
            Today · 14:00 – 16:30
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { k: "Total Decisions",    v: 48, c: "#0d1829", sub: "All events today" },
            { k: "Optimization Runs",  v: 12, c: "#7c3aed", sub: "AI engine cycles" },
            { k: "Approved Plans",     v: 9,  c: "#16a34a", sub: "Human-approved" },
            { k: "Modified Plans",     v: 3,  c: "#2563eb", sub: "Planner-adjusted" },
            { k: "Critical Events",    v: 2,  c: "#dc2626", sub: "Require attention" },
          ].map(card => (
            <div key={card.k} style={{ flex: 1, backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
              <ULabel>{card.k.toUpperCase()}</ULabel>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 30, fontWeight: 700, color: card.c, letterSpacing: "-0.02em", lineHeight: 1 }}>{card.v}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 5 }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 292px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

          {/* Table card */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, boxShadow: "0 1px 3px rgba(13,24,41,0.05)", display: "flex", flexDirection: "column", overflow: "hidden", flex: selectedRecord ? "0 0 auto" : 1 }}>
            {/* Table header + filters */}
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Decision Audit Log</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
                    {filtered.length} of {RECORDS.length} records · click row to inspect
                  </div>
                </div>
              </div>

              {/* Search + filters */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}>
                    <circle cx="7" cy="7" r="4.5" stroke="#a8b4c0" strokeWidth="1.3" />
                    <path d="M10.5 10.5l2.5 2.5" stroke="#a8b4c0" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search records…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7, padding: "6px 12px 6px 28px", outline: "none", width: 180 }}
                  />
                </div>

                <div style={{ width: 1, height: 20, backgroundColor: "#dde2ea" }} />

                {/* User filter */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.06em" }}>USER</span>
                  {USER_OPTIONS.map(opt => (
                    <Chip key={opt} label={opt} active={userFilter === opt}
                      color={opt !== "All" ? USER_META[opt as UserType].color : "#2563eb"}
                      bg={opt !== "All" ? USER_META[opt as UserType].bg : "#eff4ff"}
                      border={opt !== "All" ? "#bfcffd" : "#bfcffd"}
                      onClick={() => setUserFilter(prev => prev === opt ? "All" : opt)}
                    />
                  ))}
                </div>

                <div style={{ width: 1, height: 20, backgroundColor: "#dde2ea" }} />

                {/* Result filter */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.06em" }}>RESULT</span>
                  {RESULT_OPTIONS.map(opt => {
                    const m = opt !== "All" ? RESULT_META[opt as ResultType] : null;
                    return (
                      <Chip key={opt} label={opt} active={resultFilter === opt}
                        color={m?.color ?? "#2563eb"} bg={m?.bg ?? "#eff4ff"} border={m?.border ?? "#bfcffd"}
                        onClick={() => setResultFilter(prev => prev === opt ? "All" : opt)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "60px 110px 170px 80px 70px 110px", padding: "8px 20px", borderBottom: "1px solid #f0f2f5", backgroundColor: "#fafbfc", flexShrink: 0 }}>
              {["Time", "User", "Action", "Schedule", "Scenario", "Result"].map(h => (
                <div key={h} style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0" }}>{h.toUpperCase()}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ overflowY: "auto", flex: selectedRecord ? "0 0 auto" : 1, maxHeight: selectedRecord ? 240 : undefined }}>
              {filtered.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#a8b4c0" }}>No records match current filters.</span>
                </div>
              ) : (
                filtered.map(record => {
                  const isSelected = selectedId === record.id;
                  const rm = RESULT_META[record.result];
                  const um = USER_META[record.user];
                  return (
                    <div
                      key={record.id}
                      onClick={() => handleRowClick(record.id)}
                      style={{
                        display: "grid", gridTemplateColumns: "60px 110px 170px 80px 70px 110px",
                        padding: "11px 20px", borderBottom: "1px solid #f4f6f9",
                        backgroundColor: isSelected ? "#eff4ff" : "transparent",
                        borderLeft: `3px solid ${isSelected ? "#2563eb" : "transparent"}`,
                        cursor: "pointer", alignItems: "center", transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                    >
                      {/* Timestamp */}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7a8898" }}>{record.timestamp}</div>

                      {/* User */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: um.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontFamily: "var(--font-brand)", fontSize: 8, fontWeight: 700, color: um.color }}>{um.initials}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: um.color, fontWeight: 600 }}>{record.user}</span>
                      </div>

                      {/* Action */}
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>{record.action}</div>

                      {/* Schedule */}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898" }}>{record.schedule}</div>

                      {/* Scenario */}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898" }}>{record.scenario}</div>

                      {/* Result */}
                      <div>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: rm.color, backgroundColor: rm.bg, border: `1px solid ${rm.border}`, borderRadius: 20, padding: "2px 11px" }}>
                          {record.result}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail drawer */}
          {selectedRecord && (
            <div style={{ flexShrink: 0 }}>
              <DetailDrawer record={selectedRecord} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed", borderRadius: 10, boxShadow: "0 1px 4px rgba(124,58,237,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>AUDIT INTELLIGENCE</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Summary */}
            <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.65 }}>
                "Every RailTwin AI decision is traceable from input data and constraints to optimized output and human approval."
              </div>
            </div>

            {/* Stats */}
            <div>
              <ULabel>TODAY'S ACTIVITY</ULabel>
              {[
                { k: "AI Decisions Today",   v: "12", c: "#7c3aed" },
                { k: "Decisions Approved",   v: "9",  c: "#16a34a" },
                { k: "Decisions Modified",   v: "3",  c: "#2563eb" },
                { k: "Last Audit Event",     v: "2 min ago", c: "#374151" },
              ].map(row => (
                <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f2f5" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.k}</span>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: row.c }}>{row.v}</span>
                </div>
              ))}
            </div>

            {/* Action type breakdown */}
            <div>
              <ULabel>ACTION BREAKDOWN</ULabel>
              {[
                { k: "Optimization Runs",  v: 12, total: 48, c: "#7c3aed" },
                { k: "Plans Approved",     v: 9,  total: 48, c: "#16a34a" },
                { k: "Plans Modified",     v: 3,  total: 48, c: "#2563eb" },
                { k: "Conflicts Detected", v: 8,  total: 48, c: "#d97706" },
                { k: "Plans Rejected",     v: 2,  total: 48, c: "#dc2626" },
              ].map(row => (
                <div key={row.k} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151" }}>{row.k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: row.c }}>{row.v}</span>
                  </div>
                  <div style={{ height: 5, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(row.v / row.total) * 100}%`, backgroundColor: row.c, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance */}
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px" }}>
              <ULabel color="#16a34a">COMPLIANCE STATUS</ULabel>
              {[
                "All AI decisions traceable",
                "Human approval recorded",
                "Constraint violations documented",
                "Modification reasons captured",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#166534" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#0d1829", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "11px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f2f5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f8fafc"; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M4 7l4 4 4-4" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12h12" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export Audit Log
            </button>
          </div>
        </div>
      </div>

      {/* Export toast */}
      {showExport && <ExportToast onClose={() => setShowExport(false)} />}
    </div>
  );
}
