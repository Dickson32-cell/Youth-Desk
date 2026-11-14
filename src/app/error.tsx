"use client";

// Global error boundary: a clean NJSMA-styled fallback. It never shows stack
// traces or internal messages - the details stay in the server logs only.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{
      minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", textAlign: "center",
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>⚠</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#12294a", marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: "#5b6b86", lineHeight: 1.6, marginBottom: 18 }}>
          The page could not be loaded just now. Your case numbers, programmes and all records are safe.
          Please try again; if it keeps happening, come back a little later.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => reset()}
          style={{ minHeight: 44, padding: "0 20px", fontWeight: 700 }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
