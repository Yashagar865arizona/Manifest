/**
 * DashboardMockup — static HTML mock of the Radar CEO dashboard
 * Used in the landing page hero to show a real product screenshot.
 */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64;
  const h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const PULSE_DATA = [68, 71, 66, 74, 70, 72, 72];
const ALERTS_DATA = [5, 4, 6, 4, 3, 3, 3];
const QUIET_DATA = [0, 1, 2, 1, 1, 1, 1];
const OVERLOAD_DATA = [1, 2, 2, 3, 2, 2, 2];

const MEMBERS = [
  { name: "Alex Chen", role: "Eng Manager", pulse: 82, msgs: 94, commits: 12, meetings: "3.5h", focus: "5.0h", alert: null },
  { name: "Priya Nair", role: "Senior SWE", pulse: 71, msgs: 58, commits: 8, meetings: "4.0h", focus: "4.5h", alert: null },
  { name: "Jordan Lee", role: "Product Mgr", pulse: 44, msgs: 22, commits: 0, meetings: "8.5h", focus: "0.5h", alert: { label: "Overloaded", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)" } },
  { name: "Sam Torres", role: "Senior SWE", pulse: 18, msgs: 3, commits: 1, meetings: "0.5h", focus: "1.0h", alert: { label: "Gone quiet", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)" } },
  { name: "Mia Kapoor", role: "Designer", pulse: 77, msgs: 71, commits: 0, meetings: "2.0h", focus: "6.5h", alert: null },
];

const ALERTS = [
  { sev: "CRITICAL", sevColor: "#EF4444", sevBg: "rgba(239, 68, 68, 0.15)", sevBorder: "rgba(239, 68, 68, 0.3)", person: "Sam Torres", title: "Gone quiet for 6 days", detail: "No Slack messages, 1 commit. DM cadence dropped 94%.", tag: "Gone quiet" },
  { sev: "HIGH", sevColor: "#F97316", sevBg: "rgba(249, 115, 22, 0.15)", sevBorder: "rgba(249, 115, 22, 0.3)", person: "Jordan Lee", title: "Meeting overload — 8.5h today", detail: "Focus time is 30 min. PM burnout risk elevated.", tag: "Overloaded" },
  { sev: "MEDIUM", sevColor: "#F59E0B", sevBg: "rgba(245, 158, 11, 0.15)", sevBorder: "rgba(245, 158, 11, 0.3)", person: "Alex Chen", title: "PR review backlog growing", detail: "14 open PRs, avg age 5 days. Velocity will drop.", tag: "Stalled work" },
];

export default function DashboardMockup() {
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px -16px rgba(0,0,0,0.8)",
        fontFamily: "var(--font-sans)",
        fontSize: "13px",
        color: "#F7F7F8",
        maxWidth: "100%",
        position: "relative",
      }}
    >
      {/* Glossy top highlight */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)", zIndex: 10 }} />

      {/* Browser chrome bar */}
      <div
        style={{
          background: "rgba(20,20,22,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4A4A4A" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4A4A4A" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4A4A4A" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "6px",
            padding: "4px 12px",
            fontSize: "11px",
            color: "#94A3B8",
            textAlign: "center",
            maxWidth: "300px",
            margin: "0 auto",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.02em"
          }}
        >
          app.radar.engineering/overview
        </div>
      </div>

      {/* App layout */}
      <div style={{ display: "flex", minHeight: "0" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "56px",
            background: "#050505",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Logo mark */}
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#F7F7F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#050505" }} />
          </div>
          {/* Nav icons */}
          {[
            <svg key="d" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F7F8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
            <svg key="u" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>,
            <svg key="c" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
            <svg key="n" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
          ]}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, background: "#0A0A0A", padding: "20px 24px", minWidth: 0, position: "relative" }}>
          
          {/* Subtle noise over content dashboard */}
          <div className="grid-pattern" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2, pointerEvents: "none" }} />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#F7F7F8", letterSpacing: "-0.02em" }}>Axiom Labs Overview</div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px", fontFamily: "var(--font-mono)" }}>CEO VIEW · SYSTEM ACTIVE</div>
            </div>
            <div
              style={{
                fontSize: "11px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#FCA5A5",
                padding: "4px 12px",
                borderRadius: "20px",
                fontWeight: 600,
                letterSpacing: "0.02em",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.1)"
              }}
            >
              3 ALERTS ACTIVE
            </div>
          </div>

          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px", position: "relative", zIndex: 1 }}>
            {[
              { label: "ORG HEALTH", value: "72", suffix: "/100", color: "#10B981", data: PULSE_DATA, sparkColor: "#10B981" },
              { label: "EXCEPTIONS", value: "3", suffix: "", color: "#F59E0B", data: ALERTS_DATA, sparkColor: "#F59E0B" },
              { label: "SILENT RISKS", value: "1", suffix: "", color: "#EF4444", data: QUIET_DATA, sparkColor: "#EF4444" },
              { label: "OVERLOADED", value: "2", suffix: "", color: "#F59E0B", data: OVERLOAD_DATA, sparkColor: "#F59E0B" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  backdropFilter: "blur(12px)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: card.color, boxShadow: `0 0 8px ${card.color}` }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                      {card.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.04em", fontFamily: "var(--font-display)" }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>{card.suffix}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.8 }}>
                    <Sparkline data={card.data} color={card.sparkColor} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alerts table */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              marginBottom: "16px",
              overflow: "hidden",
              position: "relative",
              zIndex: 1
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#F7F7F8", letterSpacing: "0.02em" }}>PRIORITY SIGNALS</span>
            </div>
            {ALERTS.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  borderBottom: i < ALERTS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: a.sevBg,
                    border: `1px solid ${a.sevBorder}`,
                    color: a.sevColor,
                    flexShrink: 0,
                    marginTop: "2px",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  {a.sev}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#F7F7F8", marginBottom: "2px", letterSpacing: "-0.01em" }}>{a.title}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8" }}>{a.detail}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>{a.person}</div>
                  <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px", fontFamily: "var(--font-mono)" }}>{a.tag.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Team signals table */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              overflow: "hidden",
              position: "relative",
              zIndex: 1
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#F7F7F8", letterSpacing: "0.02em" }}>TEAM RADAR</span>
            </div>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr",
                padding: "8px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {["Member", "Health", "Msgs", "Code", "Mtgs", "Focus", "Status"].map((h) => (
                <span key={h} style={{ fontSize: "10px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                  {h}
                </span>
              ))}
            </div>
            {MEMBERS.map((m, i) => (
              <div
                key={m.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr",
                  padding: "10px 16px",
                  borderBottom: i < MEMBERS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                  alignItems: "center",
                  background: m.alert ? "rgba(255,255,255,0.02)" : undefined,
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#E2E8F0" }}>{m.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{m.role}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.pulse >= 70 ? "#10B981" : m.pulse >= 40 ? "#F59E0B" : "#EF4444", boxShadow: `0 0 8px ${m.pulse >= 70 ? "#10B981" : m.pulse >= 40 ? "#F59E0B" : "#EF4444"}` }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0", fontFamily: "var(--font-mono)" }}>{m.pulse}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{m.msgs}</span>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{m.commits}</span>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{m.meetings}</span>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{m.focus}</span>
                <div>
                  {m.alert ? (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: m.alert.bg,
                        border: `1px solid ${m.alert.border}`,
                        color: m.alert.color,
                        letterSpacing: "0.02em"
                      }}
                    >
                      {m.alert.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#475569" }}>Tracking</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
