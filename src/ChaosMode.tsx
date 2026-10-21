import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types & Data ──────────────────────────────────────────────────────────────

interface DisruptionScenario {
  id: string;
  icon: string;
  label: string;
  detail: string;
  color: string;
  bg: string;
  border: string;
  train?: { id: string; scheduled: string; actual: string; delay: string };
  impact: { sections: number; blocks: number; trains: number };
  original: { block: string; window: string };
  updated:  { block: string; window: string };
  changes: number;
  preserved: number;
  additionalDelay: number;
  reason: string;
  aiReasons: string[];
}

const SCENARIOS: DisruptionScenario[] = [
  {
    id: "train-delay",
    icon: "🚂", label: "Train Delay", detail: "+45 min",
    color: "#dc2626", bg: "#fef2f2", border: "#fca5a5",
    train: { id: "T104", scheduled: "11:20", actual: "12:05", delay: "+45 min" },
    impact: { sections: 2, blocks: 3, trains: 4 },
    original: { block: "Block B12", window: "10:00–15:00" },
    updated:  { block: "Block B12", window: "10:30–15:30" },
    changes: 3, preserved: 94, additionalDelay: 6,
    reason: "Train T104 delay overlapped the original maintenance window. RailTwin preserved unaffected tasks and shifted the affected block to the next feasible window.",
    aiReasons: ["Conflict removed", "Safety constraints satisfied", "Crew availability preserved", "Unaffected assignments preserved", "Additional disruption minimized"],
  },
  {
    id: "emergency",
    icon: "⚠", label: "Emergency Maintenance", detail: "Immediate",
    color: "#dc2626", bg: "#fef2f2", border: "#fca5a5",
    train: undefined,
    impact: { sections: 3, blocks: 4, trains: 5 },
    original: { block: "Block B08", window: "09:00–12:00" },
    updated:  { block: "Block B08", window: "13:00–16:00" },
    changes: 4, preserved: 91, additionalDelay: 18,
    reason: "An emergency flagged on asset S12 at 09:30 required immediate access. RailTwin rerouted scheduled blocks to the afternoon window preserving crew and safety.",
    aiReasons: ["Emergency access granted", "Morning blocks rescheduled safely", "Crew reassigned", "Safety constraints satisfied", "Downstream trains unaffected"],
  },
  {
    id: "section-unavailable",
    icon: "🚧", label: "Section Unavailable", detail: "S13 · 10:00–14:00",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    train: undefined,
    impact: { sections: 1, blocks: 5, trains: 3 },
    original: { block: "Block B15", window: "11:00–13:00" },
    updated:  { block: "Block B15", window: "14:00–16:00" },
    changes: 2, preserved: 96, additionalDelay: 8,
    reason: "Section S13 became unavailable due to a track geometry fault. RailTwin deferred the affected block to post-14:00 and confirmed no safety violations.",
    aiReasons: ["Section conflict resolved", "Track fault isolated", "Block deferred safely", "Crew schedule intact", "Safety constraints satisfied"],
  },
  {
    id: "crew-unavailable",
    icon: "👷", label: "Crew Unavailable", detail: "Team C2",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    train: undefined,
    impact: { sections: 2, blocks: 2, trains: 0 },
    original: { block: "Block B09", window: "09:30–11:30" },
    updated:  { block: "Block B09", window: "14:00–16:00" },
    changes: 2, preserved: 97, additionalDelay: 0,
    reason: "Crew Team C2 reported unavailable. RailTwin reassigned Team C4 and moved the block to their available window with no train delays introduced.",
    aiReasons: ["Crew reassigned", "No train conflicts introduced", "Safety compliance maintained", "Schedule shifted minimally", "97% assignments unchanged"],
  },
  {
    id: "maint-delay",
    icon: "🔧", label: "Maintenance Delay", detail: "+2 hours",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    train: { id: "MW01", scheduled: "09:00", actual: "11:00", delay: "+2 hrs" },
    impact: { sections: 1, blocks: 3, trains: 2 },
    original: { block: "Block B12", window: "09:00–12:00" },
    updated:  { block: "Block B12", window: "11:00–14:00" },
    changes: 3, preserved: 93, additionalDelay: 4,
    reason: "Work order MW01 started 2 hours late due to equipment unavailability. RailTwin slid the block forward and checked downstream dependencies before confirming the shift.",
    aiReasons: ["Work order slid forward", "Downstream dependencies checked", "Train T202 re-timed", "Safety window maintained", "Crew schedule preserved"],
  },
  {
    id: "additional-train",
    icon: "➕", label: "Additional Train", detail: "Train XT09",
    color: "#2563eb", bg: "#eff4ff", border: "#bfcffd",
    train: { id: "XT09", scheduled: "—", actual: "12:30", delay: "Unscheduled" },
    impact: { sections: 3, blocks: 2, trains: 1 },
    original: { block: "Block B20", window: "12:00–14:00" },
    updated:  { block: "Block B20", window: "10:00–12:00" },
    changes: 2, preserved: 95, additionalDelay: 3,
    reason: "An unscheduled train XT09 was added to the corridor at 12:30. RailTwin moved Block B20 earlier to clear the path, with only 3 minutes of additional delay fleet-wide.",
    aiReasons: ["Path cleared for XT09", "Block moved earlier safely", "Minimal additional delay", "Safety constraints satisfied", "95% assignments unchanged"],
  },
];

const STAGE_DEFS = [
  { id: "normal",      label: "NORMAL OPERATIONS",  color: "#16a34a", desc: "All maintenance blocks and train movements on schedule." },
  { id: "detected",   label: "DISRUPTION DETECTED", color: "#dc2626", desc: "Live disruption received and validated by RailTwin AI." },
  { id: "propagation",label: "IMPACT PROPAGATION",   color: "#d97706", desc: "Ripple analysis across dependent blocks and train paths." },
  { id: "affected",   label: "AFFECTED BLOCKS",      color: "#d97706", desc: "Conflicting maintenance windows and trains identified." },
  { id: "reopt",      label: "RE-OPTIMIZATION",      color: "#7c3aed", desc: "Adaptive scheduler computes new feasible plan." },
  { id: "plan",       label: "NEW FEASIBLE PLAN",    color: "#16a34a", desc: "Plan updated. Safety constraints verified. Ready to apply." },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── Disruption Card ───────────────────────────────────────────────────────────

function DisruptionCard({ sc, selected, onClick }: { sc: DisruptionScenario; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: selected ? sc.bg : "#fff",
        border: `1.5px solid ${selected ? sc.color : "#dde2ea"}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: selected ? `0 0 0 3px ${sc.color}18` : "0 1px 3px rgba(13,24,41,0.05)",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20 }}>{sc.icon}</span>
        {selected && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: sc.color, display: "inline-block" }} />
        )}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#0d1829", lineHeight: 1.3 }}>{sc.label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: sc.color }}>{sc.detail}</div>
    </div>
  );
}

// ─── Stage Pipeline ────────────────────────────────────────────────────────────

function StagePipeline({ activeStage, scenario }: { activeStage: number; scenario: DisruptionScenario }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {STAGE_DEFS.map((stage, i) => {
        const isDone    = i < activeStage;
        const isActive  = i === activeStage;
        const isPending = i > activeStage;
        const color = isDone || isActive ? stage.color : "#c8d0dc";

        return (
          <div key={stage.id} style={{ display: "flex", gap: 0 }}>
            {/* Left: dot + connector */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
              {/* Dot */}
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                backgroundColor: isDone ? stage.color : isActive ? "#fff" : "#f0f2f5",
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isActive ? `0 0 0 4px ${stage.color}20` : "none",
                transition: "all 0.3s",
                zIndex: 1,
              }}>
                {isDone && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isActive && (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: stage.color }} />
                )}
              </div>
              {/* Connector */}
              {i < STAGE_DEFS.length - 1 && (
                <div style={{
                  width: 2, flexGrow: 1, minHeight: 32,
                  backgroundColor: isDone ? stage.color : "#e8edf3",
                  transition: "background-color 0.4s",
                  marginTop: 2, marginBottom: 2,
                }} />
              )}
            </div>

            {/* Right: content */}
            <div style={{
              paddingLeft: 14, paddingBottom: i < STAGE_DEFS.length - 1 ? 18 : 0,
              paddingTop: 0, flex: 1,
              opacity: isPending ? 0.4 : 1,
              transition: "opacity 0.3s",
            }}>
              <div style={{
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", color, marginBottom: 3,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {stage.label}
                {isActive && stage.id === "reopt" && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 4, padding: "1px 7px", animation: "none" }}>
                    COMPUTING…
                  </span>
                )}
                {isDone && stage.id === "plan" && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 7px" }}>
                    FEASIBLE ✓
                  </span>
                )}
              </div>

              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: isActive ? 10 : 0 }}>
                {stage.desc}
              </div>

              {/* Stage-specific inline data */}
              {isActive && stage.id === "detected" && scenario.train && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, padding: "10px 14px", display: "inline-flex", gap: 20 }}>
                  {[
                    { k: "Train",     v: scenario.train.id },
                    { k: "Scheduled", v: scenario.train.scheduled },
                    { k: "Actual",    v: scenario.train.actual },
                    { k: "Delay",     v: scenario.train.delay, c: "#dc2626" },
                  ].map(row => (
                    <div key={row.k}>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0", marginBottom: 2 }}>{row.k}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: (row as {k:string;v:string;c?:string}).c ?? "#0d1829" }}>{row.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {isActive && stage.id === "affected" && (
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { k: "Sections",  v: scenario.impact.sections, c: "#d97706" },
                    { k: "Blocks",    v: scenario.impact.blocks,   c: "#d97706" },
                    { k: "Trains",    v: scenario.impact.trains,   c: "#dc2626" },
                  ].map(row => (
                    <div key={row.k} style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "8px 14px" }}>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0", marginBottom: 2 }}>AFFECTED {row.k.toUpperCase()}</div>
                      <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: row.c }}>{row.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {isDone && stage.id === "plan" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 6 }}>
                  {[
                    { k: "Changes",   v: scenario.changes,          c: "#d97706" },
                    { k: "Preserved", v: `${scenario.preserved}%`,  c: "#16a34a" },
                    { k: "Add. Delay", v: `${scenario.additionalDelay} min`, c: scenario.additionalDelay < 5 ? "#16a34a" : "#d97706" },
                  ].map(row => (
                    <div key={row.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 12px" }}>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0", marginBottom: 1 }}>{row.k.toUpperCase()}</div>
                      <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: row.c }}>{row.v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Self-healing result ───────────────────────────────────────────────────────

function SelfHealingResult({ scenario, visible }: { scenario: DisruptionScenario; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Original */}
        <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 10 }}>✕ ORIGINAL PLAN</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>{scenario.original.block}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>{scenario.original.window}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#dc2626", backgroundColor: "#fff", border: "1px solid #fca5a5", borderRadius: 5, padding: "3px 8px", display: "inline-block" }}>
            CONFLICT · Disrupted
          </div>
        </div>

        {/* Updated */}
        <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "18px 20px", position: "relative" as const }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 10 }}>✓ UPDATED PLAN</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>{scenario.updated.block}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>{scenario.updated.window}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#16a34a", backgroundColor: "#fff", border: "1px solid #bbf7d0", borderRadius: 5, padding: "3px 8px", display: "inline-block" }}>
            FEASIBLE ✓ AI Verified
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { k: "Schedule Changes",      v: String(scenario.changes),             c: "#d97706", bg: "#fffbeb", bd: "#fde68a" },
          { k: "Preserved",             v: `${scenario.preserved}%`,             c: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0" },
          { k: "Additional Delay",      v: `${scenario.additionalDelay} min`,    c: scenario.additionalDelay < 5 ? "#16a34a" : "#d97706", bg: scenario.additionalDelay < 5 ? "#f0fdf4" : "#fffbeb", bd: scenario.additionalDelay < 5 ? "#bbf7d0" : "#fde68a" },
          { k: "Safety Constraints",    v: "PASSED",                              c: "#16a34a", bg: "#f0fdf4", bd: "#bbf7d0" },
        ].map(row => (
          <div key={row.k} style={{ backgroundColor: row.bg, border: `1px solid ${row.bd}`, borderRadius: 9, padding: "14px 16px" }}>
            <ULabel>{row.k.toUpperCase()}</ULabel>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: row.c, letterSpacing: "-0.01em" }}>{row.v}</div>
          </div>
        ))}
      </div>

      {/* Reason */}
      <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 9, padding: "16px 18px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7c3aed", marginBottom: 8 }}>WHY DID THE PLAN CHANGE?</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "#374151", lineHeight: 1.65 }}>
          "{scenario.reason}"
        </div>
      </div>
    </div>
  );
}

// ─── Review Drawer ─────────────────────────────────────────────────────────────

function ReviewDrawer({ scenario, onClose }: { scenario: DisruptionScenario; onClose: () => void }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "22px 24px", boxShadow: "0 2px 8px rgba(13,24,41,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>Adaptive Rescheduling — Full Comparison</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Disruption: {scenario.label} · {scenario.detail}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22, lineHeight: 1 }}>×</button>
      </div>

      {/* Comparison table */}
      <div style={{ border: "1px solid #dde2ea", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", backgroundColor: "#f8fafc", borderBottom: "1px solid #e8edf3" }}>
          {["ATTRIBUTE", "ORIGINAL PLAN", "UPDATED PLAN"].map((h, i) => (
            <div key={h} style={{ padding: "10px 16px", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: i === 1 ? "#dc2626" : i === 2 ? "#16a34a" : "#7a8898" }}>{h}</div>
          ))}
        </div>
        {[
          { attr: "Block",            orig: scenario.original.block,                  upd: scenario.updated.block },
          { attr: "Window",           orig: scenario.original.window,                 upd: scenario.updated.window },
          { attr: "Conflicts",        orig: `${scenario.impact.blocks} detected`,     upd: "None" },
          { attr: "Affected Trains",  orig: String(scenario.impact.trains),           upd: scenario.impact.trains > 1 ? String(scenario.impact.trains - 1) : "0" },
          { attr: "Crew",             orig: "As scheduled",                            upd: "As scheduled" },
          { attr: "Safety Status",    orig: "⚠ Violated",                            upd: "✓ Passed" },
          { attr: "Delay Impact",     orig: `${scenario.additionalDelay + 15} min`,   upd: `${scenario.additionalDelay} min` },
          { attr: "AI Verification",  orig: "—",                                       upd: "✓ Verified" },
        ].map((row, i) => (
          <div key={row.attr} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #f0f2f5", backgroundColor: i % 2 === 1 ? "#fafbfc" : "#fff" }}>
            <div style={{ padding: "11px 16px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#374151" }}>{row.attr}</div>
            <div style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "#dc2626", borderLeft: "1px solid #f0f2f5" }}>{row.orig}</div>
            <div style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "#16a34a", borderLeft: "1px solid #f0f2f5" }}>{row.upd}</div>
          </div>
        ))}
      </div>

      {/* AI reasons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {scenario.aiReasons.map(r => (
          <div key={r} style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>◆</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{r}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ scenario, done, applied, onApply, onReview, showReview }: {
  scenario: DisruptionScenario;
  done: boolean;
  applied: boolean;
  onApply: () => void;
  onReview: () => void;
  showReview: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>ADAPTIVE AI RECOMMENDATION</div>
        </div>

        {!done ? (
          <div style={{ textAlign: "center" as const, padding: "28px 0" }}>
            <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>◆</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898" }}>
              Run a disruption scenario to receive an adaptive AI recommendation.
            </div>
          </div>
        ) : (
          <>
            <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 6 }}>AI VERDICT</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", lineHeight: 1.4 }}>
                Re-optimized maintenance plan is feasible.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {scenario.aiReasons.map(r => (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2.5 2.5 4-4" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>{r}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={onApply}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                  color: applied ? "#16a34a" : "#fff",
                  backgroundColor: applied ? "#f0fdf4" : "#7c3aed",
                  border: applied ? "1px solid #bbf7d0" : "none",
                  borderRadius: 8, padding: "11px 0", cursor: "pointer", transition: "all 0.2s", width: "100%",
                }}
              >{applied ? "✓ New Plan Applied" : "Apply New Plan"}</button>

              <button
                onClick={onReview}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                  color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd",
                  borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
                }}
              >{showReview ? "▲ Close Review" : "Review Changes"}</button>
            </div>
          </>
        )}
      </div>

      {/* Disruption summary */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8edf3" }}>
        <ULabel>ACTIVE DISRUPTION</ULabel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{scenario.icon}</span>
          <div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>{scenario.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: scenario.color }}>{scenario.detail}</div>
          </div>
        </div>
        {done && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { k: "Sections Affected", v: scenario.impact.sections, c: "#d97706" },
              { k: "Blocks Affected",   v: scenario.impact.blocks,   c: "#d97706" },
              { k: "Trains Affected",   v: scenario.impact.trains,   c: "#dc2626" },
              { k: "Assignments Saved", v: `${scenario.preserved}%`, c: "#16a34a" },
            ].map(row => (
              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f2f5" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.k}</span>
                <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: row.c }}>{row.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System health */}
      <div style={{ padding: "16px 20px" }}>
        <ULabel>SYSTEM HEALTH</ULabel>
        {[
          { k: "Network Resilience",  v: done ? "Maintained" : "Nominal",  c: "#16a34a" },
          { k: "Safety Status",       v: done ? "✓ Passed" : "✓ Green",   c: "#16a34a" },
          { k: "AI Engine",           v: "Active",                          c: "#7c3aed" },
          { k: "Adaptation Mode",     v: done ? "Complete" : "Standby",     c: done ? "#16a34a" : "#7a8898" },
        ].map(row => (
          <div key={row.k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{row.k}</span>
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: row.c }}>{row.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ChaosMode() {
  const [selectedId, setSelectedId] = useState("train-delay");
  const [animStage, setAnimStage] = useState(-1); // -1 = not started
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scenario = SCENARIOS.find(s => s.id === selectedId) ?? SCENARIOS[0];

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setAnimStage(-1);
    setRunning(false);
    setDone(false);
    setApplied(false);
    setShowReview(false);
  }, []);

  const handleSelect = (id: string) => {
    if (running) return;
    setSelectedId(id);
    reset();
  };

  const runDisruption = useCallback(() => {
    reset();
    setRunning(true);
    const delays = [0, 600, 1400, 2200, 3000, 4200];
    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setAnimStage(i);
        if (i === STAGE_DEFS.length - 1) {
          setTimeout(() => { setRunning(false); setDone(true); }, 600);
        }
      }, delay);
      timersRef.current.push(t);
    });
  }, [reset]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
              <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em" }}>
                Chaos Mode
              </h1>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#dc2626", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 20, padding: "3px 12px", letterSpacing: "0.04em" }}>
                ⚡ DISRUPTION TESTING
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Test the resilience of the maintenance plan when railway conditions suddenly change.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: running ? "#d97706" : done ? "#16a34a" : "#7a8898", display: "inline-block" }} />
              {running ? "Simulation Running" : done ? "Adaptation Complete" : "Ready"}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 284px", overflow: "hidden", padding: "0 28px 24px", gap: 14 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {/* Scenario selection */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Scenario Controls</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Select a disruption type, then run the simulation</div>
              </div>
              {done && (
                <button onClick={reset} style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7, padding: "6px 14px", cursor: "pointer" }}>
                  Reset
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
              {SCENARIOS.map(sc => (
                <DisruptionCard
                  key={sc.id}
                  sc={sc}
                  selected={selectedId === sc.id}
                  onClick={() => handleSelect(sc.id)}
                />
              ))}
            </div>

            <button
              onClick={runDisruption}
              disabled={running}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700,
                color: "#fff",
                background: running ? "#a8b4c0" : "linear-gradient(135deg, #dc2626, #d97706)",
                border: "none", borderRadius: 9, padding: "13px 0", cursor: running ? "not-allowed" : "pointer",
                width: "100%", letterSpacing: "0.02em",
                boxShadow: running ? "none" : "0 2px 12px rgba(220,38,38,0.3)",
                transition: "all 0.2s",
              }}
            >
              {running ? `⚡ Simulating disruption…` : "⚡ RUN DISRUPTION"}
            </button>
          </div>

          {/* Live resilience story */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>Live Resilience Story</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
                  {scenario.icon} {scenario.label} · {scenario.detail}
                </div>
              </div>
              {running && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 6, padding: "4px 12px" }}>
                  STAGE {Math.min(animStage + 1, 6)} / 6
                </div>
              )}
              {done && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 12px" }}>
                  ✓ COMPLETE
                </div>
              )}
            </div>

            {animStage >= 0 ? (
              <StagePipeline activeStage={animStage} scenario={scenario} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 12, textAlign: "center" as const }}>
                <div style={{ fontSize: 28, opacity: 0.25 }}>⚡</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "#7a8898" }}>Select a disruption and click <strong>Run Disruption</strong> to begin.</div>
              </div>
            )}
          </div>

          {/* Self-healing result */}
          {done && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 16 }}>
                Self-Healing Result
              </div>
              <SelfHealingResult scenario={scenario} visible={done} />
            </div>
          )}

          {/* Review drawer */}
          {showReview && done && (
            <ReviewDrawer scenario={scenario} onClose={() => setShowReview(false)} />
          )}
        </div>

        {/* Right panel */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #c4b5fd", borderTop: "3px solid #7c3aed", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(124,58,237,0.08)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0 }}>
            <ULabel>AI ADAPTATION PANEL</ULabel>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <RightPanel
              scenario={scenario}
              done={done}
              applied={applied}
              onApply={() => setApplied(v => !v)}
              onReview={() => setShowReview(v => !v)}
              showReview={showReview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
