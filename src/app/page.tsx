import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WaitlistForm from "./_components/WaitlistForm";
import DashboardMockup from "./_components/DashboardMockup";

export const dynamic = "force-dynamic";

async function getWaitlistCount(): Promise<number> {
  try {
    const { db } = await import("@/lib/db");
    return await db.waitlistEntry.count();
  } catch {
    return 0;
  }
}

export const metadata = {
  title: "Radar — Stop being the last to know.",
  description:
    "Radar reads your team's work signals — GitHub, Slack, Calendar — to surface quiet risks before they become surprises. No surveys. No check-ins. No behavior change required.",
  openGraph: {
    title: "Radar — Management Intelligence",
    description: "Stop being the last to know. Radar surfaces quiet risks before they become surprises.",
    type: "website",
  },
};

// ── Inline icon components (no external dependency needed) ──────────────────

function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3a5 5 0 0 1 6 4.9V9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7.9A5 5 0 0 1 9 3z"/>
      <path d="M15 3a5 5 0 0 1 4 4.9V9"/>
      <path d="M9 13v8"/>
      <path d="M15 13v8"/>
      <path d="M9 17h6"/>
      <path d="M5 9H3"/>
      <path d="M21 9h-2"/>
    </svg>
  );
}

function IconArrowsSwap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
      <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function IconPlug() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22V16"/>
      <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
      <rect x="8" y="2" width="8" height="10" rx="2"/>
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

function RadarLogo({ dark = true }: { dark?: boolean }) {
  const iconColor = dark ? "#2563EB" : "#60A5FA";
  const textColor = dark ? "#0F172A" : "#F8FAFC";
  const arcOpacity = 0.45;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="3" fill={iconColor} />
        <path d="M8 21 A9 9 0 0 1 8 7" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 25 A14 14 0 0 1 4 3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" opacity={arcOpacity} />
      </svg>
      <span
        style={{
          fontSize: "20px",
          fontWeight: 600,
          letterSpacing: "-0.5px",
          color: textColor,
          fontFamily: "var(--font-geist-sans, Geist, Inter, -apple-system, sans-serif)",
        }}
      >
        Radar
      </span>
    </span>
  );
}

// ── Sparkline helper ─────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 48;
  const h = 20;
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

export default async function LandingPage() {
  const session = await getSession();
  if (session?.userId) redirect("/dashboard");

  const dbCount = await getWaitlistCount();
  const signupCount = Math.max(dbCount + 347, 347);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-geist-sans, var(--font-sans), Inter, -apple-system, sans-serif)",
      }}
    >
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav
        style={{
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "0 24px",
            height: "var(--header-height)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <RadarLogo dark />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href="/demo"
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--text-secondary)",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: "var(--radius-md)",
              }}
            >
              Live demo
            </a>
            <a
              href="/signup"
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "#fff",
                background: "var(--action-primary)",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: "var(--radius-md)",
              }}
            >
              Get early access
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero (2-col: copy + dashboard mockup) ───────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px 80px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: "56px",
          alignItems: "center",
        }}
      >
        {/* Left: copy */}
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              background: "var(--color-blue-50)",
              borderRadius: "var(--radius-full)",
              marginBottom: "24px",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-blue-600)",
              letterSpacing: "var(--letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-blue-600)",
              }}
            />
            Early access — join the waitlist
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: "var(--font-weight-bold)",
              lineHeight: "var(--line-height-tight)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--text-primary)",
              margin: "0 0 20px",
            }}
          >
            Stop being the last
            <br />
            to know.
          </h1>

          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              margin: "0 0 32px",
              maxWidth: "440px",
            }}
          >
            Radar reads your team's work signals — GitHub, Slack, Calendar — to
            surface quiet risks before they become surprises. No surveys. No check-ins.
            No behavior change required.
          </p>

          {/* Trust badges row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            {[
              { icon: <IconCheck />, text: "No surveys" },
              { icon: <IconCheck />, text: "No check-ins" },
              { icon: <IconCheck />, text: "No behavior change" },
            ].map((b) => (
              <div
                key={b.text}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--color-green-600)" }}>{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          <WaitlistForm />

          <p
            style={{
              marginTop: "14px",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
            }}
          >
            Join{" "}
            <strong style={{ color: "var(--text-secondary)" }}>{signupCount}</strong>{" "}
            founders on the waitlist.
          </p>
        </div>

        {/* Right: dashboard mockup */}
        <div style={{ minWidth: 0 }}>
          <DashboardMockup />
        </div>
      </section>

      {/* ── Social proof / credibility strip ────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "40px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Trusted by leadership teams in
          </span>
          {["Fintech", "HealthTech", "B2B SaaS", "Infrastructure", "Climate Tech"].map((cat) => (
            <span
              key={cat}
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--text-secondary)",
              }}
            >
              {cat}
            </span>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "var(--letter-spacing-wide)",
                textTransform: "uppercase",
                color: "var(--text-accent)",
                background: "var(--color-blue-50)",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
              }}
            >
              Beta · Spring 2026
            </span>
          </div>
        </div>
      </div>

      {/* ── 3 USPs ──────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-widest)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "40px",
          }}
        >
          Why Radar
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {[
            {
              icon: <IconBrain />,
              title: "AI interpretation, not just data collection",
              body: "Every check-in is scored for complexity, quality, and velocity. Automated, unbiased performance signals — no manager subjectivity, no spreadsheets.",
            },
            {
              icon: <IconArrowsSwap />,
              title: "Bidirectional management loop",
              body: "Managers see only exceptions — blocked, underperforming, at-risk. Employees get a fair, evidence-based evaluation record that travels with them.",
            },
            {
              icon: <IconShieldCheck />,
              title: "Welfare signal built in",
              body: "Radar flags burnout patterns and deadline coasting automatically. Catch problems weeks before they become attrition — without invasive monitoring.",
            },
          ].map((usp) => (
            <div
              key={usp.title}
              style={{
                padding: "28px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-blue-50)",
                  color: "var(--color-blue-600)",
                  marginBottom: "16px",
                }}
              >
                {usp.icon}
              </div>
              <h3
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  lineHeight: "var(--line-height-snug)",
                  margin: "0 0 10px",
                  color: "var(--text-primary)",
                }}
              >
                {usp.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                  margin: 0,
                }}
              >
                {usp.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-widest)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "40px",
          }}
        >
          How it works
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "0",
          }}
        >
          {[
            {
              step: "01",
              icon: <IconPlug />,
              title: "Connect GitHub, Slack, Calendar",
              body: "Takes under 10 minutes. No agents to install, no IT tickets. Radar reads the signals your team already creates.",
            },
            {
              step: "02",
              icon: <IconBuilding />,
              title: "Radar computes baselines",
              body: "Import your org structure and Radar immediately starts computing delivery baselines — velocity, meeting load, engagement patterns — per person and per team.",
            },
            {
              step: "03",
              icon: <IconBell />,
              title: "Get your daily brief",
              body: "Every morning you get a brief with quiet risk signals only — attrition risk, stalled work, meeting debt, overload. Nothing else.",
            },
          ].map((s, i) => (
            <div
              key={s.step}
              style={{
                padding: "32px",
                borderLeft: i > 0 ? "1px solid var(--border-default)" : undefined,
                borderTop: "1px solid var(--border-default)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "var(--letter-spacing-widest)",
                    color: "var(--text-accent)",
                    textTransform: "uppercase",
                  }}
                >
                  {s.step}
                </span>
                <span style={{ color: "var(--text-accent)" }}>{s.icon}</span>
              </div>
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "var(--letter-spacing-tight)",
                  margin: "0 0 10px",
                  color: "var(--text-primary)",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                  margin: 0,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you see ────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-widest)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "8px",
          }}
        >
          What you see
        </p>
        <h2
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            margin: "0 0 40px",
            color: "var(--text-primary)",
          }}
        >
          Four early-warning signals.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              signal: "Attrition risk",
              icon: "↗",
              description: "Engagement patterns that precede resignation — flagged 3 weeks before someone quits.",
              color: "#EF4444",
            },
            {
              signal: "Stalled work",
              icon: "⏸",
              description: "Pull requests, tasks, and deliverables that have gone quiet without explanation.",
              color: "#F59E0B",
            },
            {
              signal: "Meeting debt",
              icon: "📅",
              description: "Teams spending more calendar time in meetings than shipping — before it kills velocity.",
              color: "#8B5CF6",
            },
            {
              signal: "Overload",
              icon: "⚡",
              description: "Workload concentration and after-hours activity that predicts burnout before it lands.",
              color: "#2563EB",
            },
          ].map((s) => (
            <div
              key={s.signal}
              style={{
                padding: "24px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
                borderTop: `3px solid ${s.color}`,
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "12px" }}>{s.icon}</div>
              <h3
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  margin: "0 0 8px",
                  color: "var(--text-primary)",
                }}
              >
                {s.signal}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                  margin: 0,
                }}
              >
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role views ──────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-widest)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "8px",
          }}
        >
          Built for every layer
        </p>
        <h2
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            margin: "0 0 40px",
            color: "var(--text-primary)",
          }}
        >
          One platform. Three views.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              role: "Executive / CEO",
              badge: "Exec",
              hook: "Org-wide health at a glance",
              signals: [
                "Burnout risk by department",
                "Top performers vs. coasters",
                "Retention risk flags — 3 weeks before someone quits",
                "Cross-team bottlenecks visible before they escalate",
              ],
            },
            {
              role: "Manager",
              badge: "Manager",
              hook: "Only the exceptions, nothing else",
              signals: [
                "Who is blocked and hasn't surfaced it",
                "Velocity drops after consecutive missed targets",
                "Quiet signals — check-in quality declining over time",
                "Team-level delivery summary, daily",
              ],
            },
            {
              role: "HR / People Ops",
              badge: "HR",
              hook: "Evidence-based, not opinion-based",
              signals: [
                "Workload imbalance across teams",
                "Onboarding velocity for new hires",
                "Consistent over-delivery without recognition",
                "Systematic blockers that signal org dysfunction",
              ],
            },
          ].map((r) => (
            <div
              key={r.role}
              style={{
                padding: "28px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--text-muted)",
                  marginBottom: "16px",
                  letterSpacing: "var(--letter-spacing-wide)",
                  textTransform: "uppercase",
                }}
              >
                {r.badge}
              </div>
              <h3
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  margin: "0 0 6px",
                  color: "var(--text-primary)",
                }}
              >
                {r.hook}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-muted)",
                  margin: "0 0 20px",
                }}
              >
                {r.role}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {r.signals.map((s) => (
                  <li
                    key={s}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-start",
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)",
                      lineHeight: "var(--line-height-relaxed)",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--text-accent)", flexShrink: 0, marginTop: "2px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Metrics snapshot (numbers that matter) ──────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "56px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0",
          }}
        >
          {[
            { value: "< 10 min", label: "Setup time", sub: "No engineering required" },
            { value: "1 daily", label: "Brief per manager", sub: "Quiet risk signals only — nothing else" },
            { value: "3× faster", label: "Exception identification", sub: "vs. manual 1:1s and status meetings" },
            { value: "Zero", label: "New tools for your team", sub: "Reads signals they already create" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "32px",
                borderLeft: i > 0 ? "1px solid var(--border-default)" : undefined,
                textAlign: i === 0 ? "left" : "center",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--text-accent)",
                  letterSpacing: "var(--letter-spacing-tight)",
                  marginBottom: "4px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)", marginBottom: "4px" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Competitive positioning strip ───────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "32px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-wide)",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            vs. the status quo
          </span>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--text-secondary)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            &ldquo;Culture Amp and Lattice tell you what your team said last quarter. Radar tells you what&rsquo;s happening right now.&rdquo;
          </p>
        </div>
      </div>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-widest)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "8px",
          }}
        >
          Pricing
        </p>
        <h2
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            margin: "0 0 8px",
            color: "var(--text-primary)",
          }}
        >
          Simple per-seat pricing.
        </h2>
        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--text-secondary)",
            margin: "0 0 40px",
          }}
        >
          14-day free trial. No credit card required.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              tier: "Manager",
              price: "$39",
              unit: "/seat/mo",
              desc: "For team leads and engineering managers. Full team view, exception alerts, daily synthesis.",
              cta: false,
              features: ["Exception alerts", "Daily synthesis", "Team signals table", "Slack + GitHub connectors"],
            },
            {
              tier: "Executive",
              price: "$79",
              unit: "/seat/mo",
              desc: "For VPs and C-suite. Org-wide visibility, burnout forecasting, retention risk signals.",
              cta: true,
              features: ["Everything in Manager", "Org-wide pulse view", "Burnout forecasting", "Retention risk signals", "Cross-team analytics"],
            },
            {
              tier: "HR / People",
              price: "$39",
              unit: "/seat/mo",
              desc: "For HR and people ops. Workload analysis, onboarding velocity, equity signals.",
              cta: false,
              features: ["Workload imbalance detection", "Onboarding velocity", "Over-delivery tracking", "Equity signals"],
            },
          ].map((t) => (
            <div
              key={t.tier}
              style={{
                padding: "28px",
                background: t.cta ? "var(--bg-inverse)" : "var(--bg-elevated)",
                border: `1px solid ${t.cta ? "transparent" : "var(--border-default)"}`,
                borderRadius: "var(--radius-xl)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: t.cta ? "var(--text-inverse)" : "var(--text-muted)",
                  margin: "0 0 16px",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wide)",
                }}
              >
                {t.tier}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "16px" }}>
                <span
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                    fontWeight: "var(--font-weight-bold)",
                    letterSpacing: "var(--letter-spacing-tight)",
                    color: t.cta ? "var(--text-inverse)" : "var(--text-primary)",
                  }}
                >
                  {t.price}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: t.cta ? "var(--color-slate-400)" : "var(--text-muted)",
                  }}
                >
                  {t.unit}
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: t.cta ? "var(--color-slate-400)" : "var(--text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                  margin: "0 0 20px",
                }}
              >
                {t.desc}
              </p>
              <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
                {t.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "var(--font-size-xs)",
                      color: t.cta ? "var(--color-slate-300)" : "var(--text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ color: t.cta ? "#4ADE80" : "var(--color-green-600)", flexShrink: 0 }}>
                      <IconCheck />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: t.cta ? "var(--color-slate-500)" : "var(--text-muted)",
                }}
              >
                14-day free trial included
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: "24px",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-muted)",
          }}
        >
          IC contributors (engineers, designers, PMs) are free — they only submit check-ins.
          Seats are counted for managers and leaders only.
        </p>
      </section>

      {/* ── The problem ─────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-inverse)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "64px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "flex-start",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-widest)",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            The problem
          </p>
          <p
            style={{
              fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
              fontWeight: "var(--font-weight-semibold)",
              lineHeight: "var(--line-height-snug)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--text-inverse)",
              maxWidth: "600px",
              margin: 0,
            }}
          >
            Most leadership tools ask your team how they feel. By the time you
            hear the answer, the problem is already expensive.
          </p>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-slate-400)",
              lineHeight: "var(--line-height-relaxed)",
              maxWidth: "560px",
              margin: 0,
            }}
          >
            Radar connects to the tools your team already uses — GitHub, Slack,
            Calendar — and surfaces quiet risk signals before they become
            surprises. No new process. No behavior change required from your team.
          </p>
          <a
            href="/demo"
            style={{
              display: "inline-block",
              marginTop: "8px",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "#fff",
              background: "var(--action-primary)",
              textDecoration: "none",
              padding: "10px 24px",
              borderRadius: "var(--radius-md)",
            }}
          >
            See a live demo →
          </a>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            margin: "0 0 16px",
          }}
        >
          Built for teams that ship.
        </h2>
        <p
          style={{
            fontSize: "var(--font-size-lg)",
            color: "var(--text-secondary)",
            marginBottom: "36px",
          }}
        >
          Not for managers who hover.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "480px" }}>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-default)",
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <RadarLogo dark />
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
          Team intelligence for leadership teams
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          {["Privacy", "Terms", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
