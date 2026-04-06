import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Radar",
  description: "How Radar collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const sections = [
    {
      title: "What we collect",
      body: `When you join our waitlist, we collect your email address. When you connect your tools (GitHub, Slack, Jira, Google Calendar), we collect activity metadata — timestamps, message counts, commit frequencies, and event data. We do NOT read message content, PR code, or document contents.`,
    },
    {
      title: "How we use your data",
      body: `Waitlist emails are used only to notify you of early access and product updates. You can unsubscribe at any time. Team activity metadata is used exclusively to generate signals, baselines, and exception alerts for your organization's administrators. We never sell, share, or use this data for advertising.`,
    },
    {
      title: "Data retention",
      body: `Waitlist data is retained until you unsubscribe or request deletion. Team signal data is retained for as long as you maintain an active account. On account cancellation, data is deleted within 30 days. You can request immediate deletion by emailing founders@radariq.io.`,
    },
    {
      title: "Third-party services",
      body: `We use Vercel for hosting (US-based), Resend for transactional email delivery, and Anthropic/OpenAI APIs for AI signal analysis. Each service has its own privacy policy. We share only the minimum data necessary to operate each integration.`,
    },
    {
      title: "Security",
      body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access to production systems is restricted to Radar employees. We follow SOC 2 Type II design principles. If you discover a security vulnerability, please disclose it responsibly to founders@radariq.io.`,
    },
    {
      title: "Your rights (GDPR/CCPA)",
      body: `You have the right to access, correct, export, or delete your personal data at any time. To exercise these rights, email founders@radariq.io. For California residents, we do not sell personal information and honor all CCPA opt-out requests. For EU/UK residents, our lawful basis for processing is legitimate interest for analytics and consent for email communications.`,
    },
    {
      title: "Contact",
      body: `For privacy questions or data requests, contact us at founders@radariq.io. We typically respond within 2 business days.`,
    },
  ];

  return (
    <div
      style={{
        background: "#020817",
        minHeight: "100vh",
        color: "#F1F5F9",
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Back nav */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            color: "#64748B",
            textDecoration: "none",
            marginBottom: "48px",
            transition: "color 0.15s",
          }}
        >
          ← Back to Radar
        </Link>

        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "#F1F5F9",
            margin: "0 0 8px",
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#475569",
            marginBottom: "48px",
          }}
        >
          Last updated: April 2026
        </p>

        <p
          style={{
            fontSize: "1rem",
            color: "#94A3B8",
            lineHeight: 1.7,
            marginBottom: "48px",
            padding: "16px 20px",
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: "10px",
          }}
        >
          Radar is built on a simple principle: your team&apos;s data belongs to you. We analyze
          signals to help you manage better — not to surveil, profile, or monetize your
          employees.
        </p>

        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#F1F5F9",
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
              }}
            >
              {s.title}
            </h2>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "#94A3B8",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {s.body}
            </p>
            {i < sections.length - 1 && (
              <div
                style={{
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                  marginTop: "40px",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
