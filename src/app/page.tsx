import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WaitlistForm from "./_components/WaitlistForm";
import DashboardTabs from "./_components/DashboardTabs";
import FAQAccordion from "./_components/FAQAccordion";
import ScrollReveal from "./_components/ScrollReveal";

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
    "Radar reads your team's work signals — GitHub, Slack, Jira — to surface quiet risks before they become surprises. No surveys. No check-ins. No behavior change required.",
};

// ── SVG Icon primitives ─────────────────────────────────────────────────────

function IconGitHub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconSlack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function IconJira() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35H17.9V6.2a4.35 4.35 0 0 0-4.35-4.2zm-1.06 4.38c0 2.4 1.97 4.34 4.35 4.34h2.02a4.35 4.35 0 0 0-4.34-4.34zm-1.06 4.38c0 2.4 1.97 4.35 4.35 4.35h2.02a4.35 4.35 0 0 0-4.34-4.35zm-8.88 9.24a4.35 4.35 0 0 0 4.35-4.35V13.6H2.86a4.35 4.35 0 0 0 0 8.7h1.7V20.24a4.35 4.35 0 0 1-4-4.24zm10.47-4.17H8.94a4.35 4.35 0 0 0 0 8.7h2.02a4.35 4.35 0 0 0-4.35-4.35z" />
    </svg>
  );
}

function IconZoom() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.5 4C2.57 4 1 5.57 1 7.5v9C1 18.43 2.57 20 4.5 20h10c1.93 0 3.5-1.57 3.5-3.5v-2.1l4.7 3.52A.5.5 0 0 0 24 17.5V6.5a.5.5 0 0 0-.8-.4L18.5 9.6V7.5C18.5 5.57 16.93 4 15 4z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
    </svg>
  );
}

// ── Color helpers for feature card gradients ─────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: <IconGraph />,
    title: "Signal Intelligence",
    body: "Correlates data across GitHub, Slack, Jira, and Calendar simultaneously. No single-tool blind spots.",
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.12)",
  },
  {
    icon: <IconBolt />,
    title: "Exception-only Alerts",
    body: "You only see what actually needs your attention. No reports, no dashboards to check, no noise.",
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.12)",
  },
  {
    icon: <IconBrain />,
    title: "Employee Value Score",
    body: "AI-computed EVS for every task. Complexity-weighted, not activity-based. Measures output, not presence.",
    accent: "#06B6D4",
    glow: "rgba(6,182,212,0.12)",
  },
  {
    icon: <IconEye />,
    title: "Zero Employee Friction",
    body: "Nothing for employees to install. No surveys. No behavior change. Works silently in the background.",
    accent: "#10B981",
    glow: "rgba(16,185,129,0.12)",
  },
  {
    icon: <IconShield />,
    title: "Privacy-first Architecture",
    body: "Aggregated signals, never surveillance. No message content is read. SOC 2 compliant design.",
    accent: "#F59E0B",
    glow: "rgba(245,158,11,0.12)",
  },
  {
    icon: <IconUsers />,
    title: "Multi-layer Views",
    body: "CEO sees company risk. Managers see team health. HR sees people signals. One platform, three lenses.",
    accent: "#EC4899",
    glow: "rgba(236,72,153,0.12)",
  },
];

const PRICING_TIERS = [
  {
    name: "Manager",
    price: "$39",
    period: "/seat/mo",
    desc: "For team leads and engineering managers",
    features: [
      "Team signal dashboard",
      "Exception alerts (Slack/email)",
      "GitHub + Jira integration",
      "EVS per employee",
      "14-day history",
    ],
    cta: "Join waitlist",
    popular: false,
    accent: "#3B82F6",
  },
  {
    name: "HR",
    price: "$39",
    period: "/seat/mo",
    desc: "For people ops and HR teams",
    features: [
      "People signal dashboard",
      "Burnout & disengagement alerts",
      "Slack + Calendar integration",
      "Wellbeing trend tracking",
      "90-day history",
    ],
    cta: "Join waitlist",
    popular: false,
    accent: "#8B5CF6",
  },
  {
    name: "Executive",
    price: "$79",
    period: "/seat/mo",
    desc: "For VPs, Directors, and C-Suite",
    features: [
      "Everything in Manager + HR",
      "Org-wide exception view",
      "Cross-team correlation",
      "Benchmarking by team/role",
      "Unlimited history",
      "API access",
    ],
    cta: "Join waitlist",
    popular: true,
    accent: "#06B6D4",
  },
];

const TRUST_LOGOS = [
  "Series A SaaS",
  "150-person Startup",
  "Engineering orgs",
  "Remote-first teams",
  "Hypergrowth cos",
  "VC-backed startups",
  "Product teams",
  "Series B & C",
];

// ── Main page ────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/check-in");

  const count = await getWaitlistCount();
  const displayCount = count > 50 ? `${Math.floor(count / 50) * 50}+` : "500+";

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(2,8,23,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            padding: "0 24px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(59,130,246,0.4)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="9" />
                <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                <line x1="21" y1="12" x2="21.01" y2="12" strokeWidth="3" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                color: "#F1F5F9",
                letterSpacing: "-0.02em",
              }}
            >
              Radar
            </span>
          </div>

          {/* Right nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href="/login"
              className="nav-link"
              style={{
                padding: "7px 16px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#94A3B8",
                textDecoration: "none",
                borderRadius: "8px",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              Sign in
            </a>
            <a
              href="#waitlist"
              style={{
                padding: "7px 16px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                boxShadow: "0 0 16px rgba(59,130,246,0.3)",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
            >
              Join waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 80px",
          overflow: "hidden",
        }}
      >
        {/* Animated gradient background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -5%, rgba(59,130,246,0.28) 0%, transparent 65%),
              radial-gradient(ellipse 50% 50% at 80% 30%, rgba(139,92,246,0.18) 0%, transparent 55%),
              radial-gradient(ellipse 40% 40% at 20% 70%, rgba(59,130,246,0.1) 0%, transparent 50%),
              #020817
            `,
            pointerEvents: "none",
          }}
        />

        {/* Grid pattern */}
        <div
          className="grid-pattern"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        {/* Glowing orbs */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "60%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            animation: "glow-pulse 6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "10%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            animation: "glow-pulse 8s ease-in-out infinite reverse",
            pointerEvents: "none",
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "820px",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
            <span className="section-label" style={{ animation: "reveal-up 0.6s ease both" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <circle cx="5" cy="5" r="4" fill="#3B82F6" />
                <circle cx="5" cy="5" r="2" fill="#93C5FD" />
              </svg>
              Now accepting early access
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(2.75rem, 7vw, 5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#F8FAFC",
              margin: "0 0 24px",
              animation: "reveal-up 0.65s ease 0.1s both",
            }}
          >
            Stop being the
            <br />
            <span className="gradient-text-hero">last to know.</span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "clamp(1.0625rem, 2.5vw, 1.25rem)",
              lineHeight: 1.65,
              color: "#94A3B8",
              maxWidth: "580px",
              margin: "0 auto 40px",
              animation: "reveal-up 0.65s ease 0.2s both",
            }}
          >
            Radar reads your team&apos;s work signals — GitHub, Slack, Jira — to surface quiet
            risks before they become problems.{" "}
            <strong style={{ color: "#CBD5E1", fontWeight: 500 }}>
              No surveys. No check-ins. No behavior change required.
            </strong>
          </p>

          {/* CTA + social proof */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              animation: "reveal-up 0.65s ease 0.3s both",
            }}
          >
            <div id="waitlist" style={{ width: "100%", maxWidth: "520px" }}>
              <WaitlistForm />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#475569", margin: 0 }}>
              Joined by{" "}
              <strong style={{ color: "#64748B" }}>{displayCount} engineering leaders</strong>.
              {" "}Free during beta.
            </p>
          </div>

          {/* Integration logos row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "48px",
              flexWrap: "wrap",
              animation: "reveal-up 0.65s ease 0.4s both",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "#475569", marginRight: "8px" }}>Connects with</span>
            {[
              { label: "GitHub", icon: <IconGitHub /> },
              { label: "Slack", icon: <IconSlack /> },
              { label: "Jira", icon: <IconJira /> },
              { label: "Zoom", icon: <IconZoom /> },
            ].map(({ label, icon }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "9999px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "#64748B",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                {icon}
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Floating dashboard preview */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: "900px",
            marginTop: "64px",
            animation: "reveal-up 0.8s ease 0.5s both",
          }}
        >
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: `
                0 0 0 1px rgba(59,130,246,0.15),
                0 32px 80px rgba(0,0,0,0.6),
                0 0 60px rgba(59,130,246,0.1)
              `,
              animation: "float 6s ease-in-out infinite",
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                background: "#0F1629",
                padding: "11px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EF4444", opacity: 0.65 }} />
              <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#F59E0B", opacity: 0.65 }} />
              <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#10B981", opacity: 0.65 }} />
              <div
                style={{
                  flex: 1,
                  marginLeft: "10px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "7px",
                  padding: "4px 12px",
                  fontSize: "11.5px",
                  color: "#475569",
                  letterSpacing: "0.01em",
                }}
              >
                app.radariq.io/overview
              </div>
            </div>
            {/* Import the DashboardMockup inline here */}
            <HeroDashboard />
          </div>
        </div>

        {/* Bottom fade gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "200px",
            background: "linear-gradient(to top, #020817, transparent)",
            pointerEvents: "none",
          }}
        />
      </section>

      {/* ── SOCIAL PROOF STRIP ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "0 0 80px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <ScrollReveal>
          <p
            style={{
              textAlign: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#475569",
              marginBottom: "24px",
            }}
          >
            Early access teams
          </p>
        </ScrollReveal>

        {/* Ticker */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              gap: "0",
              animation: "ticker 24s linear infinite",
              width: "max-content",
            }}
          >
            {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 32px",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {logo}
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "120px", height: "100%", background: "linear-gradient(to right, #020817, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "100%", background: "linear-gradient(to left, #020817, transparent)", pointerEvents: "none" }} />
        </div>

        {/* Stats row */}
        <div style={{ marginTop: "64px", maxWidth: "var(--content-max-width)", margin: "64px auto 0", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              { stat: "< 10 min", label: "setup time", sub: "No eng required" },
              { stat: "50+", label: "signals tracked", sub: "Per employee" },
              { stat: "24h", label: "first exceptions", sub: "After connecting" },
              { stat: "0", label: "employee actions", sub: "Required" },
            ].map(({ stat, label, sub }, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div
                  style={{
                    padding: "32px 24px",
                    background: "rgba(255,255,255,0.02)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2.25rem",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      background: "linear-gradient(135deg, #F1F5F9 0%, #93C5FD 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      lineHeight: 1,
                      marginBottom: "8px",
                    }}
                  >
                    {stat}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "4px" }}>{sub}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM SECTION ────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              The problem
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.15,
                margin: "16px 0 20px",
              }}
            >
              Your team is sending signals.
              <br />
              <span className="gradient-text">You&apos;re missing them.</span>
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "#64748B",
                maxWidth: "520px",
                margin: "0 auto",
                lineHeight: 1.65,
              }}
            >
              Most manager tools require surveys, HR systems, or behavior change.
              The real signals are already flowing — no one is listening.
            </p>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              icon: "🤫",
              title: "The quiet performer",
              before: "Reliable, ships on time, lots of commits.",
              after: "Commits drop 80%. Slack messages stop. You find out during the quarterly review.",
              color: "#EF4444",
            },
            {
              icon: "🧱",
              title: "The silent blocker",
              before: "Ticket opened. In-progress for 11 days.",
              after: "No comment. No PR. You assume they're working on it. They've been stuck since day 2.",
              color: "#F59E0B",
            },
            {
              icon: "🔥",
              title: "The exhausted closer",
              before: "Closes 3x more tickets than anyone else.",
              after: "8h meeting load, zero focus time, skipping lunch. Ships everything. Until they don't.",
              color: "#8B5CF6",
            },
          ].map((card, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                className="glass-card"
                style={{
                  padding: "28px",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: card.color,
                    opacity: 0.7,
                  }}
                />
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "16px" }}>
                  {card.icon}
                </span>
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color: "#F1F5F9",
                    margin: "0 0 16px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {card.title}
                </h3>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748B",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    borderLeft: "2px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", color: "#475569", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>What you see</span>
                  {card.before}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#94A3B8",
                    lineHeight: 1.6,
                    padding: "10px 12px",
                    background: `rgba(${card.color === "#EF4444" ? "239,68,68" : card.color === "#F59E0B" ? "245,158,11" : "139,92,246"},0.06)`,
                    borderRadius: "8px",
                    borderLeft: `2px solid ${card.color}`,
                  }}
                >
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", color: card.color, opacity: 0.8, display: "block", marginBottom: "4px", textTransform: "uppercase" }}>What&apos;s actually happening</span>
                  {card.after}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <div className="divider" style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }} />

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              How it works
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.15,
                margin: "16px 0 20px",
              }}
            >
              Three steps.{" "}
              <span className="gradient-text">Zero friction.</span>
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "#64748B",
                maxWidth: "440px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Connect your tools in minutes. Radar handles everything else.
            </p>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            position: "relative",
          }}
        >
          {[
            {
              step: "01",
              icon: "🔌",
              title: "Connect your tools",
              desc: "One-click OAuth with GitHub, Slack, Jira, and Google Calendar. No API keys. No scripts. No engineering required.",
              accent: "#3B82F6",
            },
            {
              step: "02",
              icon: "👁️",
              title: "Radar watches silently",
              desc: "Analyzes 50+ behavioral signals across your connected tools. Builds individual baselines. Identifies deviation patterns in real time.",
              accent: "#8B5CF6",
            },
            {
              step: "03",
              icon: "🎯",
              title: "Exceptions surface to you",
              desc: "Only the signals that need your attention reach your dashboard or inbox. Nothing else. No daily reports to check.",
              accent: "#06B6D4",
            },
          ].map((step, i) => (
            <ScrollReveal key={i} delay={i * 120}>
              <div
                className="glass-card"
                style={{
                  padding: "32px 28px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Step number watermark */}
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "20px",
                    fontSize: "4rem",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {step.step}
                </div>

                {/* Icon */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: `rgba(${step.accent === "#3B82F6" ? "59,130,246" : step.accent === "#8B5CF6" ? "139,92,246" : "6,182,212"},0.12)`,
                    border: `1px solid ${step.accent}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.375rem",
                    marginBottom: "20px",
                  }}
                >
                  {step.icon}
                </div>

                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "#F1F5F9",
                    margin: "0 0 12px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    color: "#64748B",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <div className="divider" style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }} />

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              Features
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.15,
                margin: "16px 0 20px",
              }}
            >
              Built for how
              <br />
              <span className="gradient-text">modern teams actually work.</span>
            </h2>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {FEATURE_CARDS.map((card, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                className="feature-card"
                style={{
                  padding: "28px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px",
                  cursor: "default",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "11px",
                    background: card.glow,
                    border: `1px solid ${card.accent}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.accent,
                    marginBottom: "18px",
                  }}
                >
                  {card.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color: "#F1F5F9",
                    margin: "0 0 10px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#64748B",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {card.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <div className="divider" style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }} />

      {/* ── DASHBOARD PREVIEW ──────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              Dashboard
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.15,
                margin: "16px 0 20px",
              }}
            >
              One view for
              <br />
              <span className="gradient-text">every layer of leadership.</span>
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "#64748B",
                maxWidth: "480px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Whether you&apos;re a team lead, VP, or Head of People — Radar surfaces exactly the
              context you need to act.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <DashboardTabs />
        </ScrollReveal>
      </section>

      <div className="divider" style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }} />

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              Pricing
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.15,
                margin: "16px 0 20px",
              }}
            >
              Simple, transparent pricing.
              <br />
              <span className="gradient-text">Free during beta.</span>
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "#64748B",
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              Join the waitlist for free access. Pricing kicks in at GA.
            </p>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {PRICING_TIERS.map((tier, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                style={{
                  padding: "32px 28px",
                  borderRadius: "20px",
                  background: tier.popular
                    ? "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.08) 100%)"
                    : "rgba(255,255,255,0.03)",
                  border: tier.popular
                    ? "1px solid rgba(59,130,246,0.3)"
                    : "1px solid rgba(255,255,255,0.07)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {tier.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      color: "white",
                      textTransform: "uppercase",
                    }}
                  >
                    Most popular
                  </div>
                )}

                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: tier.accent,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {tier.name}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 800,
                      color: "#F1F5F9",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {tier.price}
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 400 }}>
                    {tier.period}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748B",
                    margin: "0 0 24px",
                    lineHeight: 1.4,
                  }}
                >
                  {tier.desc}
                </p>

                <a
                  href="#waitlist"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "11px 20px",
                    borderRadius: "10px",
                    background: tier.popular
                      ? "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)"
                      : "rgba(255,255,255,0.06)",
                    border: tier.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    marginBottom: "24px",
                    boxShadow: tier.popular ? "0 0 24px rgba(59,130,246,0.3)" : "none",
                  }}
                >
                  {tier.cta}
                </a>

                <div className="divider" style={{ marginBottom: "24px" }} />

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tier.features.map((f, fi) => (
                    <li
                      key={fi}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        fontSize: "0.875rem",
                        color: "#94A3B8",
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: `${tier.accent}18`,
                          border: `1px solid ${tier.accent}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: tier.accent,
                          marginTop: "1px",
                        }}
                      >
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <div className="divider" style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }} />

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 24px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span className="section-label" style={{ marginBottom: "20px", display: "inline-flex" }}>
              FAQ
            </span>
            <h2
              style={{
                fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#F1F5F9",
                lineHeight: 1.2,
                margin: "16px 0 0",
              }}
            >
              Questions we&apos;ve already
              <br />
              <span className="gradient-text">gotten from beta users.</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <FAQAccordion />
        </ScrollReveal>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 100px" }}>
        <ScrollReveal>
          <div
            style={{
              maxWidth: "860px",
              margin: "0 auto",
              borderRadius: "24px",
              padding: "72px 48px",
              textAlign: "center",
              background: `
                radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.2) 0%, transparent 65%),
                radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.15) 0%, transparent 55%),
                rgba(255,255,255,0.03)
              `,
              border: "1px solid rgba(59,130,246,0.2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Grid overlay */}
            <div
              className="grid-pattern"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.3,
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                <span className="section-label">
                  Early access open
                </span>
              </div>

              <h2
                style={{
                  fontSize: "clamp(1.875rem, 5vw, 3rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "#F8FAFC",
                  lineHeight: 1.1,
                  margin: "0 0 20px",
                }}
              >
                Don&apos;t wait for the problem
                <br />
                <span className="gradient-text-hero">to find you.</span>
              </h2>

              <p
                style={{
                  fontSize: "1.0625rem",
                  color: "#64748B",
                  maxWidth: "460px",
                  margin: "0 auto 40px",
                  lineHeight: 1.6,
                }}
              >
                Join the waitlist. First team connections are free.
                Setup takes under 10 minutes.
              </p>

              <div
                style={{
                  maxWidth: "520px",
                  margin: "0 auto",
                }}
              >
                <WaitlistForm />
              </div>

              <p
                style={{
                  marginTop: "20px",
                  fontSize: "0.8125rem",
                  color: "#475569",
                }}
              >
                No credit card. No commitment. Free during beta.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#475569", letterSpacing: "-0.02em" }}>
              Radar
            </span>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: "0.875rem",
                  color: "#475569",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link}
              </a>
            ))}
          </div>

          <p style={{ fontSize: "0.8125rem", color: "#334155", margin: 0 }}>
            © {new Date().getFullYear()} Radar. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Inline mini dashboard for the hero (avoids prop-drilling DashboardMockup) ──
// Uses the same data but rendered inline to allow hero-specific styling
function HeroDashboard() {
  const MEMBERS = [
    { name: "Alex Chen", role: "Eng Manager", pulse: 82, alert: null as null | { label: string; color: string; bg: string } },
    { name: "Priya Nair", role: "Senior SWE", pulse: 71, alert: null as null | { label: string; color: string; bg: string } },
    { name: "Jordan Lee", role: "Product Mgr", pulse: 44, alert: { label: "Overloaded", color: "#D97706", bg: "#FFFBEB" } },
    { name: "Sam Torres", role: "Senior SWE", pulse: 18, alert: { label: "Gone quiet", color: "#DC2626", bg: "#FEF2F2" } },
    { name: "Mia Kapoor", role: "Designer", pulse: 77, alert: null as null | { label: string; color: string; bg: string } },
  ];

  return (
    <div style={{ background: "#F8FAFC", padding: "16px" }}>
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Team Overview</div>
        <div
          style={{
            display: "flex",
            gap: "6px",
            fontSize: "10px",
            fontWeight: 500,
          }}
        >
          <span style={{ padding: "3px 8px", borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>2 exceptions</span>
          <span style={{ padding: "3px 8px", borderRadius: "4px", background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>3 healthy</span>
        </div>
      </div>

      {/* Mini team table */}
      <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            padding: "5px 12px",
            background: "#F1F5F9",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          {["Person", "Pulse", "Status"].map((h) => (
            <span key={h} style={{ fontSize: "9px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {h}
            </span>
          ))}
        </div>
        {MEMBERS.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              padding: "8px 12px",
              borderBottom: i < MEMBERS.length - 1 ? "1px solid #F1F5F9" : "none",
              alignItems: "center",
              background: m.alert ? `${m.alert.bg}80` : "#FFFFFF",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A" }}>{m.name}</div>
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
            <div>
              {m.alert ? (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: m.alert.bg,
                    color: m.alert.color,
                  }}
                >
                  {m.alert.label}
                </span>
              ) : (
                <span style={{ fontSize: "9px", color: "#CBD5E1" }}>—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts strip */}
      <div
        style={{
          marginTop: "10px",
          padding: "10px 12px",
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: "7px",
          fontSize: "11px",
          color: "#C2410C",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontWeight: 700 }}>HIGH</span>
        <span style={{ color: "#7C2D12" }}>Sam Torres has been quiet for 6 days — DM cadence dropped 94%</span>
      </div>
    </div>
  );
}
