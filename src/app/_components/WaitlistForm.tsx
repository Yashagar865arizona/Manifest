"use client";

import { useState } from "react";

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
          background: "var(--color-green-50)",
          border: "1px solid var(--color-green-600)",
          borderRadius: "var(--radius-lg)",
          color: "var(--color-green-600)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        <span>✓</span>
        <span>You&apos;re on the list. We&apos;ll be in touch.</span>
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="work@company.com"
          style={{
            flex: "1 1 220px",
            padding: "12px 16px",
            fontSize: "var(--font-size-base)",
            border: `1px solid ${state === "error" || state === "duplicate" ? "var(--border-error)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            outline: "none",
            transition: "border-color var(--transition-base)",
            minWidth: "0",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--border-focus)";
            e.target.style.boxShadow = "var(--shadow-focus)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = state === "error" || state === "duplicate" ? "var(--border-error)" : "var(--border-default)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          style={{
            padding: "12px 24px",
            background: state === "loading" ? "var(--action-primary-hover)" : "var(--action-primary)",
            color: "var(--action-primary-text)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-medium)",
            cursor: state === "loading" ? "not-allowed" : "pointer",
            transition: "background var(--transition-base)",
            whiteSpace: "nowrap",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
          onMouseEnter={(e) => {
            if (state !== "loading") {
              (e.target as HTMLButtonElement).style.background = "var(--action-primary-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (state !== "loading") {
              (e.target as HTMLButtonElement).style.background = "var(--action-primary)";
            }
          }}
        >
          {state === "loading" ? "Joining…" : "Join the waitlist →"}
        </button>
      </form>

      {(state === "error" || state === "duplicate") && (
        <p
          style={{
            marginTop: "8px",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-error)",
          }}
        >
          {state === "duplicate"
            ? "That email is already on the list."
            : "Something went wrong. Please try again."}
        </p>
      )}
    </div>
  );
}
