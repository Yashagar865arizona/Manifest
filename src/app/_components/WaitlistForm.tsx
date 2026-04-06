"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

type State = "idle" | "loading" | "success" | "duplicate" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        track("waitlist_signup");
        setState("success");
        setEmail("");
      } else if (res.status === 409) {
        setState("duplicate");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 20px",
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: "10px",
          color: "#10B981",
          fontSize: "0.9375rem",
          fontWeight: 500,
        }}
      >
        <span>✓</span>
        <span>You&apos;re on the list. We&apos;ll be in touch soon.</span>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="email"
          required
          aria-label="Work email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="work@company.com"
          style={{
            flex: "1 1 220px",
            padding: "13px 16px",
            fontSize: "1rem",
            border: `1px solid ${state === "error" || state === "duplicate" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "10px",
            background: "rgba(255,255,255,0.06)",
            color: "#F1F5F9",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            minWidth: "0",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(59,130,246,0.6)";
            e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor =
              state === "error" || state === "duplicate"
                ? "rgba(239,68,68,0.5)"
                : "rgba(255,255,255,0.12)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="btn-shimmer"
          style={{
            padding: "13px 24px",
            background:
              state === "loading"
                ? "rgba(59,130,246,0.6)"
                : "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: state === "loading" ? "not-allowed" : "pointer",
            transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
            whiteSpace: "nowrap",
            boxShadow:
              state === "loading"
                ? "none"
                : "0 0 24px rgba(59,130,246,0.35), 0 0 0 1px rgba(59,130,246,0.3)",
          }}
        >
          {state === "loading" ? "Requesting access…" : "Get early access →"}
        </button>
      </form>

      {state === "duplicate" && (
        <p
          style={{
            marginTop: "10px",
            fontSize: "0.875rem",
            color: "#93C5FD",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ✓ That email is already on the list — you&apos;re good.
        </p>
      )}

      {state === "error" && (
        <p
          style={{
            marginTop: "10px",
            fontSize: "0.875rem",
            color: "#FCA5A5",
            lineHeight: 1.5,
          }}
        >
          Something went wrong submitting the form.{" "}
          <a
            href="mailto:founders@radariq.io?subject=Waitlist signup"
            style={{ color: "#93C5FD", textDecoration: "underline" }}
          >
            Email us directly
          </a>{" "}
          and we&apos;ll add you manually.
        </p>
      )}
    </div>
  );
}
