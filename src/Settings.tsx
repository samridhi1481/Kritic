import { useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type OptMode  = "Balanced" | "Safety First" | "Maximum Maintenance" | "Minimum Disruption";
type TrafficModel = "Realistic" | "Conservative" | "Peak Load";
type NetSize  = "Small" | "Medium" | "Large";
type TrainDensity = "Low" | "Medium" | "High";
type MaintLoad = "Low" | "Medium" | "High";
type ResAvail  = "Limited" | "Normal" | "Abundant";

interface SettingsState {
  weights: { safety: number; maintenance: number; coordination: number; trainDisruption: number; blockReduction: number };
  optMode: OptMode;
  safetyConstraints: boolean;
  preventTrainConflicts: boolean;
  enforceCrew: boolean;
  enforceDeadlines: boolean;
  deptCompatibility: boolean;
  timeStep: number;
  simDuration: number;
  trafficModel: TrafficModel;
  autoRecalculate: boolean;
  networkSize: NetSize;
  trainDensity: TrainDensity;
  maintLoad: MaintLoad;
  resAvail: ResAvail;
  emergencyEvents: boolean;
  selectedUser: string | null;
}

const DEFAULTS: SettingsState = {
  weights: { safety: 35, maintenance: 25, coordination: 15, trainDisruption: 15, blockReduction: 10 },
  optMode: "Balanced",
  safetyConstraints: true,
  preventTrainConflicts: true,
  enforceCrew: true,
  enforceDeadlines: true,
  deptCompatibility: true,
  timeStep: 5,
  simDuration: 24,
  trafficModel: "Realistic",
  autoRecalculate: true,
  networkSize: "Medium",
  trainDensity: "High",
  maintLoad: "Medium",
  resAvail: "Normal",
  emergencyEvents: true,
  selectedUser: null,
};

const OPT_MODES: OptMode[] = ["Balanced", "Safety First", "Maximum Maintenance", "Minimum Disruption"];

const USERS = [
  { id: "planner",    name: "A. Kowalski",        role: "Planner",                access: "Full Access",                   permissions: ["Optimization", "Schedule", "Simulation", "Scenarios", "Audit", "Settings", "Asset Intelligence"] },
  { id: "manager",   name: "M. Brennan",          role: "Maintenance Manager",    access: "Maintenance + Schedule",        permissions: ["Maintenance", "Schedule", "Asset Intelligence", "Audit (read-only)"] },
  { id: "controller",name: "P. Nakamura",         role: "Operations Controller",  access: "Schedule + Simulation",         permissions: ["Schedule", "Simulation", "Network Twin (read-only)", "Overview"] },
  { id: "viewer",    name: "L. Sørensen",         role: "Viewer",                 access: "Read Only",                     permissions: ["Overview", "Analytics", "Audit (read-only)"] },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ULabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: color ?? "#7a8898", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function SectionCard({ title, icon, children, accent }: { title: string; icon: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dde2ea", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf3", display: "flex", alignItems: "center", gap: 10, borderTop: `3px solid ${accent ?? "#dde2ea"}` }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, color: "#0d1829" }}>{title}</div>
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</div>
        {desc && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 1 }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", padding: 0,
          backgroundColor: on ? "#16a34a" : "#dde2ea", transition: "background 0.2s", position: "relative", flexShrink: 0,
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
          position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: on ? "#16a34a" : "#a8b4c0", width: 24, textAlign: "right" as const }}>
        {on ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ─── Slider ────────────────────────────────────────────────────────────────────

function WeightSlider({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        {/* Filled track */}
        <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", height: 6, backgroundColor: "#f0f2f5", borderRadius: 3, pointerEvents: "none" }}>
          <div style={{ height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 3, transition: "width 0.08s" }} />
        </div>
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "relative", width: "100%", height: 6, margin: 0, padding: 0, zIndex: 1,
            accentColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Select Row ────────────────────────────────────────────────────────────────

function SelectRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151", flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: 6, padding: "4px 12px",
              color: value === opt ? "#fff" : "#7a8898",
              backgroundColor: value === opt ? "#2563eb" : "#f8fafc",
              border: `1px solid ${value === opt ? "#2563eb" : "#dde2ea"}`,
              transition: "all 0.15s",
            }}
          >{opt}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, color, bg, border, icon, onClose }: {
  message: string; color: string; bg: string; border: string; icon: React.ReactNode; onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", backgroundColor: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "14px 20px", boxShadow: "0 8px 28px rgba(13,24,41,0.14)", display: "flex", alignItems: "center", gap: 12, zIndex: 300, minWidth: 340, whiteSpace: "nowrap" as const }}>
      {icon}
      <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600, color }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1, marginLeft: "auto" }}>×</button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [s, setS] = useState<SettingsState>({ ...DEFAULTS, weights: { ...DEFAULTS.weights } });
  const [toast, setToast] = useState<null | "saved" | "reset" | "scenario">(null);
  const [dirty, setDirty] = useState(false);

  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setS(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const updateWeight = useCallback((key: keyof SettingsState["weights"], value: number) => {
    setS(prev => ({ ...prev, weights: { ...prev.weights, [key]: value } }));
    setDirty(true);
  }, []);

  const handleSave = () => {
    setDirty(false);
    setToast("saved");
    setTimeout(() => setToast(null), 3500);
  };

  const handleReset = () => {
    setS({ ...DEFAULTS, weights: { ...DEFAULTS.weights } });
    setDirty(false);
    setToast("reset");
    setTimeout(() => setToast(null), 3000);
  };

  const handleGenerate = () => {
    setToast("scenario");
    setTimeout(() => setToast(null), 3500);
  };

  const weightTotal = Object.values(s.weights).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "22px 28px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: 0, letterSpacing: "-0.02em", marginBottom: 5 }}>
              System Settings
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Configure optimization, safety, simulation, data and user settings for RailTwin AI.
            </p>
          </div>
          {dirty && (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "5px 14px" }}>
              ● Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 28px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* ── SECTION 1: Optimization ── */}
          <SectionCard title="Optimization" icon="◆" accent="#7c3aed">
            {/* Mode */}
            <div>
              <ULabel color="#7c3aed">OPTIMIZATION MODE</ULabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {OPT_MODES.map(mode => (
                  <button
                    key={mode}
                    onClick={() => update("optMode", mode)}
                    style={{
                      fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      borderRadius: 8, padding: "10px 12px", textAlign: "left" as const,
                      color: s.optMode === mode ? "#7c3aed" : "#374151",
                      backgroundColor: s.optMode === mode ? "#f5f3ff" : "#f8fafc",
                      border: `1.5px solid ${s.optMode === mode ? "#c4b5fd" : "#e8edf3"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.optMode === mode && <span style={{ marginRight: 6 }}>◆</span>}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Weights */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <ULabel color="#7c3aed">OBJECTIVE WEIGHTS</ULabel>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: Math.abs(weightTotal - 100) < 1 ? "#16a34a" : "#d97706" }}>
                  Total: {weightTotal}%
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <WeightSlider label="Safety"             value={s.weights.safety}          color="#dc2626" onChange={v => updateWeight("safety", v)} />
                <WeightSlider label="Maintenance Priority" value={s.weights.maintenance}     color="#d97706" onChange={v => updateWeight("maintenance", v)} />
                <WeightSlider label="Coordination"       value={s.weights.coordination}     color="#2563eb" onChange={v => updateWeight("coordination", v)} />
                <WeightSlider label="Train Disruption"   value={s.weights.trainDisruption}  color="#7c3aed" onChange={v => updateWeight("trainDisruption", v)} />
                <WeightSlider label="Block Reduction"    value={s.weights.blockReduction}   color="#16a34a" onChange={v => updateWeight("blockReduction", v)} />
              </div>
            </div>
          </SectionCard>

          {/* ── SECTION 2: Safety Constraints ── */}
          <SectionCard title="Safety Constraints" icon="🛡" accent="#dc2626">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toggle on={s.safetyConstraints}     onChange={v => update("safetyConstraints", v)}     label="Safety Constraints"          desc="Enforce all mandatory safety rules during optimization" />
              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.preventTrainConflicts} onChange={v => update("preventTrainConflicts", v)} label="Prevent Train Conflicts"       desc="Block any plan that creates train path overlaps" />
              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.enforceCrew}           onChange={v => update("enforceCrew", v)}           label="Enforce Crew Availability"    desc="Only schedule blocks when certified crew is present" />
              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.enforceDeadlines}      onChange={v => update("enforceDeadlines", v)}      label="Enforce Maintenance Deadlines" desc="Reject plans that miss scheduled maintenance due dates" />
              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.deptCompatibility}     onChange={v => update("deptCompatibility", v)}     label="Department Compatibility"     desc="Ensure all activities comply with departmental rules" />
            </div>
            {/* Warning if safety off */}
            {!s.safetyConstraints && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚠</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>
                  Disabling safety constraints may create operationally unsafe plans. Use only for testing.
                </span>
              </div>
            )}
          </SectionCard>

          {/* ── SECTION 3: Simulation ── */}
          <SectionCard title="Simulation" icon="⚙" accent="#2563eb">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Time step */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151" }}>Time Step</span>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#2563eb" }}>{s.timeStep} min</span>
                </div>
                <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", height: 6, backgroundColor: "#f0f2f5", borderRadius: 3, pointerEvents: "none" }}>
                    <div style={{ height: "100%", width: `${((s.timeStep - 1) / 29) * 100}%`, backgroundColor: "#2563eb", borderRadius: 3 }} />
                  </div>
                  <input type="range" min={1} max={30} value={s.timeStep} onChange={e => update("timeStep", Number(e.target.value))}
                    style={{ position: "relative", width: "100%", height: 6, margin: 0, zIndex: 1, accentColor: "#2563eb" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#a8b4c0" }}>1 min</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#a8b4c0" }}>30 min</span>
                </div>
              </div>

              {/* Sim duration */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151" }}>Simulation Duration</span>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#2563eb" }}>{s.simDuration} hrs</span>
                </div>
                <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", height: 6, backgroundColor: "#f0f2f5", borderRadius: 3, pointerEvents: "none" }}>
                    <div style={{ height: "100%", width: `${((s.simDuration - 1) / 47) * 100}%`, backgroundColor: "#2563eb", borderRadius: 3 }} />
                  </div>
                  <input type="range" min={1} max={48} value={s.simDuration} onChange={e => update("simDuration", Number(e.target.value))}
                    style={{ position: "relative", width: "100%", height: 6, margin: 0, zIndex: 1, accentColor: "#2563eb" }} />
                </div>
              </div>

              {/* Traffic model */}
              <SelectRow<TrafficModel>
                label="Traffic Model"
                value={s.trafficModel}
                options={["Realistic", "Conservative", "Peak Load"]}
                onChange={v => update("trafficModel", v)}
              />

              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.autoRecalculate} onChange={v => update("autoRecalculate", v)} label="Auto-recalculate after disruption" desc="Re-run optimization when a live disruption is detected" />
            </div>
          </SectionCard>

          {/* ── SECTION 4: Data & Scenario Generation ── */}
          <SectionCard title="Data & Scenario Generation" icon="🗄" accent="#d97706">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SelectRow<NetSize>      label="Network Size"         value={s.networkSize}  options={["Small", "Medium", "Large"]}             onChange={v => update("networkSize", v)} />
              <SelectRow<TrainDensity> label="Train Density"        value={s.trainDensity} options={["Low", "Medium", "High"]}                onChange={v => update("trainDensity", v)} />
              <SelectRow<MaintLoad>   label="Maintenance Load"     value={s.maintLoad}    options={["Low", "Medium", "High"]}                onChange={v => update("maintLoad", v)} />
              <SelectRow<ResAvail>    label="Resource Availability" value={s.resAvail}     options={["Limited", "Normal", "Abundant"]}        onChange={v => update("resAvail", v)} />
              <div style={{ height: 1, backgroundColor: "#f0f2f5" }} />
              <Toggle on={s.emergencyEvents} onChange={v => update("emergencyEvents", v)} label="Emergency Events" desc="Include random emergency disruptions in generated scenarios" />
            </div>

            {/* Generate / Reset buttons */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button
                onClick={handleGenerate}
                style={{ flex: 2, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#fff", backgroundColor: "#d97706", border: "none", borderRadius: 8, padding: "11px 0", cursor: "pointer", boxShadow: "0 2px 8px rgba(217,119,6,0.3)", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#b45309"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#d97706"; }}
              >
                Generate Scenario
              </button>
              <button
                onClick={() => { update("networkSize", "Medium"); update("trainDensity", "High"); update("maintLoad", "Medium"); update("resAvail", "Normal"); update("emergencyEvents", true); }}
                style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "11px 0", cursor: "pointer" }}
              >
                Reset Data
              </button>
            </div>
          </SectionCard>

          {/* ── SECTION 5: Users & Roles ── */}
          <SectionCard title="Users & Roles" icon="👥" accent="#2563eb">
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {USERS.map((user, i) => {
                const isSelected = s.selectedUser === user.id;
                return (
                  <div key={user.id}>
                    <div
                      onClick={() => update("selectedUser", isSelected ? null : user.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                        backgroundColor: isSelected ? "#eff4ff" : "transparent",
                        border: `1px solid ${isSelected ? "#bfcffd" : "transparent"}`,
                        transition: "all 0.15s", marginBottom: 4,
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-brand)", fontSize: 11, fontWeight: 700, color: "#fff" }}>{user.name.split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "#0d1829" }}>{user.name}</div>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{user.role}</div>
                      </div>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: isSelected ? "#2563eb" : "#7a8898", backgroundColor: isSelected ? "#dbeafe" : "#f8fafc", border: `1px solid ${isSelected ? "#bfcffd" : "#dde2ea"}`, borderRadius: 20, padding: "3px 12px", flexShrink: 0 }}>
                        {user.access}
                      </span>
                    </div>

                    {/* Expanded permissions */}
                    {isSelected && (
                      <div style={{ backgroundColor: "#f5f8ff", border: "1px solid #dbeafe", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
                        <ULabel color="#2563eb">PERMISSIONS</ULabel>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                          {user.permissions.map(p => (
                            <span key={p} style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd", borderRadius: 5, padding: "3px 10px" }}>{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {i < USERS.length - 1 && !isSelected && <div style={{ height: 1, backgroundColor: "#f0f2f5", marginBottom: 4 }} />}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── SECTION 6: System Status ── */}
          <SectionCard title="System Status" icon="🟢" accent="#16a34a">
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "RailTwin AI Engine",   value: "Operational",   color: "#16a34a", pulse: true },
                { label: "Optimization Engine",  value: "Ready",         color: "#16a34a", pulse: false },
                { label: "Simulation Engine",    value: "Ready",         color: "#16a34a", pulse: false },
                { label: "Network Data",         value: "Synchronized",  color: "#16a34a", pulse: false },
                { label: "Last Sync",            value: "2 min ago",     color: "#7a8898", pulse: false },
              ].map((row, i) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 4 ? "1px solid #f0f2f5" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color, flexShrink: 0, boxShadow: row.pulse ? `0 0 0 3px ${row.color}28` : "none" }} />
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#374151" }}>{row.label}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* System build info */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e8edf3", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { k: "Version",    v: "3.4.1" },
                  { k: "Build",      v: "2026.09.05" },
                  { k: "Uptime",     v: "14 h 22 m" },
                  { k: "Memory",     v: "2.1 GB / 8 GB" },
                ].map(row => (
                  <div key={row.k}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", marginBottom: 2 }}>{row.k.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#374151" }}>{row.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,255,255,0.97)", borderTop: "1px solid #dde2ea", padding: "14px 28px", display: "flex", alignItems: "center", gap: 12, zIndex: 50, flexShrink: 0 }}>
        <div style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>
          {dirty ? "You have unsaved changes — save or reset to continue." : "All settings are saved and active."}
        </div>
        <button
          onClick={handleReset}
          style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "#7a8898", backgroundColor: "#f8fafc", border: "1px solid #dde2ea", borderRadius: 8, padding: "9px 20px", cursor: "pointer" }}
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#fff", backgroundColor: dirty ? "#16a34a" : "#a8b4c0", border: "none", borderRadius: 8, padding: "9px 24px", cursor: dirty ? "pointer" : "default", transition: "background 0.2s", boxShadow: dirty ? "0 2px 8px rgba(22,163,74,0.3)" : "none" }}
        >
          Save Changes
        </button>
      </div>

      {/* Toast */}
      {toast === "saved" && (
        <Toast message="Settings saved successfully." color="#16a34a" bg="#f0fdf4" border="#bbf7d0"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          onClose={() => setToast(null)} />
      )}
      {toast === "reset" && (
        <Toast message="Settings reset to defaults." color="#2563eb" bg="#eff4ff" border="#bfcffd"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9a6 6 0 1 0 1.5-3.9M3 5v4h4" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          onClose={() => setToast(null)} />
      )}
      {toast === "scenario" && (
        <Toast message="Scenario generated: Demo Corridor · High Density." color="#d97706" bg="#fffbeb" border="#fde68a"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="#d97706" strokeWidth="1.6" /><path d="M9 6v6M6 9h6" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" /></svg>}
          onClose={() => setToast(null)} />
      )}
    </div>
  );
}
