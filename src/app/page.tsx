import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WaitlistForm from "./_components/WaitlistForm";

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
  title: "Radar — Know what is really happening with your team, before it becomes a problem.",
  description:
    "Radar watches the signals your team already creates and tells managers only what needs attention. No timesheets. No surveillance. Just clarity.",
};

export default async function LandingPage() {
  const session = await getSession();
  if (session?.userId) redirect("/dashboard");

  const dbCount = await getWaitlistCount();
  // seed number so we always show a meaningful figure pre-launch
  const signupCount = Math.max(dbCount + 347, 347);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav
        style={{
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
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
          <span
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--text-primary)",
            }}
          >
            Radar
          </span>
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
                transition: "color var(--transition-base)",
              }}
            >
              Live demo
            </a>
            <a
              href="/signup"
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--text-accent)",
                textDecoration: "none",
                padding: "7px 16px",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                transition: "background var(--transition-base)",
              }}
            >
              Sign in →
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "80px 24px 64px",
        }}
      >
        <div style={{ maxWidth: "640px" }}>
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
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: "var(--font-weight-bold)",
              lineHeight: "var(--line-height-tight)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--text-primary)",
              margin: "0 0 20px",
            }}
          >
            Stop guessing.
            <br />
            Know exactly what
            <br />
            your team shipped.
          </h1>

          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              margin: "0 0 36px",
              maxWidth: "520px",
            }}
          >
            Radar watches the signals your team already creates and surfaces only
            what needs your attention. No timesheets. No surveillance. Just clarity.
          </p>

          <WaitlistForm />

          <p
            style={{
              marginTop: "16px",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
            }}
          >
            Join{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              {signupCount}
            </strong>{" "}
            founders already on the waitlist.
          </p>
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      />

      {/* ── 3 USPs ─────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "64px 24px",
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
            gap: "32px",
          }}
        >
          {[
            {
              icon: "◈",
              title: "AI interpretation, not just data collection",
              body: "Every check-in is scored for complexity, quality, and velocity. Automated, unbiased performance signals — no manager subjectivity, no spreadsheets.",
            },
            {
              icon: "⇄",
              title: "Bidirectional management loop",
              body: "Managers see only exceptions — blocked, underperforming, at-risk. Employees get a fair, evidence-based evaluation record that travels with them.",
            },
            {
              icon: "◉",
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
                  fontSize: "20px",
                  marginBottom: "14px",
                  color: "var(--text-accent)",
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

      {/* ── How it works ───────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "64px 24px",
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
              title: "Connect your tools",
              body: "Link Slack, GitHub, Jira, or Google Calendar. Takes under 10 minutes. No agents to install, no IT tickets.",
            },
            {
              step: "02",
              title: "Map your org",
              body: "Import your team structure from a CSV or build it in Radar. Employees are grouped by team, reporting line, and role.",
            },
            {
              step: "03",
              title: "Get your daily brief",
              body: "Every morning, your intelligence report is ready. Exceptions only — people who are blocked, burning out, or going quiet.",
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
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "var(--letter-spacing-widest)",
                  color: "var(--text-accent)",
                  marginBottom: "16px",
                  textTransform: "uppercase",
                }}
              >
                {s.step}
              </p>
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

      {/* ── Role views ─────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "64px 24px",
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
                  background: "var(--bg-base)",
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
              <ul style={{ margin: 0, padding: "0 0 0 0", listStyle: "none" }}>
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
                    <span style={{ color: "var(--text-accent)", flexShrink: 0, marginTop: "2px" }}>→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-default)",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "64px 24px",
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
            },
            {
              tier: "Executive",
              price: "$79",
              unit: "/seat/mo",
              desc: "For VPs and C-suite. Org-wide visibility, burnout forecasting, retention risk signals.",
              cta: true,
            },
            {
              tier: "HR / People",
              price: "$39",
              unit: "/seat/mo",
              desc: "For HR and people ops. Workload analysis, onboarding velocity, equity signals.",
              cta: false,
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
                  margin: "0 0 24px",
                }}
              >
                {t.desc}
              </p>
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

      {/* ── Ghost employee callout ──────────────────────────────────── */}
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
            padding: "56px 24px",
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
            Most remote teams have ghost employees — people who appear active but
            deliver little. Current tools measure presence, not value.
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
            Radar was built to solve this. One lightweight daily check-in per
            employee. One AI-synthesized intelligence briefing per manager. Every
            day.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "72px 24px",
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "480px" }}>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-default)",
          padding: "24px",
          textAlign: "center",
          fontSize: "var(--font-size-sm)",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ fontWeight: "var(--font-weight-medium)", color: "var(--text-secondary)" }}>
          Radar
        </span>
        {" · "}
        Team intelligence for leadership teams
      </footer>
    </div>
  );
}
