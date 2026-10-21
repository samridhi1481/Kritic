import { useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Block {
  id: string;
  label: string;
  row: string;
  start: number; // decimal hours from 00:00
  end: number;
  color: string;
  bg: string;
  border: string;
  isConflict?: boolean;
  isRecommended?: boolean;
  crew?: string;
  section?: string;
  type?: string;
  note?: string;
}

type RightMode = "default" | "conflict" | "alternatives";

// ─── Schedule data ─────────────────────────────────────────────────────────────

const BLOCKS: Block[] = [
  // Track
  { id: "trk-s11", label: "S11 Inspection",   row: "Track",          start: 6.5,  end: 8.5,  color: "#2563eb", bg: "#eff4ff", border: "#bfcffd", section: "S11", type: "Track Inspection",    crew: "4 workers" },
  { id: "trk-s12", label: "S12 Maintenance",  row: "Track",          start: 11.5, end: 13.5, color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd", section: "S12", type: "Track Geometry Repair", crew: "8 workers", isRecommended: true, note: "AI recommended window" },
  { id: "trk-s13", label: "S13 Maintenance",  row: "Track",          start: 14,   end: 16.5, color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", section: "S13", type: "Track Maintenance",    crew: "6 workers", isConflict: true, note: "Overlaps T203 movement" },
  // Signalling
  { id: "sig-bd",  label: "Signal Check B-D", row: "Signalling",     start: 8,    end: 11,   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", section: "S12–S13", type: "Signal Inspection", crew: "3 workers" },
  { id: "sig-s12", label: "Signal Test S12",  row: "Signalling",     start: 11.5, end: 13,   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", section: "S12",     type: "Signal Test",       crew: "2 workers" },
  // Traction
  { id: "ohe-ins", label: "OHE Inspection",   row: "Traction",       start: 9.5,  end: 12,   color: "#d97706", bg: "#fffbeb", border: "#fde68a", section: "S11–S12", type: "OHE Inspection",    crew: "5 workers" },
  { id: "ohe-pat", label: "OHE Patrol",        row: "Traction",       start: 15,   end: 17,   color: "#d97706", bg: "#fffbeb", border: "#fde68a", section: "S13",     type: "OHE Patrol",        crew: "3 workers" },
  // Engineering
  { id: "eng-bal", label: "Ballast Survey",    row: "Engineering",    start: 7,    end: 9,    color: "#7a8898", bg: "#f8fafc", border: "#dde2ea", section: "S11",     type: "Ballast Survey",    crew: "6 workers" },
  { id: "eng-br",  label: "Bridge Inspection", row: "Engineering",    start: 13,   end: 15,   color: "#7a8898", bg: "#f8fafc", border: "#dde2ea", section: "S11",     type: "Structural Survey", crew: "4 workers" },
  // Train Operations
  { id: "t201",    label: "T201",               row: "Train Ops",      start: 6.5,  end: 9.5,  color: "#2c4a7c", bg: "#eef2ff", border: "#c7d7f0", type: "Passenger Express", note: "On time" },
  { id: "t202",    label: "T202",               row: "Train Ops",      start: 10,   end: 13,   color: "#2c4a7c", bg: "#eef2ff", border: "#c7d7f0", type: "Regional",          note: "On time" },
  { id: "t203",    label: "T203  ⚠",            row: "Train Ops",      start: 13.5, end: 17,   color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", type: "Express",           note: "Conflict with S13 Maintenance", isConflict: true },
];

const ROWS = ["Track", "Signalling", "Traction", "Engineering", "Train Ops"];
const ROW_COLORS: Record<string, string> = {
  "Track": "#2563eb", "Signalling": "#16a34a", "Traction": "#d97706",
  "Engineering": "#7a8898", "Train Ops": "#2c4a7c",
};

const START_H = 6;
const END_H = 18;
const SPAN = END_H - START_H;
const HOUR_TICKS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function pct(h: number) { return ((h - START_H) / SPAN) * 100; }

// Current time marker: 10:30
const NOW_PCT = pct(10.5);

// Conflict overlap region: 14:00–16:30
const CONFLICT_START = pct(14);
const CONFLICT_END   = pct(16.5);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function fmt(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards() {
  const cards = [
    { label: "SCHEDULED MAINTENANCE", value: "8",    sub: "Work orders today",        color: "#2563eb", bg: "#eff4ff", bd: "#bfcffd" },
    { label: "ACTIVE TRAINS",         value: "7",    sub: "On corridor",              color: "#0d1829", bg: "#f8fafc", bd: "#dde2ea" },
    { label: "CONFLICTS DETECTED",    value: "3",    sub: "Requires resolution",      color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
    { label: "PREDICTED DELAY",       value: "21 min", sub: "Across affected trains", color: "#d97706", bg: "#fffbeb", bd: "#fde68a" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {cards.map(c => (
        <div key={c.label} style={{ backgroundColor: "#fff", border: `1px solid ${c.bd}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 3px rgba(13,24,41,0.05)" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 36, fontWeight: 700, color: c.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

const LABEL_W = 108;
const ROW_H   = 44;

function TimelineGrid({
  selectedId,
  onSelect,
  appliedRec,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  appliedRec: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Hour axis */}
      <div style={{ display: "flex", marginLeft: LABEL_W, marginBottom: 4 }}>
        {HOUR_TICKS.map((h, i) => (
          <div
            key={h}
            style={{
              position: "relative",
              flex: i < HOUR_TICKS.length - 1 ? 1 : "0 0 0px",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "#a8b4c0",
            }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* Rows */}
      {ROWS.map(row => {
        const rowBlocks = BLOCKS.filter(b => b.row === row);
        const dotColor = ROW_COLORS[row];
        return (
          <div key={row} style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
            {/* Row label */}
            <div style={{
              width: LABEL_W, flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "#0d1829", paddingRight: 12,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: dotColor, flexShrink: 0 }} />
              {row}
            </div>

            {/* Track */}
            <div style={{
              flex: 1, height: ROW_H, position: "relative",
              backgroundColor: "#f8fafc", borderRadius: 6,
              border: "1px solid #dde2ea", overflow: "visible",
            }}>
              {/* Hour grid lines */}
              {HOUR_TICKS.slice(1, -1).map(h => (
                <div key={h} style={{
                  position: "absolute", left: `${pct(h)}%`, top: 0, bottom: 0,
                  width: 1, backgroundColor: "#e8edf3", zIndex: 0,
                }} />
              ))}

              {/* Conflict zone overlay on Track row only (S13 vs T203 overlap) */}
              {(row === "Track" || row === "Train Ops") && (
                <div style={{
                  position: "absolute",
                  left: `${CONFLICT_START}%`,
                  width: `${CONFLICT_END - CONFLICT_START}%`,
                  top: 0, bottom: 0, zIndex: 1, pointerEvents: "none",
                  backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(220,38,38,0.07) 5px, rgba(220,38,38,0.07) 10px)",
                }} />
              )}

              {/* Current time line */}
              <div style={{
                position: "absolute", left: `${NOW_PCT}%`, top: -4, bottom: -4,
                width: 1.5, backgroundColor: "#2563eb", opacity: 0.55, zIndex: 4,
                pointerEvents: "none",
              }} />

              {/* Blocks */}
              {rowBlocks.map(block => {
                const left = pct(block.start);
                const width = pct(block.end) - pct(block.start);
                const sel = selectedId === block.id;
                const isApplied = appliedRec && block.id === "trk-s12";
                return (
                  <div
                    key={block.id}
                    onClick={() => onSelect(sel ? null : block.id)}
                    title={`${block.label}  ${fmt(block.start)}–${fmt(block.end)}`}
                    style={{
                      position: "absolute",
                      left: `${left}%`, width: `${width}%`,
                      top: 4, bottom: 4, zIndex: 2,
                      backgroundColor: isApplied ? "#f0fdf4" : block.bg,
                      border: `${sel ? 2 : 1}px solid ${sel ? block.color : isApplied ? "#bbf7d0" : block.border}`,
                      borderRadius: 5,
                      display: "flex", alignItems: "center", paddingLeft: 7, paddingRight: 4,
                      cursor: "pointer", overflow: "hidden",
                      boxShadow: sel ? `0 0 0 2px ${block.color}22` : "none",
                      transition: "box-shadow 0.15s, border 0.12s",
                      backgroundImage: block.isConflict
                        ? "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(220,38,38,0.09) 4px, rgba(220,38,38,0.09) 8px)"
                        : "none",
                    }}
                  >
                    <span style={{
                      fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600,
                      color: isApplied ? "#16a34a" : block.color,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {isApplied ? "✓ " : ""}{block.label}
                    </span>
                    {block.isRecommended && !isApplied && (
                      <span style={{
                        marginLeft: 4, fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700,
                        color: "#7c3aed", backgroundColor: "#ede9fe", borderRadius: 3, padding: "1px 4px",
                        flexShrink: 0,
                      }}>AI</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginLeft: LABEL_W, marginTop: 8, flexWrap: "wrap" as const }}>
        {[
          { color: "#2563eb", bg: "#eff4ff", label: "Track / Train" },
          { color: "#16a34a", bg: "#f0fdf4", label: "Signalling" },
          { color: "#d97706", bg: "#fffbeb", label: "Traction" },
          { color: "#7a8898", bg: "#f8fafc", label: "Engineering" },
          { color: "#7c3aed", bg: "#f5f3ff", label: "AI Recommended" },
          { color: "#dc2626", bg: "#fef2f2", label: "Conflict" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: item.bg, border: `1px solid ${item.color}`, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 2, height: 14, backgroundColor: "#2563eb", opacity: 0.55, borderRadius: 1 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a8b4c0" }}>Current time 10:30</span>
        </div>
      </div>
    </div>
  );
}

// ─── Block Detail Strip ─────────────────────────────────────────────────────────

function BlockDetail({ block, onClose }: { block: Block; onClose: () => void }) {
  return (
    <div style={{
      backgroundColor: "#fff", border: `1.5px solid ${block.color}33`,
      borderTop: `3px solid ${block.color}`, borderRadius: 8,
      padding: "14px 20px", marginTop: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" as const,
    }}>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" as const, flex: 1 }}>
        <DetailCell label="BLOCK" value={block.label} />
        <DetailCell label="TIME" value={`${fmt(block.start)} – ${fmt(block.end)}`} mono />
        <DetailCell label="DURATION" value={`${Math.round((block.end - block.start) * 60)} min`} />
        {block.section && <DetailCell label="SECTION" value={block.section} mono />}
        {block.type    && <DetailCell label="TYPE" value={block.type} />}
        {block.crew    && <DetailCell label="CREW" value={block.crew} />}
        {block.note    && <DetailCell label="NOTE" value={block.note} color={block.isConflict ? "#dc2626" : undefined} />}
        {block.isConflict && (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#dc2626", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 4, padding: "2px 8px", alignSelf: "center" }}>
            ⚠ CONFLICT
          </span>
        )}
        {block.isRecommended && (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 4, padding: "2px 8px", alignSelf: "center" }}>
            ◆ AI RECOMMENDED
          </span>
        )}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8b4c0", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
    </div>
  );
}

function DetailCell({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#a8b4c0", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", fontSize: 13, fontWeight: 600, color: color ?? "#0d1829" }}>{value}</div>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({
  appliedRec,
  onApply,
  rightMode,
  setRightMode,
}: {
  appliedRec: boolean;
  onApply: () => void;
  rightMode: RightMode;
  setRightMode: (m: RightMode) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* AI Recommendation */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e8edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◆</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em" }}>AI SCHEDULE RECOMMENDATION</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <RecRow k="Recommended Window" v="11:30–13:30" mono vColor="#7c3aed" />
          <RecRow k="Asset" v="Section S12" />
          <RecRow k="Risk" v="High" vColor="#dc2626" />
          <RecRow k="Expected Delay" v="21 min" vColor="#d97706" />
          <RecRow k="Conflict Risk" v="Low" vColor="#16a34a" />
          <RecRow k="Crew Available" v="8 workers" />
        </div>

        <div style={{ backgroundColor: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 7, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", marginBottom: 4 }}>RECOMMENDATION</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
            Perform maintenance on S12 during this window. Low traffic density and crew availability minimise disruption.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onApply}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: appliedRec ? "#16a34a" : "#fff",
              backgroundColor: appliedRec ? "#f0fdf4" : "#7c3aed",
              border: appliedRec ? "1px solid #bbf7d0" : "none",
              borderRadius: 8, padding: "10px 0", cursor: "pointer", width: "100%", transition: "all 0.2s",
            }}
          >
            {appliedRec ? "✓ Recommendation Applied" : "Apply Recommendation"}
          </button>
          <button
            onClick={() => setRightMode(rightMode === "conflict" ? "default" : "conflict")}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              color: rightMode === "conflict" ? "#dc2626" : "#dc2626",
              backgroundColor: rightMode === "conflict" ? "#fef2f2" : "#fff",
              border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
            }}
          >
            {rightMode === "conflict" ? "▲ Hide Conflict Panel" : "Resolve Conflict"}
          </button>
          <button
            onClick={() => setRightMode(rightMode === "alternatives" ? "default" : "alternatives")}
            style={{
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd",
              borderRadius: 8, padding: "9px 0", cursor: "pointer", width: "100%",
            }}
          >
            {rightMode === "alternatives" ? "▲ Hide Alternatives" : "View Alternatives"}
          </button>
        </div>
      </div>

      {/* Conflict panel */}
      {rightMode === "conflict" && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8edf3" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#dc2626", marginBottom: 12 }}>CONFLICT DETAILS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {[
              { id: "S13 Maintenance", time: "14:00–16:30", type: "Track", color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
              { id: "T203 Express", time: "13:30–17:00", type: "Train", color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
            ].map(c => (
              <div key={c.id} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 7, padding: "10px 12px" }}>
                <div style={{ fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 700, color: "#0d1829", marginBottom: 2 }}>{c.id}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: c.color }}>{c.time}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 2 }}>{c.type} · Overlap: 14:00–16:30</div>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#d97706", marginBottom: 4 }}>SUGGESTED RESOLUTION</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
              Shift S13 Maintenance to <strong>17:00–19:30</strong> or reroute T203 via alternative line. Moving maintenance is preferred to avoid passenger disruption.
            </div>
          </div>
          <button style={{
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
            color: "#fff", backgroundColor: "#d97706", border: "none",
            borderRadius: 7, padding: "9px 0", cursor: "pointer", width: "100%",
          }}>
            Apply Resolution
          </button>
        </div>
      )}

      {/* Alternatives panel */}
      {rightMode === "alternatives" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "#7a8898", marginBottom: 12 }}>ALTERNATIVE WINDOWS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { window: "17:00–19:00", score: 78.3, trains: 1, impact: "Low", note: "Evening window · low traffic" },
              { window: "22:00–01:00", score: 91.1, trains: 0, impact: "Minimal", note: "Off-peak · no conflicts" },
            ].map((alt, i) => (
              <AltCard key={i} {...alt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecRow({ k, v, mono, vColor }: { k: string; v: string; mono?: boolean; vColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898" }}>{k}</span>
      <span style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-brand)", fontSize: 13, fontWeight: 600, color: vColor ?? "#0d1829" }}>{v}</span>
    </div>
  );
}

function AltCard({ window: win, score, trains, impact, note }: { window: string; score: number; trains: number; impact: string; note: string }) {
  const [selected, setSelected] = useState(false);
  const [applied, setApplied] = useState(false);
  return (
    <div
      onClick={() => !applied && setSelected(s => !s)}
      style={{
        border: `1.5px solid ${applied ? "#bbf7d0" : selected ? "#7c3aed" : "#dde2ea"}`,
        backgroundColor: applied ? "#f0fdf4" : selected ? "#f5f3ff" : "#fff",
        borderRadius: 8, padding: "12px 14px", cursor: applied ? "default" : "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: applied ? "#16a34a" : selected ? "#7c3aed" : "#0d1829", marginBottom: 3 }}>
            {applied ? "✓ " : ""}{win}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898" }}>Impact: {impact} · {trains} train{trains !== 1 ? "s" : ""} affected</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#7a8898", marginTop: 1 }}>{note}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: "#a8b4c0", letterSpacing: "0.08em" }}>SCORE</div>
          <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: score > 88 ? "#16a34a" : "#d97706" }}>{score}</div>
        </div>
      </div>
      {selected && !applied && (
        <button
          onClick={e => { e.stopPropagation(); setApplied(true); setSelected(false); }}
          style={{
            marginTop: 10, width: "100%", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
            color: "#fff", backgroundColor: "#7c3aed", border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer",
          }}
        >
          Apply This Window
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appliedRec, setAppliedRec] = useState(false);
  const [rightMode, setRightMode] = useState<RightMode>("default");

  const selectedBlock = BLOCKS.find(b => b.id === selectedId) ?? null;

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Page header */}
      <div style={{ padding: "22px 28px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 24, fontWeight: 700, color: "#0d1829", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              Schedule
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#7a8898", margin: 0 }}>
              Coordinated maintenance, train movement and resource scheduling.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a8898",
              backgroundColor: "#f8fafc", border: "1px solid #dde2ea",
              borderRadius: 6, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block" }} />
              Live · Auto-refresh
            </div>
            <button style={{
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
              color: "#2563eb", backgroundColor: "#eff4ff", border: "1px solid #bfcffd",
              borderRadius: 6, padding: "6px 14px", cursor: "pointer",
            }}>
              Export Schedule
            </button>
          </div>
        </div>
        <SummaryCards />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 288px", overflow: "hidden", padding: "0 28px 24px", gap: 0 }}>

        {/* Left: timeline */}
        <div style={{
          backgroundColor: "#fff", border: "1px solid #dde2ea",
          borderRadius: "10px 0 0 10px", borderRight: "none",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Timeline header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", borderBottom: "1px solid #e8edf3", flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 15, fontWeight: 700, color: "#0d1829" }}>
                Today's Operations Schedule
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#7a8898", marginTop: 2 }}>
                Demo Corridor · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "3 Conflicts", color: "#dc2626", bg: "#fef2f2", bd: "#fca5a5" },
                { label: "11 Blocks", color: "#7a8898", bg: "#f8fafc", bd: "#dde2ea" },
              ].map(item => (
                <span key={item.label} style={{
                  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                  color: item.color, backgroundColor: item.bg, border: `1px solid ${item.bd}`,
                  borderRadius: 5, padding: "3px 10px",
                }}>{item.label}</span>
              ))}
            </div>
          </div>

          {/* Timeline body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>
            <TimelineGrid
              selectedId={selectedId}
              onSelect={handleSelect}
              appliedRec={appliedRec}
            />

            {/* Block detail strip */}
            {selectedBlock && (
              <BlockDetail block={selectedBlock} onClose={() => setSelectedId(null)} />
            )}

            {/* Conflict summary strip */}
            <div style={{
              marginTop: 16, marginBottom: 16,
              backgroundColor: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "12px 18px",
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", flexShrink: 0 }}>⚠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.08em", marginBottom: 2 }}>CONFLICT DETECTED · 14:00–16:30</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#0d1829" }}>
                  S13 Track Maintenance overlaps with Train T203 Express movement. Estimated delay: 21 minutes.
                </div>
              </div>
              <button
                onClick={() => setRightMode(m => m === "conflict" ? "default" : "conflict")}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
                  color: "#dc2626", backgroundColor: "#fff", border: "1px solid #fca5a5",
                  borderRadius: 7, padding: "7px 16px", cursor: "pointer", flexShrink: 0,
                }}
              >
                Resolve →
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          backgroundColor: "#fff", border: "1px solid #dde2ea",
          borderRadius: "0 10px 10px 0", borderLeft: "1px solid #e8edf3",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <RightPanel
            appliedRec={appliedRec}
            onApply={() => setAppliedRec(v => !v)}
            rightMode={rightMode}
            setRightMode={setRightMode}
          />
        </div>
      </div>
    </div>
  );
}
