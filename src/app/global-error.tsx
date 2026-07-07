"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#050b13",
            color: "#e6edf7",
            display: "flex",
            fontFamily: "sans-serif",
            minHeight: "100vh",
            padding: "2rem",
          }}
        >
          <section
            style={{
              border: "1px solid rgba(143, 168, 196, 0.28)",
              borderRadius: "1rem",
              margin: "0 auto",
              maxWidth: "42rem",
              padding: "2rem",
            }}
          >
            <p style={{ color: "#f3b35f", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Critical Portal Error
            </p>
            <h1>Something failed while starting the command portal.</h1>
            <p style={{ color: "#9fb0c4", lineHeight: 1.7 }}>
              Refresh the page or return after the operator verifies the deployment.{" "}
              {error.digest ? `Reference: ${error.digest}.` : ""}
            </p>
            <button
              onClick={reset}
              style={{
                background: "#6f98c9",
                border: 0,
                borderRadius: "0.625rem",
                color: "#07111d",
                cursor: "pointer",
                fontWeight: 700,
                marginTop: "1rem",
                padding: "0.75rem 1rem",
              }}
              type="button"
            >
              Try Again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
