"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Something went wrong</h2>
            <button
              onClick={reset}
              style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
