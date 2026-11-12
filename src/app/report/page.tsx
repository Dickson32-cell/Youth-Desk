"use client";
import { useState } from "react";
import TopBar from "@/components/Shell";

const TYPES = [
  ["EMPLOYMENT", "Job / employment issue"],
  ["TRAINING", "Training or apprenticeship"],
  ["GRIEVANCE", "Grievance or dispute"],
  ["FINANCE", "Fees / support needed"],
  ["HEALTH", "Health issue"],
  ["EDUCATION", "School / education"],
  ["OTHER", "Other"],
];

export default function Report() {
  const [f, setF] = useState({ name: "", phone: "", area: "", type: "EMPLOYMENT", description: "" });
  const [anon, setAnon] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/public/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, anonymous: anon }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Could not send");
      else setDone(j.caseNumber);
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <>
      <TopBar on="report" />
      <main className="main" style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Case received</h2>
          <p className="sub">Write down this number or screenshot this page.</p>
          <div className="big-num">{done}</div>
          <p style={{ fontSize: 13.5, color: "#5b6b86", margin: "10px 0 18px" }}>
            Keep it safe — it is your proof and your way to check progress.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a href={`/track?c=${done}`} className="btn btn-ghost">Track it</a>
            <a href="/report" className="btn btn-ghost">Report another</a>
          </div>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
    <TopBar on="report" />
    <main className="main" style={{ maxWidth: 640 }}>
      <form className="card" onSubmit={go}>
        <h2>Report an issue</h2>
        <p className="sub">
          Tell the Youth Desk officer. You may leave the name out (anonymous) — the case number is still yours.
        </p>
        {err && <div className="alert-err">{err}</div>}
        <div className="form-grid">
          <label className="fld"><span className="cap">Your name (optional)</span>
            <input type="text" value={anon ? "" : f.name} disabled={anon} onChange={set("name")} placeholder={anon ? "Anonymous" : "e.g. Kwame Mensah"} />
          </label>
          <label className="fld"><span className="cap">Phone for updates (optional)</span>
            <input type="tel" value={f.phone} onChange={set("phone")} placeholder="e.g. 0240000000" />
          </label>
        </div>
        <div className="form-grid">
          <label className="fld"><span className="cap">Your area / community</span>
            <input type="text" value={f.area} onChange={set("area")} placeholder="e.g. Osabene" />
          </label>
          <label className="fld"><span className="cap">What is it about?</span>
            <select value={f.type} onChange={set("type")}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <label className="fld"><span className="cap">Describe your issue</span>
          <textarea rows={5} value={f.description} onChange={set("description")} placeholder="Tell the officer what happened and what you ask for…" required />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ width: 18, height: 18 }} />
          Send this anonymously
        </label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send to the Youth Desk"}</button>
      </form>
    </main>
    </>
  );
}
