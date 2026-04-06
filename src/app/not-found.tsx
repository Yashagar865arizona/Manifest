// Force dynamic to prevent static prerender (Next.js 16 prerender bug workaround)
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Page not found
            </h2>
            <a
              href="/"
              style={{
                color: "#2563EB",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
