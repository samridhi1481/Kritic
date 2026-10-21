import React, { useState, useRef, useEffect } from "react";

// ─── Types & Constants ────────────────────────────────────────────────────────

interface DeptInfo {
  id: string; label: string; dept: string; task: string; section: string;
  window: string; startH: number; endH: number; duration: string;
  color: string; bg: string; border: string;
  priority: string; crew: string; asset: string; deadline: string;
  deps: string; conflicts: string; coordOpportunity: string;
}

const DEPTS: DeptInfo[] = [
  {
    id: "track", label: "TRACK", dept: "Track Department",
    task: "Rail Replacement", section: "S12", window: "10:00–14:00",
    startH: 10, endH: 14, duration: "4 hours",
    color: "#2563eb", bg: "#eff4ff", border: "#bfcffd",
    priority: "HIGH", crew: "Crew C1 — Available", asset: "AST-T12",
    deadline: "Today 17:00", deps: "Track clear of revenue trains",
    conflicts: "Overlaps with Signal Maintenance 12:00–14:00",
    coordOpportunity: "Eligible for shared block",
  },
  {
    id: "signal", label: "SIGNALLING", dept: "Signalling Department",
    task: "Signal Maintenance", section: "S12", window: "12:00–14:00",
    startH: 12, endH: 14, duration: "2 hours",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    priority: "HIGH", crew: "Crew C3 — Available", asset: "AST-S08",
    deadline: "Today 18:00", deps: "Track access required",
    conflicts: "Overlaps with Rail Replacement 12:00–14:00\nOverlaps with OHE Inspection 13:00–14:00",
    coordOpportunity: "Eligible for shared block",
  },
  {
    id: "traction", label: "TRACTION / ELECTRICAL", dept: "Traction/Electrical Dept.",
    task: "OHE Inspection", section: "S12", window: "13:00–16:00",
    startH: 13, endH: 16, duration: "3 hours",
    color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",
    priority: "HIGH", crew: "Crew C5 — Available", asset: "AST-E04",
    deadline: "Today 19:00", deps: "Section de-energised for access",
    conflicts: "Overlaps with Signal Maintenance 13:00–14:00",
    coordOpportunity: "Eligible for shared block",
  },
];

const ENGINE_STAGES = [
  { num: 1, icon: "⊕", label: "Detect Overlap",         state: "Overlap detected — 3 windows on S12" },
  { num: 2, icon: "✓", label: "Check Compatibility",     state: "Compatibility evaluated" },
  { num: 3, icon: "↔", label: "Check Dependencies",      state: "No blocking dependencies" },
  { num: 4, icon: "🚂", label: "Check Train Conflicts",  state: "Train conflicts evaluated" },
  { num: 5, icon: "👷", label: "Check Resources",         state: "Resources evaluated" },
  { num: 6, icon: "🛡", label: "Validate Safety",         state: "Safety validated" },
  { num: 7, icon: "📅", label: "Validate Deadlines",      state: "Deadlines validated" },
  { num: 8, icon: "◆", label: "Score Opportunity",       state: "System-generated score: 94.7 / 100" },
  { num: 9, icon: "✦", label: "Recommend Shared Block",  state: "COORDINATION RECOMMENDED" },
];

const FLOW_STEPS = [
  "Maintenance Requests", "Detect Overlap", "Check Dependencies",
  "Check Train Conflicts", "Check Resources", "Validate Safety",
  "Validate Deadlines", "Create Shared Block", "Department Review", "Human Approval",
];
const FLOW_CURRENT = 8; // "Department Review" = index 8

const GEN_STAGES = [
  "Detecting overlapping maintenance requests",
  "Checking section compatibility",
  "Checking train movements",
  "Checking crew/resource availability",
  "Validating safety constraints",
  "Checking maintenance deadlines",
  "Calculating coordination opportunity",
  "Generating recommended shared block",
];

const GANTT_START = 10;
const GANTT_END   = 16;

function timeToPercent(h: number, m = 0): number {
  const total = (GANTT_END - GANTT_START) * 60;
  return Math.max(0, Math.min(100, ((h - GANTT_START) * 60 + m) / total * 100));
}

// ─── ULabel ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── HeroVisualization ────────────────────────────────────────────────────────

function HeroVisualization({ onDeptClick, selectedDept }: {
  onDeptClick: (id: string) => void; selectedDept: string | null;
}) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 4px rgba(13,24,41,0.06)" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {/* Dept cards column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "0 0 auto", width: 220 }}>
          {DEPTS.map(dept => (
            <div
              key={dept.id}
              onClick={() => onDeptClick(dept.id)}
              style={{
                backgroundColor: selectedDept === dept.id ? dept.bg : "#fff",
                border: `1.5px solid ${selectedDept === dept.id ? dept.color : dept.border}`,
                borderLeft: `4px solid ${dept.color}`,
                borderRadius: 8, padding: "12px 14px", cursor: "pointer",
                boxShadow: selectedDept === dept.id ? `0 0 0 2px ${dept.color}22` : "none",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: dept.color, marginBottom: 4 }}>{dept.label}</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#0d1829", marginBottom: 3 }}>{dept.task}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898" }}>Sec. {dept.section}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: dept.color }}>{dept.window}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Connector: lines to AI node */}
        <div style={{ display: "flex", alignItems: "center", width: 52, flexShrink: 0 }}>
          <svg width="52" height="160" viewBox="0 0 52 160" fill="none">
            {/* Three lines from each card center to the AI node center */}
            <line x1="0" y1="28"  x2="36" y2="80" stroke="#c8d0dc" strokeWidth="1.5" strokeDasharray="4 3"/>
            <line x1="0" y1="80"  x2="36" y2="80" stroke="#c8d0dc" strokeWidth="1.5" strokeDasharray="4 3"/>
            <line x1="0" y1="132" x2="36" y2="80" stroke="#c8d0dc" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle cx="40" cy="80" r="4" fill="#7c3aed"/>
            <path d="M44 80h8" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* AI Node */}
        <div style={{
          width: 180, flexShrink: 0, backgroundColor: "#f5f3ff",
          border: "2px solid #7c3aed", borderRadius: 10, padding: "16px 16px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 4px rgba(124,58,237,0.08)",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: 16, color: "#fff" }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.04em", textAlign: "center" as const, marginBottom: 10 }}>
            RAILTWIN AI
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.06em", marginTop: 2 }}>COORDINATION ENGINE</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
            {["Overlap detected", "Compatibility checked", "Constraints evaluated"].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#374151" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow to result */}
        <div style={{ display: "flex", alignItems: "center", width: 44, flexShrink: 0 }}>
          <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
            <path d="M4 20h28" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
            <path d="M26 13l10 7-10 7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Result: One Shared Maintenance Block */}
        <div style={{ flex: 1, backgroundColor: "#f0fdf4", border: "2px solid #16a34a", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#16a34a", marginBottom: 6 }}>ONE SHARED MAINTENANCE BLOCK</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#7a8898", marginBottom: 4 }}>SECTION S12</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#16a34a", letterSpacing: "-0.02em", marginBottom: 4 }}>11:30–15:30</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", marginBottom: 12 }}>Track + Signalling + Traction</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { k: "Train Conflicts",     v: "0",      c: "#16a34a" },
                { k: "Resource Conflicts",  v: "0",      c: "#16a34a" },
                { k: "Safety",              v: "Passed", c: "#16a34a" },
                { k: "Deadline",            v: "Passed", c: "#16a34a" },
              ].map(row => (
                <div key={row.k} style={{ backgroundColor: "#fff", borderRadius: 6, padding: "5px 8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "#86efac" }}>{row.k.toUpperCase()}</div>
                  <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: row.c }}>{row.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 10, borderTop: "1px solid #bbf7d0", paddingTop: 8 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#15803d" }}>3 maintenance activities coordinated into 1 shared block</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>System-generated recommendation · Human approval required</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gantt Timeline ───────────────────────────────────────────────────────────

const GANTT_HOURS = [10, 11, 12, 13, 14, 15, 16];
const GANTT_ROWS = [
  { id: "track",   label: "Track Dept",         task: "Rail Replacement",  color: "#2563eb", bg: "#dbeafe", startH: 10, endH: 14 },
  { id: "signal",  label: "Signalling Dept",     task: "Signal Maintenance",color: "#d97706", bg: "#fde68a", startH: 12, endH: 14 },
  { id: "traction",label: "Traction / Electrical",task: "OHE Inspection",  color: "#7c3aed", bg: "#ddd6fe", startH: 13, endH: 16 },
  { id: "ops",     label: "Operations",          task: "Train monitoring",   color: "#374151", bg: "#e5e7eb", startH: 10, endH: 16 },
];

function GanttTimeline({ onItemClick, selectedItem }: {
  onItemClick: (id: string) => void; selectedItem: string | null;
}) {
  const sharedStart = timeToPercent(11, 30);
  const sharedEnd   = timeToPercent(15, 30);

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>Cross-Department Maintenance Timeline</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>Section S12 · Click a block to inspect · Demo / Simulated values</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a8b4c0" }}>10:00 → 16:00</div>
      </div>

      {/* Overlap warning */}
      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13 }}>⚠</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#92400e", fontWeight: 500 }}>
          All three requests affect railway section S12. Overlapping maintenance windows compete for the same infrastructure.
        </span>
      </div>

      {/* Time axis */}
      <div style={{ display: "flex", marginLeft: 160, marginBottom: 4 }}>
        {GANTT_HOURS.map((h, i) => (
          <div key={h} style={{ flex: i < GANTT_HOURS.length - 1 ? 1 : 0, fontFamily: "var(--font-mono)", fontSize: 10, color: "#a8b4c0" }}>
            {`${h}:00`}
          </div>
        ))}
      </div>

      {/* Grid lines + rows */}
      <div style={{ position: "relative" }}>
        {/* Shared block highlight */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `calc(160px + ${sharedStart}% * (100% - 160px) / 100)`,
          width: `${sharedEnd - sharedStart}%`,
          backgroundColor: "rgba(22,163,74,0.06)", border: "1px dashed #bbf7d0",
          borderRadius: 4, zIndex: 0, pointerEvents: "none",
        }} />

        {GANTT_ROWS.map(row => {
          const left  = timeToPercent(row.startH);
          const right = timeToPercent(row.endH);
          const width = right - left;
          const isSelected = selectedItem === row.id;
          return (
            <div key={row.id} style={{ display: "flex", alignItems: "center", marginBottom: 8, position: "relative", zIndex: 1 }}>
              {/* Row label */}
              <div style={{ width: 156, flexShrink: 0, paddingRight: 12 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#374151" }}>{row.label}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#7a8898" }}>{row.task}</div>
              </div>
              {/* Track background */}
              <div style={{ flex: 1, height: 32, backgroundColor: "#f8fafc", borderRadius: 4, border: "1px solid #e8edf3", position: "relative", overflow: "hidden" }}>
                {/* Grid lines */}
                {GANTT_HOURS.slice(1, -1).map((h, i) => (
                  <div key={h} style={{ position: "absolute", left: `${timeToPercent(h)}%`, top: 0, bottom: 0, width: 1, backgroundColor: "#e8edf3" }} />
                ))}
                {/* Maintenance bar */}
                {row.id !== "ops" ? (
                  <div
                    onClick={() => onItemClick(row.id)}
                    style={{
                      position: "absolute", top: 4, bottom: 4,
                      left: `${left}%`, width: `${width}%`,
                      backgroundColor: isSelected ? row.color : row.bg,
                      border: `1.5px solid ${row.color}`,
                      borderRadius: 4, cursor: "pointer",
                      display: "flex", alignItems: "center", paddingLeft: 8,
                      boxShadow: isSelected ? `0 0 0 2px ${row.color}44` : "none",
                      transition: "all 0.15s", zIndex: 2,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: isSelected ? "#fff" : row.color, whiteSpace: "nowrap" as const }}>
                      {row.startH}:00–{row.endH}:00
                    </span>
                  </div>
                ) : (
                  /* Operations train line */
                  <div style={{ position: "absolute", top: 4, bottom: 4, left: "2%", right: "2%", backgroundColor: "#f0f2f5", borderRadius: 4, display: "flex", alignItems: "center", gap: 12, paddingLeft: 8 }}>
                    {[10.5, 11.5, 12.5, 13.5, 14.5, 15.2].map(h => (
                      <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#7a8898" }}>🚂</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Shared block label */}
        <div style={{ marginLeft: 160, position: "relative", height: 20, marginTop: 4 }}>
          <div style={{
            position: "absolute", left: `${sharedStart}%`, width: `${sharedEnd - sharedStart}%`,
            backgroundColor: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#16a34a" }}>RECOMMENDED 11:30–15:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Coord Engine ─────────────────────────────────────────────────────────────

function CoordEngine() {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 3 }}>RailTwin AI Coordination Engine</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>Constraint-aware coordination before final schedule optimization · Decision support only</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 8, alignItems: "start" }}>
        {ENGINE_STAGES.map((stage, i) => (
          <div key={stage.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" as const }}>
            {/* Connector */}
            {i < ENGINE_STAGES.length - 1 && (
              <div style={{ position: "absolute", right: "-50%", top: 20, width: "100%", height: 2, backgroundColor: "#e8edf3", zIndex: 0 }} />
            )}
            <div style={{
              width: 40, height: 40, borderRadius: 10, zIndex: 1,
              backgroundColor: stage.num === 9 ? "#f0fdf4" : "#f5f3ff",
              border: `1.5px solid ${stage.num === 9 ? "#16a34a" : "#c4b5fd"}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              boxShadow: stage.num === 9 ? "0 0 0 3px rgba(22,163,74,0.15)" : "none",
            }}>
              {stage.icon}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#374151", textAlign: "center" as const, marginTop: 6, lineHeight: 1.3 }}>{stage.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: stage.num === 9 ? "#16a34a" : "#7c3aed", textAlign: "center" as const, marginTop: 3, lineHeight: 1.3 }}>{stage.state}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#16a34a", flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#15803d" }}>COORDINATION RECOMMENDED</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", marginLeft: 8 }}>
          Overlap detected · Compatibility evaluated · Train conflicts evaluated · Resources evaluated · Safety validated · Deadlines validated
        </span>
      </div>
    </div>
  );
}

// ─── Coordination Flow Bar ─────────────────────────────────────────────────────

function CoordFlowBar() {
  return (
    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 9, padding: "12px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" as const }}>
        {FLOW_STEPS.map((step, i) => {
          const isCurrent = i === FLOW_CURRENT;
          const isDone    = i < FLOW_CURRENT;
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: isCurrent ? 700 : 500, whiteSpace: "nowrap" as const,
                color: isCurrent ? "#2563eb" : isDone ? "#16a34a" : "#a8b4c0",
                backgroundColor: isCurrent ? "#eff4ff" : isDone ? "transparent" : "transparent",
                border: isCurrent ? "1px solid #bfcffd" : "none",
                borderRadius: 20, padding: isCurrent ? "3px 10px" : "3px 4px",
              }}>
                {isDone && <span style={{ marginRight: 3, fontSize: 9 }}>✓</span>}
                {step}
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <div style={{ margin: "0 4px", color: isDone ? "#16a34a" : "#dde2ea", fontSize: 10 }}>→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared Window Panel ───────────────────────────────────────────────────────

function SharedWindowPanel() {
  return (
    <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #16a34a", borderRadius: 10, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 4 }}>SHARED MAINTENANCE WINDOW RECOMMENDED</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: "#0d1829", letterSpacing: "-0.01em" }}>11:30 – 15:30</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", marginTop: 3 }}>Section S12 · Track + Signalling + Traction</div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#86efac", marginBottom: 3 }}>SYSTEM-GENERATED COORDINATION OPPORTUNITY SCORE</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 28, fontWeight: 700, color: "#16a34a" }}>94.7<span style={{ fontSize: 14, fontWeight: 400, color: "#7a8898", marginLeft: 3 }}>/100</span></div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#7a8898" }}>Recommended, not automatically scheduled</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { k: "TRAIN CONFLICTS",    v: "0",      c: "#16a34a", bg: "#fff" },
          { k: "RESOURCE CONFLICTS", v: "0",      c: "#16a34a", bg: "#fff" },
          { k: "SAFETY CONSTRAINTS", v: "PASSED", c: "#16a34a", bg: "#fff" },
          { k: "DEADLINE CONSTRAINTS",v: "PASSED",c: "#16a34a", bg: "#fff" },
        ].map(row => (
          <div key={row.k} style={{ backgroundColor: row.bg, border: "1px solid #bbf7d0", borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "#86efac", marginBottom: 3 }}>{row.k}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, color: row.c }}>{row.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Predicted Train Delay: </span>
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>8 min</span>
        </div>
        <div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Departments: </span>
          <span style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#374151" }}>Track + Signalling + Traction</span>
        </div>
      </div>
      <div style={{ marginTop: 12, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 12px", display: "inline-block" }}>
        Decision Support — Human Approval Required
      </div>
    </div>
  );
}

// ─── Why This Coordination ────────────────────────────────────────────────────

function WhyPanel() {
  const checklist = [
    "Compatible maintenance activities affect the same section",
    "Required crews are available",
    "Required resources are available",
    "No train conflict predicted",
    "Safety constraints passed",
    "Maintenance deadlines remain satisfied",
    "Shared access reduces repeated section occupation",
    "Coordination reduces operational disruption",
  ];
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>Why This Coordination?</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginBottom: 14 }}>System-generated rationale — not a guarantee of outcome</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
        {checklist.map(item => (
          <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7, padding: "12px 14px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
          RailTwin AI identified compatible maintenance activities affecting the same section and recommends coordinating them under one shared block to reduce repeated track access, scheduling conflicts and operational disruption.
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#7c3aed", marginTop: 8 }}>Decision Support — Human Approval Required</div>
      </div>
    </div>
  );
}

// ─── Transformation Visual ────────────────────────────────────────────────────

function TransformationVisual() {
  return (
    <div style={{ backgroundColor: "#fff", border: "1.5px solid #7c3aed", borderTop: "3px solid #7c3aed", borderRadius: 10, padding: "22px 24px", boxShadow: "0 1px 6px rgba(124,58,237,0.08)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>From Independent Requests to One Coordinated Block</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 18 }}>Demo / Simulated values · Independent requests → RailTwin AI analysis → Shared maintenance block</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 12, alignItems: "center" }}>
        {/* BEFORE */}
        <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 9, padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 12 }}>BEFORE — INDEPENDENT</div>
          {[
            { dept: "TRACK",       window: "10:00", end: "14:00", c: "#2563eb", bg: "#dbeafe" },
            { dept: "SIGNALLING",  window: "12:00", end: "14:00", c: "#d97706", bg: "#fde68a" },
            { dept: "TRACTION",    window: "13:00", end: "16:00", c: "#7c3aed", bg: "#ddd6fe" },
          ].map(row => (
            <div key={row.dept} style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: row.c, marginBottom: 3 }}>{row.dept}</div>
              <div style={{ height: 22, backgroundColor: "#fff", borderRadius: 4, border: `1px solid ${row.c}`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "2px", backgroundColor: row.bg, borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: row.c }}>{row.window} ——— {row.end}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "#dc2626", marginTop: 4 }}>3 overlapping windows · Repeated section access</div>
        </div>

        {/* Arrow 1 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f5f3ff", border: "1.5px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h11M10 5l8 5-8 5" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, color: "#7c3aed", textAlign: "center" as const }}>RAILTWIN AI<br/>Compatibility +<br/>Constraint Analysis</div>
        </div>

        {/* AFTER */}
        <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #16a34a", borderRadius: 9, padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 12 }}>AFTER — COORDINATED</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#16a34a", marginBottom: 3 }}>SHARED BLOCK</div>
            <div style={{ height: 50, backgroundColor: "#dcfce7", border: "2px solid #16a34a", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#15803d" }}>11:30 ——— 15:30</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 600, color: "#16a34a", marginTop: 2 }}>TRACK · SIGNALLING · TRACTION</div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "#15803d", fontWeight: 600 }}>3 maintenance activities coordinated into 1 shared block</div>
        </div>

        {/* Arrow 2 */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <path d="M2 10h20M16 4l10 6-10 6" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Central statement */}
        <div style={{ backgroundColor: "#0d1829", borderRadius: 9, padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.5, marginBottom: 8 }}>
            INDEPENDENT REQUESTS<br/>→<br/>COORDINATED MAINTENANCE
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>Demo / Simulated · Decision support only</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#4ade80", fontWeight: 600, marginTop: 6 }}>Human Approval Required</div>
        </div>
      </div>
    </div>
  );
}

// ─── Before / After Panels ────────────────────────────────────────────────────

function BeforeAfterPanels() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {/* Before */}
      <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "18px 20px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 12 }}>BEFORE — INDEPENDENT DEPARTMENT PLANNING</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 10 }}>Demo / Simulated values</div>
        {[
          "Track block 10:00–14:00",
          "Signalling block 12:00–14:00",
          "Traction block 13:00–16:00",
          "Separate coordination per department",
          "3 overlapping work windows",
          "Higher potential operational disruption",
          "Repeated infrastructure access",
        ].map(item => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 1.5l4 4M5.5 1.5l-4 4" stroke="#dc2626" strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151" }}>{item}</span>
          </div>
        ))}
      </div>
      {/* After */}
      <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #16a34a", borderRadius: 10, padding: "18px 20px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 12 }}>AFTER — RAILTWIN AI COORDINATED PLANNING</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginBottom: 10 }}>Recommended — not guaranteed · Human approval required</div>
        {[
          "One shared S12 block 11:30–15:30",
          "Track + Signalling + Traction",
          "0 train conflicts",
          "Resources available",
          "Safety constraints passed",
          "Deadlines satisfied",
          "Predicted reduction in repeated access",
        ].map(item => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 3.5l1.5 1.5 3-3" stroke="#16a34a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dept Collaboration Status ────────────────────────────────────────────────

const COLLAB_DEPTS = [
  { label: "TRACK",      work: "Rail Replacement",    status: "READY", crew: "AVAILABLE", color: "#2563eb", bg: "#eff4ff", border: "#bfcffd" },
  { label: "SIGNALLING", work: "Signal Maintenance",  status: "READY", crew: "AVAILABLE", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { label: "TRACTION",   work: "OHE Inspection",      status: "READY", crew: "AVAILABLE", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  { label: "OPERATIONS", work: "Train Impact Review", status: "REVIEWED", crew: "—",      color: "#374151", bg: "#f8fafc", border: "#dde2ea" },
];

function DeptCollabStatus() {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 14 }}>Department Collaboration Status</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {COLLAB_DEPTS.map(dept => (
          <div key={dept.label} style={{ backgroundColor: dept.bg, border: `1.5px solid ${dept.border}`, borderRadius: 9, padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: dept.color, marginBottom: 8 }}>{dept.label}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", marginBottom: 10, lineHeight: 1.3 }}>{dept.work}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>STATUS</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 8px" }}>{dept.status}</span>
              </div>
              {dept.crew !== "—" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>CREW</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "#16a34a" }}>{dept.crew}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dept Detail Drawer ────────────────────────────────────────────────────────

function DeptDetailDrawer({ dept, onClose }: { dept: DeptInfo; onClose: () => void }) {
  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${dept.border}`, borderTop: `3px solid ${dept.color}`, borderRadius: 10, padding: "20px 22px", boxShadow: "0 2px 8px rgba(13,24,41,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: dept.color, marginBottom: 4 }}>DEPARTMENT DETAILS · {dept.label}</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, color: "#0d1829" }}>{dept.task}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { k: "Department",   v: dept.dept },
          { k: "Task",         v: dept.task },
          { k: "Asset",        v: dept.asset },
          { k: "Section",      v: dept.section },
          { k: "Duration",     v: dept.duration },
          { k: "Priority",     v: dept.priority },
          { k: "Deadline",     v: dept.deadline },
          { k: "Required Crew",v: dept.crew },
          { k: "Coord. Opportunity", v: dept.coordOpportunity },
        ].map(row => (
          <div key={row.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", marginBottom: 3 }}>{row.k.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: "#0d1829" }}>{row.v}</div>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "10px 14px" }}>
        <ULabel color="#d97706">DEPENDENCIES & CONFLICTS NOTED</ULabel>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{dept.deps}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#d97706", marginTop: 4 }}>{dept.conflicts}</div>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#7a8898", marginTop: 10, fontStyle: "italic" }}>
        Current Status: READY · Recommended Action: {dept.coordOpportunity}
      </div>
    </div>
  );
}

// ─── Timeline Detail Drawer ───────────────────────────────────────────────────

function TimelineDetailDrawer({ row, onClose }: { row: typeof GANTT_ROWS[0]; onClose: () => void }) {
  const dept = DEPTS.find(d => d.id === row.id);
  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${row.color}22`, borderTop: `3px solid ${row.color}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 6px rgba(13,24,41,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>Timeline Block — {row.label}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { k: "Department",   v: row.label },
          { k: "Task",         v: row.task },
          { k: "Asset",        v: dept?.asset ?? "—" },
          { k: "Section",      v: "S12" },
          { k: "Duration",     v: dept?.duration ?? "—" },
          { k: "Priority",     v: "HIGH" },
          { k: "Deadline",     v: dept?.deadline ?? "—" },
          { k: "Required Resources", v: dept?.crew ?? "Crew + Equipment" },
          { k: "Dependencies", v: dept?.deps ?? "—" },
          { k: "Conflicts",    v: dept?.conflicts ?? "None noted" },
          { k: "Window",       v: `${row.startH}:00–${row.endH}:00` },
          { k: "Coord. Opportunity", v: "Eligible for shared block" },
        ].map(row2 => (
          <div key={row2.k} style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0", marginBottom: 2 }}>{row2.k.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", lineHeight: 1.3 }}>{row2.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Conflicts Modal ──────────────────────────────────────────────────────────

function ConflictsModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(13,24,41,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 12, padding: "28px 30px", width: 560, boxShadow: "0 20px 60px rgba(13,24,41,0.2)", border: "1px solid #dde2ea", maxHeight: "85vh", overflowY: "auto" as const }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 17, fontWeight: 700, color: "#0d1829" }}>Conflict Review</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 22 }}>×</button>
        </div>

        {/* Resolved conflicts */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#16a34a", marginBottom: 10 }}>RESOLVED CONFLICTS</div>
          {[
            { title: "Train-maintenance overlap",    desc: "Train movements adjusted around coordinated window 11:30–15:30" },
            { title: "Resource overlap",             desc: "Crew scheduling consolidated — Crews C1, C3, C5 confirmed available" },
            { title: "Department scheduling overlap",desc: "Three independent windows merged into one shared coordinated block" },
          ].map(c => (
            <div key={c.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2.5 2.5 4-4" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#15803d" }}>{c.title}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", marginTop: 2 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Remaining conflicts */}
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#374151", marginBottom: 10 }}>REMAINING CONFLICTS</div>
          <div style={{ padding: "14px 16px", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 7 }}>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No remaining blocking conflicts</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>0 unresolved blocking conflicts · All identified overlaps have been evaluated and addressed in the coordinated plan recommendation.</div>
          </div>
        </div>

        <div style={{ marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", fontStyle: "italic" }}>
          RailTwin AI evaluates and resolves constraints — it does not autonomously authorize railway maintenance.
        </div>
      </div>
    </div>
  );
}

// ─── Generate Plan Result ─────────────────────────────────────────────────────

function GenerateResult() {
  return (
    <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #16a34a", borderRadius: 9, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5 6.5-7" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#15803d" }}>Coordinated S12 Plan Ready — Recommendation Ready</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#374151", marginTop: 2 }}>
            11:30–15:30 · Track + Signalling + Traction · 0 Train Conflicts · 0 Resource Conflicts · Safety Passed · Deadline Passed
          </div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "4px 12px", flexShrink: 0 }}>
        Human Approval Required
      </div>
    </div>
  );
}

// ─── Independent Dept Request Cards ──────────────────────────────────────────

function IndepRequestCards() {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829", marginBottom: 4 }}>Independent Department Requests</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginBottom: 14 }}>
        Three departments independently requested maintenance windows affecting the same railway section. Demo / Simulated values.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        {DEPTS.map(dept => (
          <div key={dept.id} style={{ backgroundColor: dept.bg, border: `1.5px solid ${dept.border}`, borderRadius: 9, padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: dept.color, marginBottom: 6 }}>{dept.label}</div>
            <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#0d1829", marginBottom: 3 }}>{dept.task}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: dept.color, marginBottom: 6 }}>{dept.window}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>DURATION</div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#374151" }}>{dept.duration}</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>SECTION</div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 12, fontWeight: 700, color: "#374151" }}>{dept.section}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7 }}>
        <span style={{ fontSize: 14 }}>⚠</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#92400e" }}>
          All three requests affect railway section S12. Overlapping maintenance windows require coordination.
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface CoordinationHubProps {
  onNavigate?: (id: string) => void;
}

export default function CoordinationHub({ onNavigate }: CoordinationHubProps) {
  const [selectedDept, setSelectedDept]         = useState<string | null>(null);
  const [selectedTimelineItem, setTimelineItem] = useState<string | null>(null);
  const [generateState, setGenerateState]       = useState<"idle" | "running" | "done">("idle");
  const [generateStageIdx, setGenerateStageIdx] = useState(0);
  const [showConflicts, setShowConflicts]       = useState(false);
  const [showRequests, setShowRequests]         = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDeptClick = (id: string) => {
    setSelectedDept(prev => prev === id ? null : id);
    setTimelineItem(null);
  };

  const handleTimelineClick = (id: string) => {
    setTimelineItem(prev => prev === id ? null : id);
    setSelectedDept(null);
  };

  const handleGenerate = () => {
    if (generateState === "running") return;
    setGenerateState("running");
    setGenerateStageIdx(0);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      setGenerateStageIdx(idx);
      if (idx >= GEN_STAGES.length - 1) {
        clearInterval(intervalRef.current!);
        setTimeout(() => setGenerateState("done"), 600);
      }
    }, 480);
  };

  const handleSendForApproval = () => {
    onNavigate?.("schedule-review");
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const selectedDeptData = DEPTS.find(d => d.id === selectedDept);
  const selectedTimelineData = GANTT_ROWS.find(r => r.id === selectedTimelineItem);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 28px 14px", flexShrink: 0, borderBottom: "1px solid #e8edf3", backgroundColor: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em" }}>
                Coordination Hub
              </h1>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20, padding: "2px 10px" }}>DEMO SCENARIO</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 20, padding: "2px 10px" }}>SIMULATED RAILWAY NETWORK</span>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", margin: 0 }}>
              Cross-Department Maintenance Coordination
            </p>
          </div>
          {/* Section S12 status bar — compact */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "8px 16px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0" }}>SECTION</div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>S12</div>
            </div>
            <div style={{ width: 1, height: 28, backgroundColor: "#dde2ea" }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "3px 10px" }}>COORDINATION RECOMMENDED</div>
            {[
              { k: "Traffic", v: "HIGH", c: "#dc2626" },
              { k: "Risk",    v: "HIGH", c: "#dc2626" },
              { k: "Active Trains", v: "4", c: "#2563eb" },
              { k: "Pending Maint.", v: "3", c: "#d97706" },
            ].map(item => (
              <div key={item.k} style={{ paddingLeft: 10, borderLeft: "1px solid #e8edf3" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "#a8b4c0" }}>{item.k.toUpperCase()}</div>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: item.c }}>{item.v}</div>
              </div>
            ))}
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "#a8b4c0", paddingLeft: 10, borderLeft: "1px solid #e8edf3" }}>Demo Scenario<br/>Simulated Railway Network</div>
          </div>
        </div>

        {/* USP statement */}
        <div style={{ marginTop: 12, padding: "10px 14px", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7 }}>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 2 }}>
            RailTwin AI coordinates maintenance across departments before optimizing the final schedule.
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151" }}>
            Instead of planning Track, Signalling and Traction work independently, RailTwin AI identifies compatible work affecting the same railway section, evaluates operational and safety constraints, and recommends a shared maintenance window for human approval.
          </div>
        </div>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero visualization */}
        <HeroVisualization onDeptClick={handleDeptClick} selectedDept={selectedDept} />

        {/* Dept detail drawer (inline) */}
        {selectedDeptData && (
          <DeptDetailDrawer dept={selectedDeptData} onClose={() => setSelectedDept(null)} />
        )}

        {/* Generate Coordinated Plan — primary action */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, padding: "18px 22px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: generateState !== "idle" ? 14 : 0 }}>
            <button
              onClick={handleGenerate}
              disabled={generateState === "running"}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em",
                color: generateState === "done" ? "#16a34a" : "#fff",
                backgroundColor: generateState === "running" ? "#a8b4c0" : generateState === "done" ? "#f0fdf4" : "#0d1829",
                border: generateState === "done" ? "1.5px solid #bbf7d0" : "none",
                borderRadius: 9, padding: "12px 28px", cursor: generateState === "running" ? "not-allowed" : "pointer",
                boxShadow: generateState === "done" || generateState === "running" ? "none" : "0 2px 10px rgba(13,24,41,0.25)",
                transition: "all 0.2s", flexShrink: 0,
              }}
            >
              {generateState === "running" ? `Processing… stage ${generateStageIdx + 1}/${GEN_STAGES.length}` : generateState === "done" ? "✓ Coordinated Plan Ready" : "Generate Coordinated Plan"}
            </button>

            {generateState === "running" && (
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", marginBottom: 5 }}>{GEN_STAGES[generateStageIdx]}</div>
                <div style={{ height: 6, backgroundColor: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${((generateStageIdx + 1) / GEN_STAGES.length) * 100}%`, backgroundColor: "#7c3aed", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
            )}

            {/* Action buttons row */}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
              <button
                onClick={() => setShowConflicts(true)}
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}
              >View Conflicts</button>
              <button
                onClick={() => setShowRequests(v => !v)}
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}
              >{showRequests ? "Close Requests" : "Review Department Requests"}</button>
              <button
                onClick={handleSendForApproval}
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: "#16a34a", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" }}
              >Send for Approval →</button>
            </div>
          </div>

          {generateState === "done" && <GenerateResult />}
        </div>

        {/* Request review panel */}
        {showRequests && <IndepRequestCards />}

        {/* Gantt timeline */}
        <GanttTimeline onItemClick={handleTimelineClick} selectedItem={selectedTimelineItem} />

        {/* Timeline detail drawer */}
        {selectedTimelineData && (
          <TimelineDetailDrawer row={selectedTimelineData} onClose={() => setTimelineItem(null)} />
        )}

        {/* AI Engine */}
        <CoordEngine />

        {/* Coordination Flow */}
        <CoordFlowBar />

        {/* Shared window + Why this coordination */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
          <SharedWindowPanel />
          <WhyPanel />
        </div>

        {/* Transformation visual */}
        <TransformationVisual />

        {/* Before / After */}
        <BeforeAfterPanels />

        {/* Dept collaboration status */}
        <DeptCollabStatus />

        {/* Footer note */}
        <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", flexShrink: 0, paddingTop: 1 }}>NOTE</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", lineHeight: 1.6 }}>
            All values shown are simulated from a Demo Scenario on a Simulated Railway Network. RailTwin AI provides decision support — it does not autonomously control, authorize, or execute railway maintenance. All coordination recommendations require human review and approval before operational implementation.
          </span>
        </div>
      </div>

      {/* Conflicts modal */}
      {showConflicts && <ConflictsModal onClose={() => setShowConflicts(false)} />}
    </div>
  );
}
