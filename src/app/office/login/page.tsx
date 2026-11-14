"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function Login() {
  const r = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState({ logo: "/api/media/10", main: "Youth Desk NJSMA" });

  // Brand identity follows the officer's console settings (emblem + words)
  useEffect(() => {
    const html = document.documentElement;
    setBrand({
      logo: html.getAttribute("data-logo-url") || "/api/media/10",
      main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA",
    });
  }, []);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Sign in failed");
      else r.push("/dashboard");
    } finally { setBusy(false); }
  }

  return (
    <main
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 14px", background: "#eef2f8",
      }}
    >
      <form
        onSubmit={go}
        style={{
          width: "100%", maxWidth: 400, background: "#fff", border: "1px solid #dbe4f0",
          borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(16,38,70,.12)",
        }}
      >
        <div style={{ background: "#1c3f6e", padding: "26px 22px 20px", textAlign: "center" }}>
          <img
            src={brand.logo} alt=""
            style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 10, background: "#fff", padding: 4 }}
          />
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 0.4, marginTop: 10 }}>{brand.main}</div>
          <div style={{ color: "#c9d7ea", fontSize: 11, letterSpacing: 2.4, marginTop: 4 }}>OFFICER CONSOLE — SIGN IN</div>
          <div style={{ width: 46, height: 3, background: "#d9a441", borderRadius: 2, margin: "12px auto 0" }} />
        </div>

        <div style={{ padding: "22px 22px 24px" }}>
          {err && (
            <div style={{ background: "#fdecec", border: "1px solid #f3c1c1", color: "#a33", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 14 }}>
              {err}
            </div>
          )}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: "#5b6b86", marginBottom: 6 }}>USERNAME</span>
            <input
              type="text" value={u} onChange={(e) => setU(e.target.value)}
              autoComplete="username" required
              placeholder="e.g. officer"
              style={{
                width: "100%", minHeight: 44, border: "1px solid #c9d5e5", borderRadius: 8,
                padding: "0 12px", fontSize: 15, color: "#12294a", outline: "none",
              }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 18 }}>
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: "#5b6b86", marginBottom: 6 }}>PASSWORD</span>
            <div style={{ width: "100%" }}>
              <PasswordInput value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required ariaLabel="Password" />
            </div>
          </label>
          <button
            className="btn btn-primary w-full"
            disabled={busy}
            style={{ minHeight: 46, fontWeight: 800, fontSize: 15, borderRadius: 8 }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid #e7edf5", padding: "12px 22px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#8fa2bd", lineHeight: 1.6 }}>
            New Juaben South Municipal Assembly — Youth Desk<br />
            Access for authorised desk officers only. Sign-ins are recorded.
          </div>
          <a href="/" style={{ fontSize: 12, color: "#1c3f6e", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 8 }}>
            Return to the public site
          </a>
        </div>
      </form>
    </main>
  );
}
