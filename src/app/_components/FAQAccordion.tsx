"use client";

import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "How does Radar get signals without being intrusive?",
    a: "Radar connects to tools your team already uses — GitHub, Slack, Jira, Google Calendar — via OAuth. It reads activity metadata (commit frequency, message cadence, PR review latency, meeting load) without reading message content. Employees don't install anything or change their behavior.",
  },
  {
    q: "What is the Employee Value Score (EVS)?",
    a: "EVS is an AI-generated score (0–100) that represents the relative value of work completed by an individual over time. It weighs task complexity, delivery speed, collaboration, and output quality. It's designed to replace activity-based proxies like 'lines of code' with something closer to actual impact.",
  },
  {
    q: "Does Radar read our Slack messages?",
    a: "No. Radar only reads message metadata — timestamps, channel, thread depth, reaction counts — to infer communication patterns and silence anomalies. It does not read message content, and all signal processing happens server-side with strict data isolation per company.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are up and running in under 10 minutes. Connect GitHub in one click, Slack in one click, Jira in one click. Radar starts building baselines immediately and surfaces its first exceptions within 24 hours as it learns your team's normal patterns.",
  },
  {
    q: "Can employees see their own scores?",
    a: "Not in the current version. Radar is built for leadership visibility, not employee reporting. We're exploring opt-in personal dashboards for a future release — but only if it doesn't create gaming behavior.",
  },
  {
    q: "What makes this different from existing HR analytics tools?",
    a: "Most HR tools require surveys, manual data entry, or direct employee participation. Radar is fully passive — zero friction for employees. It also correlates signals across multiple tools simultaneously, which gives it context that single-source tools miss entirely.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {FAQS.map((item, i) => (
        <div
          key={i}
          style={{
            background: open === i ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${open === i ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: "12px",
            overflow: "hidden",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "18px 22px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 500,
                color: open === i ? "#F1F5F9" : "#CBD5E1",
                lineHeight: 1.4,
              }}
            >
              {item.q}
            </span>
            <span
              style={{
                flexShrink: 0,
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: open === i ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                color: open === i ? "#93C5FD" : "#64748B",
                fontSize: "16px",
                lineHeight: 1,
                transition: "transform 0.2s ease, background 0.2s ease, color 0.2s ease",
                transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
              }}
            >
              +
            </span>
          </button>
          <div
            style={{
              maxHeight: open === i ? "320px" : "0",
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <p
              style={{
                padding: "0 22px 18px",
                margin: 0,
                fontSize: "0.875rem",
                color: "#94A3B8",
                lineHeight: 1.7,
              }}
            >
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
