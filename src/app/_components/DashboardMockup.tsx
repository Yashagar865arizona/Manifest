/**
 * DashboardMockup — static HTML mock of the Radar CEO dashboard
 * Used in the landing page hero to show a real product screenshot.
 * Server-safe: no client-side JS needed.
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
  { name: "Jordan Lee", role: "Product Mgr", pulse: 44, msgs: 22, commits: 0, meetings: "8.5h", focus: "0.5h", alert: { label: "Overloaded", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" } },
  { name: "Sam Torres", role: "Senior SWE", pulse: 18, msgs: 3, commits: 1, meetings: "0.5h", focus: "1.0h", alert: { label: "Gone quiet", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" } },
  { name: "Mia Kapoor", role: "Designer", pulse: 77, msgs: 71, commits: 0, meetings: "2.0h", focus: "6.5h", alert: null },
];

const ALERTS = [
  { sev: "HIGH", sevColor: "#C2410C", sevBg: "#FFF7ED", sevBorder: "#FED7AA", person: "Sam Torres", title: "Gone quiet for 6 days", detail: "No Slack messages, 1 commit. DM cadence dropped 94%.", tag: "Gone quiet" },
  { sev: "HIGH", sevColor: "#C2410C", sevBg: "#FFF7ED", sevBorder: "#FED7AA", person: "Jordan Lee", title: "Meeting overload — 8.5h today", detail: "Focus time is 30 min. PM burnout risk elevated.", tag: "Overloaded" },
  { sev: "MEDIUM", sevColor: "#92400E", sevBg: "#FFFBEB", sevBorder: "#FDE68A", person: "Alex Chen", title: "PR review backlog growing", detail: "14 open PRs, avg age 5 days. Velocity will drop.", tag: "Stalled work" },
];

export default function DashboardMockup() {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)",
        fontFamily: "inherit",
        fontSize: "13px",
        color: "#0F172A",
        maxWidth: "100%",
      }}
    >
      {/* Browser chrome bar */}
      <div
        style={{
          background: "#1E293B",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: "#334155",
            borderRadius: "5px",
            padding: "4px 12px",
            fontSize: "11px",
            color: "#94A3B8",
            textAlign: "center",
            maxWidth: "260px",
            margin: "0 auto",
          }}
        >
          app.radarintelligence.io/dashboard
        </div>
      </div>

      {/* App layout */}
      <div style={{ display: "flex", minHeight: "0" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "52px",
            background: "#0F172A",
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Logo mark */}
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="3" fill="#60A5FA" />
            <path d="M8 21 A9 9 0 0 1 8 7" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 25 A14 14 0 0 1 4 3" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </svg>
          {/* Nav icons */}
          {[
            // Dashboard grid
            <svg key="d" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
            // Users
            <svg key="u" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>,
            // Bar chart
            <svg key="c" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
            // Bell
            <svg key="n" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
          ]}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, background: "#F8FAFC", padding: "16px 20px", minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A", letterSpacing: "-0.3px" }}>Axiom Labs</div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "1px" }}>CEO View · Monday, April 6</div>
            </div>
            <div
              style={{
                fontSize: "11px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                padding: "3px 10px",
                borderRadius: "20px",
                fontWeight: 500,
              }}
            >
              3 alerts need review
            </div>
          </div>

          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "Team pulse", value: "72/100", color: "#059669", data: PULSE_DATA, sparkColor: "#059669" },
              { label: "Active alerts", value: "3", color: "#D97706", data: ALERTS_DATA, sparkColor: "#D97706" },
              { label: "Gone quiet", value: "1", color: "#DC2626", data: QUIET_DATA, sparkColor: "#DC2626" },
              { label: "Overloaded", value: "2", color: "#D97706", data: OVERLOAD_DATA, sparkColor: "#D97706" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: card.color }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      {card.label}
                    </span>
                  </div>
                  <Sparkline data={card.data} color={card.sparkColor} />
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.5px" }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts table */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              marginBottom: "10px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px 14px", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>Alerts requiring attention</span>
            </div>
            {ALERTS.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  borderBottom: i < ALERTS.length - 1 ? "1px solid #F8FAFC" : undefined,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.3px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: a.sevBg,
                    border: `1px solid ${a.sevBorder}`,
                    color: a.sevColor,
                    flexShrink: 0,
                    marginTop: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {a.sev}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "1px" }}>{a.title}</div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.detail}</div>
                </div>
                <span style={{ fontSize: "10px", color: "#94A3B8", flexShrink: 0, marginLeft: "auto" }}>{a.tag}</span>
              </div>
            ))}
          </div>

          {/* Team signals table */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px 14px", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>Team signals</span>
            </div>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.8fr 1.2fr",
                padding: "5px 14px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              {["Person", "Pulse", "Msgs", "Commits", "Meetings", "Focus", "Alerts"].map((h) => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {h}
                </span>
              ))}
            </div>
            {MEMBERS.map((m, i) => (
              <div
                key={m.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.8fr 1.2fr",
                  padding: "7px 14px",
                  borderBottom: i < MEMBERS.length - 1 ? "1px solid #F8FAFC" : undefined,
                  alignItems: "center",
                  background: m.alert ? "#FFFBF5" : undefined,
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#0F172A" }}>{m.name}</div>
                  <div style={{ fontSize: "9px", color: "#94A3B8" }}>{m.role}</div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: m.pulse >= 70 ? "#059669" : m.pulse >= 40 ? "#D97706" : "#DC2626",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {m.pulse}
                </span>
                <span style={{ fontSize: "11px", color: "#475569" }}>{m.msgs}</span>
                <span style={{ fontSize: "11px", color: "#475569" }}>{m.commits}</span>
                <span style={{ fontSize: "11px", color: "#475569" }}>{m.meetings}</span>
                <span style={{ fontSize: "11px", color: "#475569" }}>{m.focus}</span>
                <div>
                  {m.alert ? (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "9px",
                        fontWeight: 500,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: m.alert.bg,
                        border: `1px solid ${m.alert.border}`,
                        color: m.alert.color,
                      }}
                    >
                      {m.alert.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#CBD5E1" }}>—</span>
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
