"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const r = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
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
    <main className="main" style={{ maxWidth: 420, paddingTop: 40 }}>
      <form className="card" onSubmit={go}>
        <h2>Youth Desk sign in</h2>
        <p className="sub">For the desk officer. This page is not linked from the public site — staff open this address directly.</p>
        {err && <div className="alert-err">{err}</div>}
        <label className="fld"><span className="cap">Username</span>
          <input type="text" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
        </label>
        <label className="fld"><span className="cap">Password</span>
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
