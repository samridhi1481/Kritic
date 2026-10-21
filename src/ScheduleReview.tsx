import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ApprovalStatus = "pending" | "approved" | "rejected";

interface TimeWindow { start: string; end: string; }

const WINDOWS: Array<{ label: string; value: TimeWindow; conflicting: boolean }> = [
  { label: "09:00 – 11:00", value: { start: "09:00", end: "11:00" }, conflicting: false },
  { label: "11:30 – 13:30", value: { start: "11:30", end: "13:30" }, conflicting: false },
  { label: "13:00 – 15:00", value: { start: "13:00", end: "15:00" }, conflicting: false },
  { label: "15:00 – 17:00", value: { start: "15:00", end: "17:00" }, conflicting: true  },
  { label: "17:30 – 19:30", value: { start: "17:30", end: "19:30" }, conflicting: false },
];

const ORIGINAL_WINDOW = WINDOWS[1]; // 11:30–13:30

const DECISION_REASONS = [
  { label: "Low train density in window", ok: true },
  { label: "High asset priority — A102, A105", ok: true },
  { label: "Compatible maintenance activities", ok: true },
  { label: "Required crew available", ok: true },
  { label: "Deadline satisfied", ok: true },
  { label: "Lower disruption score (21 min vs 47 min)", ok: true },
];

const PLAN_ATTRIBUTES = [
  { k: "Section",                 v: "S12" },
  { k: "Maintenance Window",      v: "11:30 – 13:30" },
  { k: "Opportunity Score",       v: "94.7 / 100",      c: "#16a34a" },
  { k: "Coordinated Activities",  v: "Track · Signalling · Traction" },
  { k: "Predicted Delay",         v: "8 min",           c: "#16a34a" },
  { k: "Operational Conflicts",   v: "0",               c: "#16a34a" },
  { k: "Safety Constraints",      v: "PASSED",          c: "#16a34a" },
  { k: "Crew Availability",       v: "Available",       c: "#16a34a" },
  { k: "Deadline",                v: "Satisfied",       c: "#16a34a" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── Conflict Warning Modal ────────────────────────────────────────────────────

function ConflictModal({ window: win, onCancel, onProceed }: {
  window: TimeWindow;
  onCancel: () => void;
  onProceed: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(13,24,41,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: "#fff", borderRadius: 14, padding: "30px 32px", width: 440, boxShadow: "0 20px 60px rgba(13,24,41,0.2)", border: "1px solid #dde2ea" }}
      >
        {/* Icon */}
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#fef2f2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L2 19h18L11 3z" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M11 9v5M11 15.5v1" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: "#0d1829", marginBottom: 6 }}>
          Operational Warning
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", marginBottom: 20 }}>
          Moving this block to {win.start} creates:
        </div>

        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 9, padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "1 train conflict on corridor S12",
              "1 additional resource conflict — Crew C2",
              "Projected disruption increases from 8 min → 34 min",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#dc2626" }}>!</span>
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#374151", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}
          >Cancel</button>
          <button
            onClick={onProceed}
            style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#fff", backgroundColor: "#dc2626", border: "none", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}
          >Proceed Anyway</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modify Panel ──────────────────────────────────────────────────────────────

function ModifyPanel({ onSave, onClose }: { onSave: (w: TimeWindow, wasConflict: boolean) => void; onClose: () => void }) {
  const [selectedWindow, setSelectedWindow] = useState(ORIGINAL_WINDOW);
  const [showConflict, setShowConflict] = useState(false);
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (selectedWindow.conflicting) {
      setShowConflict(true);
    } else {
      onSave(selectedWindow.value, false);
    }
  };

  const handleProceed = () => {
    setShowConflict(false);
    onSave(selectedWindow.value, true);
  };

  return (
    <>
      <div style={{ backgroundColor: "#fff", border: "1.5px solid #bfcffd", borderTop: "3px solid #2563eb", borderRadius: 10, padding: "22px 24px", boxShadow: "0 2px 8px rgba(37,99,235,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Modify Schedule</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Adjust the maintenance window for Section S12</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <ULabel>SELECT MAINTENANCE WINDOW</ULabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {WINDOWS.map(w => {
              const isSelected = w.label === selectedWindow.label;
              return (
                <button
                  key={w.label}
                  onClick={() => setSelectedWindow(w)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const,
                    backgroundColor: isSelected ? (w.conflicting ? "#fef2f2" : "#eff4ff") : "#f8fafc",
                    border: `1.5px solid ${isSelected ? (w.conflicting ? "#fca5a5" : "#bfcffd") : "#e8edf3"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: isSelected ? (w.conflicting ? "#dc2626" : "#2563eb") : "#374151" }}>
                    {w.label}
                  </span>
                  {w.conflicting && (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#dc2626", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 20, padding: "2px 10px" }}>
                      ⚠ Conflict Risk
                    </span>
                  )}
                  {!w.conflicting && w.label === ORIGINAL_WINDOW.label && (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "2px 10px" }}>
                      AI Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <ULabel>MODIFICATION REASON</ULabel>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Briefly describe why you are modifying the schedule…"
            style={{
              width: "100%", height: 72, resize: "none" as const, fontFamily: "var(--font-ui)", fontSize: 13,
              color: "#374151", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8,
              padding: "10px 14px", outline: "none", boxSizing: "border-box" as const,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "10px 0", cursor: "pointer" }}
          >Cancel</button>
          <button
            onClick={handleSave}
            style={{ flex: 2, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#fff", backgroundColor: "#2563eb", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer" }}
          >Save Modified Schedule</button>
        </div>
      </div>

      {showConflict && (
        <ConflictModal
          window={selectedWindow.value}
          onCancel={() => setShowConflict(false)}
          onProceed={handleProceed}
        />
      )}
    </>
  );
}

// ─── Confirmation Banner ───────────────────────────────────────────────────────

function ConfirmationBanner({ status, window: win }: { status: ApprovalStatus; window: TimeWindow }) {
  if (status === "pending") return null;

  const isApproved = status === "approved";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "18px 24px",
      backgroundColor: isApproved ? "#f0fdf4" : "#fef2f2",
      border: `1.5px solid ${isApproved ? "#bbf7d0" : "#fca5a5"}`,
      borderRadius: 10,
      boxShadow: `0 2px 8px ${isApproved ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)"}`,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isApproved ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isApproved ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4 4 8-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: isApproved ? "#15803d" : "#b91c1c", marginBottom: 3 }}>
          Plan {isApproved ? "Approved" : "Rejected"}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: isApproved ? "#166534" : "#991b1b" }}>
          {isApproved
            ? `The optimized maintenance plan for Section S12 · ${win.start}–${win.end} is now active and will be applied at the next sync.`
            : "The optimized plan has been rejected. The previous maintenance schedule remains active. RailTwin AI will not apply changes."}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isApproved ? "#16a34a" : "#dc2626", flexShrink: 0 }}>
        {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ScheduleReview() {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
  const [showModify, setShowModify] = useState(false);
  const [activeWindow, setActiveWindow] = useState<TimeWindow>(ORIGINAL_WINDOW.value);
  const [wasConflicting, setWasConflicting] = useState(false);

  const isPending = approvalStatus === "pending";

  const handleApprove = () => {
    setShowModify(false);
    setApprovalStatus("approved");
  };

  const handleReject = () => {
    setShowModify(false);
    setApprovalStatus("rejected");
  };

  const handleModifySave = (w: TimeWindow, conflict: boolean) => {
    setActiveWindow(w);
    setWasConflicting(conflict);
    setShowModify(false);
    setApprovalStatus("pending");
  };

  const handleReset = () => {
    setApprovalStatus("pending");
    setActiveWindow(ORIGINAL_WINDOW.value);
    setWasConflicting(false);
    setShowModify(false);
  };

  // Derive the display window label
  const windowLabel = `${activeWindow.start} – ${activeWindow.end}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Page header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
              <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em" }}>
                Schedule Review
              </h1>
              <span style={{
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                borderRadius: 20, padding: "3px 14px",
                color: approvalStatus === "approved" ? "#16a34a" : approvalStatus === "rejected" ? "#dc2626" : "#d97706",
                backgroundColor: approvalStatus === "approved" ? "#f0fdf4" : approvalStatus === "rejected" ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${approvalStatus === "approved" ? "#bbf7d0" : approvalStatus === "rejected" ? "#fca5a5" : "#fde68a"}`,
              }}>
                {approvalStatus === "approved" ? "✓ APPROVED" : approvalStatus === "rejected" ? "✕ REJECTED" : "● PENDING APPROVAL"}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Review the optimized maintenance plan before applying changes to railway operations.
            </p>
          </div>

          {!isPending && (
            <button
              onClick={handleReset}
              style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7, padding: "7px 16px", cursor: "pointer" }}
            >
              Reset Review
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Confirmation banner */}
          {!isPending && (
            <ConfirmationBanner status={approvalStatus} window={activeWindow} />
          )}

          {/* Conflict-proceed notice */}
          {isPending && wasConflicting && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#92400e" }}>
                Modified window <strong>{windowLabel}</strong> was applied despite a detected conflict. Review carefully before approving.
              </span>
            </div>
          )}

          {/* Plan details card */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "22px 24px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 3 }}>Optimized Maintenance Plan</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Generated by RailTwin AI · Awaiting human approval</div>
              </div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: "#16a34a", letterSpacing: "-0.01em" }}>
                94.7
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 400, color: "#7a8898", marginLeft: 3 }}>/ 100</span>
              </div>
            </div>

            {/* Attribute grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { k: "Section",                v: "S12",                             c: "#0d1829" },
                { k: "Maintenance Window",     v: windowLabel,                       c: "#2563eb" },
                { k: "Opportunity Score",      v: "94.7 / 100",                      c: "#16a34a" },
                { k: "Coordinated Activities", v: "Track · Signalling · Traction",   c: "#0d1829" },
                { k: "Predicted Delay",        v: wasConflicting ? "34 min" : "8 min", c: wasConflicting ? "#dc2626" : "#16a34a" },
                { k: "Operational Conflicts",  v: wasConflicting ? "2" : "0",        c: wasConflicting ? "#dc2626" : "#16a34a" },
                { k: "Safety Constraints",     v: wasConflicting ? "⚠ Review" : "PASSED", c: wasConflicting ? "#d97706" : "#16a34a" },
                { k: "Crew Availability",      v: "Available",                       c: "#16a34a" },
                { k: "Deadline",               v: "Satisfied",                       c: "#16a34a" },
              ].map(row => (
                <div key={row.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#a8b4c0", marginBottom: 4 }}>{row.k.toUpperCase()}</div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: row.c, lineHeight: 1.3 }}>{row.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Before vs Optimized */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "22px 24px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 18 }}>Before vs Optimized</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "center" }}>
              {/* Before */}
              <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 16 }}>BEFORE</div>
                {[
                  { k: "Maintenance Blocks", v: "11 blocks",     c: "#dc2626" },
                  { k: "Conflicts",           v: "9 conflicts",  c: "#dc2626" },
                  { k: "Estimated Delay",     v: "47 min",       c: "#dc2626" },
                ].map(row => (
                  <div key={row.k} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #fca5a5" }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#f87171", marginBottom: 3 }}>{row.k.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: row.c, letterSpacing: "-0.02em" }}>{row.v}</div>
                  </div>
                ))}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#b91c1c" }}>❌ Multiple conflicts · Uncoordinated</div>
              </div>

              {/* Arrow */}
              <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f5f3ff", border: "1.5px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8h8M9 5l3 3-3 3" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", textAlign: "center" as const }}>AI<br />OPT.</div>
              </div>

              {/* Optimized */}
              <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 16 }}>RAILTWIN AI</div>
                {[
                  { k: "Coordinated Blocks", v: wasConflicting ? "7 blocks*"  : "7 blocks",    c: "#16a34a" },
                  { k: "Conflicts",           v: wasConflicting ? "2 conflicts" : "3 conflicts", c: wasConflicting ? "#dc2626" : "#16a34a" },
                  { k: "Estimated Delay",     v: wasConflicting ? "34 min*"    : "21 min",       c: wasConflicting ? "#dc2626" : "#16a34a" },
                ].map(row => (
                  <div key={row.k} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #bbf7d0" }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#4ade80", marginBottom: 3 }}>{row.k.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: row.c, letterSpacing: "-0.02em" }}>{row.v}</div>
                  </div>
                ))}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: wasConflicting ? "#d97706" : "#15803d" }}>
                  {wasConflicting ? "⚠ Conflict window — review carefully" : "✓ Coordinated · Conflict-free"}
                </div>
              </div>
            </div>

            {/* Improvement summary */}
            {!wasConflicting && (
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {[
                  { k: "Blocks reduced",  v: "−4",    c: "#16a34a" },
                  { k: "Conflicts fixed", v: "−6",    c: "#16a34a" },
                  { k: "Delay saved",     v: "−26 min", c: "#16a34a" },
                ].map(row => (
                  <div key={row.k} style={{ flex: 1, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#86efac", marginBottom: 3 }}>{row.k.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: row.c }}>{row.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isPending && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "22px 24px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 6 }}>Approval Actions</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginBottom: 20 }}>
                Your decision will be recorded with a timestamp and applied to the live operational plan.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {/* APPROVE */}
                <button
                  onClick={handleApprove}
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em",
                    color: "#fff", backgroundColor: "#16a34a", border: "none", borderRadius: 10,
                    padding: "18px 0", cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(22,163,74,0.35)", transition: "transform 0.1s, box-shadow 0.1s",
                    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12l5 5 11-10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  APPROVE
                </button>

                {/* MODIFY */}
                <button
                  onClick={() => setShowModify(v => !v)}
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em",
                    color: showModify ? "#fff" : "#2563eb",
                    backgroundColor: showModify ? "#2563eb" : "#eff4ff",
                    border: "1.5px solid #bfcffd", borderRadius: 10,
                    padding: "18px 0", cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  MODIFY
                </button>

                {/* REJECT */}
                <button
                  onClick={handleReject}
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em",
                    color: "#dc2626", backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10,
                    padding: "18px 0", cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#dc2626";
                    (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fef2f2";
                    (e.currentTarget as HTMLButtonElement).style.color = "#dc2626";
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  REJECT
                </button>
              </div>
            </div>
          )}

          {/* Modify panel */}
          {showModify && isPending && (
            <ModifyPanel
              onSave={handleModifySave}
              onClose={() => setShowModify(false)}
            />
          )}
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed", borderRadius: 10, boxShadow: "0 1px 4px rgba(124,58,237,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* AI badge */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>DECISION EXPLANATION</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Summary */}
            <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 6 }}>WHY THIS PLAN?</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: "#0d1829", lineHeight: 1.55 }}>
                RailTwin AI selected the 11:30–13:30 window as the globally optimal slot across safety, operations, and crew constraints.
              </div>
            </div>

            {/* Reasons */}
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 10 }}>SELECTION CRITERIA</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DECISION_REASONS.map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Human-in-the-loop notice */}
            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#d97706", marginBottom: 6 }}>HUMAN OVERSIGHT</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                Human approval is required before the optimized plan becomes active. RailTwin AI provides decision support — operational control remains with you.
              </div>
            </div>

            {/* Approval timeline */}
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 10 }}>APPROVAL TIMELINE</div>
              {[
                { step: "Plan generated",  time: "08:31", done: true },
                { step: "AI validation",   time: "08:32", done: true },
                { step: "Sent for review", time: "08:33", done: true },
                { step: "Human approval",  time: approvalStatus !== "pending" ? new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—", done: approvalStatus !== "pending", active: approvalStatus === "pending" },
                { step: "Plan applied",    time: "—",     done: false, blocked: approvalStatus === "rejected" },
              ].map((item, i) => (
                <div key={item.step} style={{ display: "flex", gap: 12, marginBottom: i < 4 ? 12 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: item.blocked ? "#fee2e2" : item.done ? "#dcfce7" : item.active ? "#eff4ff" : "#f0f2f5",
                      border: `1.5px solid ${item.blocked ? "#fca5a5" : item.done ? "#bbf7d0" : item.active ? "#bfcffd" : "#dde2ea"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {item.done && !item.blocked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.active && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2563eb" }} />
                      )}
                      {item.blocked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M2 2l4 4M6 2L2 6" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    {i < 4 && <div style={{ width: 1.5, height: 12, backgroundColor: item.done ? "#bbf7d0" : "#e8edf3", marginTop: 2 }} />}
                  </div>
                  <div style={{ paddingTop: 1 }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: item.active ? 600 : 400, color: item.blocked ? "#dc2626" : item.done ? "#374151" : "#a8b4c0" }}>
                      {item.step}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a8b4c0" }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
