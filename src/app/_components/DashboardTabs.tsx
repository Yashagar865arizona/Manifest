"use client";

import { useState } from "react";
import DashboardMockup from "./DashboardMockup";

const TABS = [
  { id: "ceo", label: "CEO View", desc: "Company-wide exception summary" },
  { id: "manager", label: "Manager View", desc: "Team-level risk tracking" },
  { id: "hr", label: "HR View", desc: "People signals & burnout alerts" },
] as const;

export default function DashboardTabs() {
  const [active, setActive] = useState<"ceo" | "manager" | "hr">("ceo");

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "rgba(255,255,255,0.04)",
          padding: "4px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.07)",
          width: "fit-content",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              padding: "8px 20px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: active === tab.id ? 600 : 400,
              transition: "all 0.15s ease",
              background:
                active === tab.id
                  ? "rgba(59,130,246,0.15)"
                  : "transparent",
              color: active === tab.id ? "#93C5FD" : "#64748B",
              boxShadow:
                active === tab.id
                  ? "0 0 0 1px rgba(59,130,246,0.25)"
                  : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content description */}
      <p
        style={{
          fontSize: "0.875rem",
          color: "#64748B",
          marginBottom: "16px",
          letterSpacing: "0.01em",
        }}
      >
        {TABS.find((t) => t.id === active)?.desc}
      </p>

      {/* Dashboard mockup with a browser-like frame */}
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          transform: "scale(0.97)",
          transformOrigin: "top center",
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            background: "#1E293B",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", opacity: 0.6 }} />
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", opacity: 0.6 }} />
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981", opacity: 0.6 }} />
          <div
            style={{
              flex: 1,
              marginLeft: "8px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11px",
              color: "#64748B",
            }}
          >
            app.radariq.io/{active === "ceo" ? "overview" : active === "manager" ? "team" : "people"}
          </div>
        </div>
        {/* Dashboard content */}
        <DashboardMockup />
      </div>
    </div>
  );
}
