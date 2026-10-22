import React, { useState } from "react";
import Overview from "./Overview";
import NetworkTwin from "./NetworkTwin";
import Maintenance from "./Maintenance";
import Schedule from "./Schedule";
import Optimization from "./Optimization";
import Simulation from "./Simulation";
import Scenarios from "./Scenarios";
import Analytics from "./Analytics";
import ChaosMode from "./ChaosMode";
import AssetIntelligence from "./AssetIntelligence";
import ScheduleReview from "./ScheduleReview";
import Audit from "./Audit";
import Settings from "./Settings";
import AlgorithmBenchmark from "./AlgorithmBenchmark";
import CoordinationHub from "./CoordinationHub";

type NavItem = {
  id: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OPERATIONS",
    items: [
      { id: "overview", label: "Overview" },
      { id: "network-twin", label: "Network Twin" },
      { id: "maintenance", label: "Maintenance" },
      { id: "coordination-hub", label: "Coordination Hub" },
      { id: "schedule", label: "Schedule" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { id: "schedule-review", label: "Schedule Review" },
      { id: "asset-intelligence", label: "Asset Intelligence" },
      { id: "optimization", label: "Optimization" },
      { id: "simulation", label: "Simulation" },
      { id: "scenarios", label: "Scenarios" },
      { id: "analytics", label: "Analytics" },
      { id: "chaos", label: "Chaos Mode" },
      { id: "algorithm-benchmark", label: "Algorithm Benchmark" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "audit", label: "Audit" },
      { id: "settings", label: "Settings" },
    ],
  },
];

const NAV_LABELS: Record<string, string> = {
  overview: "Overview",
  "network-twin": "Network Twin",
  maintenance: "Maintenance",
  "coordination-hub": "Coordination Hub",
  schedule: "Schedule",
  "schedule-review": "Schedule Review",
  "asset-intelligence": "Asset Intelligence",
  optimization: "Optimization",
  simulation: "Simulation",
  scenarios: "Scenarios",
  analytics: "Analytics",
  "algorithm-benchmark": "Algorithm Benchmark",
  chaos: "Chaos Mode",
  audit: "Audit",
  settings: "Settings",
};

const SECTION_LABELS: Record<string, string> = {
  overview: "Operations",
  "network-twin": "Operations",
  maintenance: "Operations",
  "coordination-hub": "Operations",
  schedule: "Operations",
  "schedule-review": "Intelligence",
  "asset-intelligence": "Intelligence",
  optimization: "Intelligence",
  simulation: "Intelligence",
  scenarios: "Intelligence",
  analytics: "Intelligence",
  "algorithm-benchmark": "Intelligence",
  chaos: "Intelligence",
  audit: "System",
  settings: "System",
};

export default function App() {
  const [activeId, setActiveId] = useState("overview");
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside
        className="app-sidebar"
        style={{
          backgroundColor: "#0d1829",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Wordmark */}
        <div
          className="app-brand"
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div className="app-brand-copy">
            <div
              style={{
                fontFamily: "var(--font-brand)",
                fontWeight: 700,
                fontSize: 16,
                color: "#ffffff",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              RAILTWIN AI
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 400,
                fontSize: 10,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.01em",
                marginTop: 4,
                lineHeight: 1.2,
              }}
            >
              Intelligent Railway Maintenance
              <br />
              Orchestration
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div
                className="app-nav-group-label"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.1em",
                  padding: "12px 20px 6px",
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className="app-nav-button"
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 20px",
                      background: isActive ? "rgba(37,99,235,0.18)" : "transparent",
                      border: "none",
                      borderLeft: isActive
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.15s",
                      fontFamily: "var(--font-ui)",
                      fontSize: item.label.length > 16 ? 12 : 14,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                      whiteSpace: "nowrap" as const,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                    }}
                  >
                    <NavIcon id={item.id} active={isActive} />
                    <span className="app-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System status */}
        <div
          className="app-system-status"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "14px 20px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            SYSTEM STATUS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="app-system-status-label"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#16a34a",
                flexShrink: 0,
                boxShadow: "0 0 0 2px rgba(22,163,74,0.25)",
              }}
            />
            <span
              className="app-system-status-label"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Operational
            </span>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header
        className="app-topbar"
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 16,
          zIndex: 10,
        }}
      >
        {/* Breadcrumb */}
        <div className="app-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--color-muted)",
              fontWeight: 400,
            }}
          >
            {SECTION_LABELS[activeId]}
          </span>
          <span style={{ color: "var(--color-border-strong)", fontSize: 14 }}>/</span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-navy)",
            }}
          >
            {NAV_LABELS[activeId]}
          </span>
        </div>

        {/* Scenario pill */}
        <div
          className="app-scenario-pill"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--color-blue-light)",
            border: "1px solid var(--color-blue-mid)",
            borderRadius: 6,
            padding: "5px 12px",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#2563eb" strokeWidth="1.5" />
            <path d="M5 8h6M8 5v6" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--color-blue)",
              fontWeight: 500,
            }}
          >
            Scenario: Demo Corridor
          </span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 2 }}>
            <path d="M4 6l4 4 4-4" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Search */}
        <div
          className="app-search"
          style={{
            position: "relative",
            flexShrink: 0,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="7" cy="7" r="4.5" stroke="#a8b4c0" strokeWidth="1.4" />
            <path d="M10.5 10.5l2.5 2.5" stroke="#a8b4c0" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="app-search-input"
            type="text"
            placeholder="Search assets, faults, work orders…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--color-navy)",
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: 7,
              padding: "7px 14px 7px 32px",
              outline: "none",
              width: 260,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) =>
              ((e.target as HTMLInputElement).style.borderColor = "#2563eb")
            }
            onBlur={(e) =>
              ((e.target as HTMLInputElement).style.borderColor =
                "var(--color-border)")
            }
          />
        </div>

        {/* Notifications */}
        <button
          style={{
            position: "relative",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            borderRadius: 7,
            color: "var(--color-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "var(--color-background)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "none")
          }
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2a6 6 0 0 1 6 6v2l1.5 3h-15L4 10V8a6 6 0 0 1 6-6z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M8 15.5a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {/* Badge */}
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#dc2626",
              border: "1.5px solid #ffffff",
            }}
          />
        </button>

        {/* User profile */}
        <div
          className="app-profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            flexShrink: 0,
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              "var(--color-border-strong)";
            (e.currentTarget as HTMLDivElement).style.background =
              "var(--color-background)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              "var(--color-border)";
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: 11,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.04em",
              }}
            >
              AK
            </span>
          </div>
          <div className="app-profile-copy">
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-navy)",
                lineHeight: 1.2,
              }}
            >
              A. Kowalski
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--color-muted)",
                lineHeight: 1.2,
              }}
            >
              Infrastructure Ops
            </div>
          </div>
          <svg
            className="app-profile-chevron"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: "var(--color-muted-light)" }}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </header>

      {/* Main content area */}
      <main
        className="app-main"
        style={{
          backgroundColor: "var(--color-background)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeId === "overview" ? (
          <Overview />
        ) : activeId === "network-twin" ? (
          <NetworkTwin />
        ) : activeId === "maintenance" ? (
          <Maintenance />
        ) : activeId === "coordination-hub" ? (
          <CoordinationHub onNavigate={setActiveId} />
        ) : activeId === "schedule" ? (
          <Schedule />
        ) : activeId === "optimization" ? (
          <Optimization />
        ) : activeId === "simulation" ? (
          <Simulation />
        ) : activeId === "scenarios" ? (
          <Scenarios />
        ) : activeId === "analytics" ? (
          <Analytics />
        ) : activeId === "schedule-review" ? (
          <ScheduleReview />
        ) : activeId === "asset-intelligence" ? (
          <AssetIntelligence />
        ) : activeId === "algorithm-benchmark" ? (
          <AlgorithmBenchmark />
        ) : activeId === "chaos" ? (
          <ChaosMode />
        ) : activeId === "audit" ? (
          <Audit />
        ) : activeId === "settings" ? (
          <Settings />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#f0f2f5", border: "1px solid #dde2ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#c8d0dc" strokeWidth="1.5" />
                <path d="M9 12h6M12 9v6" stroke="#c8d0dc" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "var(--color-navy)", letterSpacing: "-0.01em", marginBottom: 8 }}>
                {NAV_LABELS[activeId] ?? "Module"}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--color-muted)", maxWidth: 300, lineHeight: 1.6 }}>
                This module is not yet configured in this environment.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const color = active ? "#ffffff" : "rgba(255,255,255,0.45)";
  const icons: Record<string, React.ReactElement> = {
    overview: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.3" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.3" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.3" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.3" />
      </svg>
    ),
    "network-twin": (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="8" r="1.5" stroke={color} strokeWidth="1.3" />
        <circle cx="13" cy="8" r="1.5" stroke={color} strokeWidth="1.3" />
        <circle cx="8" cy="3" r="1.5" stroke={color} strokeWidth="1.3" />
        <circle cx="8" cy="13" r="1.5" stroke={color} strokeWidth="1.3" />
        <path d="M4.5 8h7M8 4.5v7" stroke={color} strokeWidth="1.2" />
      </svg>
    ),
    maintenance: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M10.5 2a3 3 0 0 1 0 4.24l-6.76 6.76a1 1 0 0 1-1.41 0l-.35-.35a1 1 0 0 1 0-1.41L8.74 4.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.3" />
      </svg>
    ),
    schedule: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="11" rx="1.5" stroke={color} strokeWidth="1.3" />
        <path d="M5 2v2M11 2v2M2 7h12" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5 10h2M9 10h2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    optimization: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l4-4 3 2 5-6" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="4" r="1.5" fill={color} />
      </svg>
    ),
    simulation: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5v13M1.5 8h13" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="8" cy="8" rx="5.5" ry="2.5" stroke={color} strokeWidth="1.3" />
        <ellipse cx="8" cy="8" rx="2.5" ry="5.5" stroke={color} strokeWidth="1.3" />
      </svg>
    ),
    scenarios: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="12.5" cy="11.5" r="2.5" stroke={color} strokeWidth="1.3" />
        <path d="M12.5 10.5v1.5l1 1" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
    analytics: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="8" width="3" height="6" rx="0.5" stroke={color} strokeWidth="1.3" />
        <rect x="6.5" y="5" width="3" height="9" rx="0.5" stroke={color} strokeWidth="1.3" />
        <rect x="11" y="2" width="3" height="12" rx="0.5" stroke={color} strokeWidth="1.3" />
      </svg>
    ),
    "schedule-review": (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M10 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-3-3z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M10 2v3h3" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M5.5 10l1.5 1.5 3.5-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    "asset-intelligence": (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="6" r="3" stroke={color} strokeWidth="1.3" />
        <path d="M3 14c0-2.8 2.24-5 5-5s5 2.2 5 5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M11.5 2.5l1 1M4.5 2.5l-1 1M13 6h1M2 6H1" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
    "algorithm-benchmark": (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 12V8M6 12V5M10 12V7M14 12V3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="14" cy="3" r="1.5" fill={color} />
      </svg>
    ),
    chaos: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2l1.5 4h4l-3.2 2.3 1.2 4L8 10l-3.5 2.3 1.2-4L2.5 6h4z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
    audit: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M10 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-3-3z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M10 2v3h3M5.5 9l1.5 1.5 3-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    settings: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.3" />
        <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.93 3.93l1.06 1.06M11.01 11.01l1.06 1.06M12.07 3.93l-1.06 1.06M4.99 11.01l-1.06 1.06" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[id] ?? null;
}
