"use client";

import { useEffect, useState } from "react";

// Public programme sign-up: youth who cannot walk to the office register
// interest for an open municipal programme. Instant, no login, no money.
// With a phone the youth gets ONE confirmation SMS from the desk.
type OpenProg = {
  id: number; title: string; description: string; category: string;
  deadline: string | null; venue: string | null; seats: number | null; registered: number;
};

export default function ProgrammesOpen() {
  const [rows, setRows] = useState<OpenProg[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [f, setF] = useState({ name: "", phone: "", area: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () => {
    fetch("/api/public/programmes")
      .then((r) => r.json())
      .then((j) => setRows(j.rows || []))
      .catch(() => setRows([]));
  };
  useEffect(load, []);

  async function submit(e: React.FormEvent, p: OpenProg) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/public/programmes/" + p.id + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error || "Could not register now. Try again."); return; }
    setDone(j.message || "You are registered.");
    setF({ name: "", phone: "", area: "" });
    load();
  }

  const catLabel = (c: string) => (["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(c) ? c[0] + c.slice(1).toLowerCase() : c[0] + c.slice(1).toLowerCase());

  // Hidden while loading AND when nothing is open: the heading/intro never
  // flashes on a refresh, and it vanishes the moment the officer closes a
  // programme.
  if (rows === null || rows.length === 0) return null;

  return (
    <section className="main paper-boardsec" id="programmes-open">
      <h3 className="paper-sect">On the board <span>PROGRAMMES OPEN FOR REGISTRATION</span></h3>
      <div className="newsgrid">
        {(rows ?? []).map((p) => {
          const remaining = p.seats ? Math.max(0, p.seats - p.registered) : null;
          const full = p.seats !== null && p.seats > 0 && p.registered >= p.seats;
          return (
            <article key={p.id} style={{ background: "#fff", border: "none", borderTop: "1px solid var(--line)", padding: "15px 2px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="tag tag-NEW" style={{ textTransform: "none" }}>{catLabel(p.category)}</span>
                {p.deadline && <span style={{ fontSize: 12, color: "var(--muted)" }}>Register by {p.deadline}</span>}
                {p.seats !== null && <span style={{ fontSize: 12, color: full ? "#b3261e" : "var(--muted)" }}>{full ? "All seats filled" : `${p.registered}/${p.seats} registered`}</span>}
              </div>
              <h3 style={{ margin: "10px 0 6px", fontSize: 16.5, color: "var(--ink)", fontFamily: "Georgia, serif", fontWeight: 700 }}>{p.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)", whiteSpace: "pre-line" }}>{p.description}</p>
              {p.venue && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--muted)" }}>Venue: {p.venue}</p>}

              {done && openId === p.id ? null : null}
              {openId === p.id && done ? (
                <div style={{ marginTop: 10, padding: "9px 12px", background: "#eaf5ee", borderRadius: 0, color: "#0d6b3a", fontSize: 13.5 }}>{done}</div>
              ) : null}

              {openId !== p.id ? (
                !full ? (
                  <button
                    type="button"
                    onClick={() => { setOpenId(p.id); setDone(null); setErr(""); }}
                    style={{ marginTop: 10, width: "100%", minHeight: 38, borderRadius: 0, border: "none", background: "var(--navy, #14532d)", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Register for this programme
                  </button>
                ) : null
              ) : (
                <form onSubmit={(e) => submit(e, p)} style={{ marginTop: 10 }}>
                  <input required placeholder="Your full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ width: "100%", minHeight: 38, marginBottom: 6, border: "1px solid var(--line)", borderRadius: 0, padding: "8px 10px", font: "inherit" }} />
                  <input placeholder="Your phone (to get an SMS confirmation)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ width: "100%", minHeight: 38, marginBottom: 6, border: "1px solid var(--line)", borderRadius: 0, padding: "8px 10px", font: "inherit" }} />
                  <input placeholder="Your community / electoral area (optional)" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} style={{ width: "100%", minHeight: 38, marginBottom: 8, border: "1px solid var(--line)", borderRadius: 0, padding: "8px 10px", font: "inherit" }} />
                  {err && <div style={{ marginBottom: 8, color: "#b3261e", fontSize: 13 }}>{err}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={busy} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: "none", background: "var(--navy, #14532d)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{busy ? "Registering…" : "Submit registration"}</button>
                    <button type="button" onClick={() => setOpenId(null)} style={{ minHeight: 38, borderRadius: 8, border: "1px solid #ccd8ea", background: "#fff", color: "#52637d", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "0 12px" }}>Cancel</button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
