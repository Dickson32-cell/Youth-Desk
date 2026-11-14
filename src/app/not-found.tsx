import Link from "next/link";

// Clean 404: no framework fingerprints, no hints about the internal structure.
export default function NotFound() {
  return (
    <div style={{
      minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", textAlign: "center",
    }}>
      <div style={{ maxWidth: 480 }}>
        <svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="#1c3f6e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 12 }}><circle cx="21" cy="21" r="13" /><path d="m42 42-10-10" /><path d="M15 21h12" /></svg>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#12294a", marginBottom: 8 }}>Page not found</h2>
        <p style={{ fontSize: 14, color: "#5b6b86", lineHeight: 1.6, marginBottom: 18 }}>
          The page you are looking for does not exist or has moved.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary" style={{ minHeight: 44, padding: "0 20px", fontWeight: 700, textDecoration: "none" }}>
            Main page
          </Link>
          <Link href="/report" className="btn btn-ghost" style={{ minHeight: 44, padding: "0 20px", fontWeight: 700, textDecoration: "none" }}>
            Report an issue
          </Link>
        </div>
      </div>
    </div>
  );
}
