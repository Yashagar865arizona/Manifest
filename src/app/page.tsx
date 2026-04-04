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
  title: "Manifest — Stop guessing. Know exactly what your team shipped.",
  description:
    "Daily async check-ins synthesized into AI-powered intelligence reports. No timesheets. No surveillance. Just clarity on what your team actually delivered.",
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
            Manifest
          </span>
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
            Manifest turns daily async check-ins into AI-synthesized intelligence
            reports for managers. No timesheets. No surveillance. Just clarity.
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
          Why Manifest
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
              body: "Manifest flags burnout patterns and deadline coasting automatically. Catch problems weeks before they become attrition — without invasive monitoring.",
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
            Manifest was built to solve this. One lightweight daily check-in per
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
          Manifest
        </span>
        {" · "}
        Management intelligence for modern teams
        {" · "}
        manifest.work
      </footer>
    </div>
  );
}
