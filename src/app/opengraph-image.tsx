import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Radar — Management Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0F172A",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          fontFamily: "Inter, -apple-system, sans-serif",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
          {/* Radar icon */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="4" fill="#60A5FA" />
            <path d="M11 29 A13 13 0 0 1 11 11" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5 34 A20 20 0 0 1 5 6" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, color: "#F8FAFC" }}>
            Radar
          </span>
        </div>

        {/* Main headline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              color: "#F8FAFC",
              marginBottom: 24,
              maxWidth: 820,
            }}
          >
            Know what is really happening with your team.
          </div>
          <div style={{ fontSize: 24, color: "#94A3B8", maxWidth: 680, lineHeight: 1.5 }}>
            Radar watches the signals your team already creates and surfaces only what needs your attention.
          </div>
        </div>

        {/* Bottom bar: metric chips */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {[
            { label: "Team Pulse", value: "72/100", color: "#059669" },
            { label: "Active Alerts", value: "3", color: "#D97706" },
            { label: "Gone Quiet", value: "1", color: "#DC2626" },
            { label: "Overloaded", value: "2", color: "#D97706" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: 10,
                padding: "14px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {m.label}
              </span>
              <span style={{ fontSize: 28, fontWeight: 700, color: m.color, letterSpacing: -0.5 }}>
                {m.value}
              </span>
            </div>
          ))}

          <div style={{ flex: 1 }} />
          <div
            style={{
              alignSelf: "flex-end",
              fontSize: 15,
              color: "#475569",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 10,
              padding: "14px 22px",
            }}
          >
            radarintelligence.io
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
