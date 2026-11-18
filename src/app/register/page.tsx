"use client";
import { useState } from "react";
import PaperHead from "@/components/PaperHead";

export default function RegisterPage() {
  const [f, setF] = useState({ name: "", phone: "", area: "", dateOfBirth: "", education: "", skills: "", ghanaCard: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ serial: string; smsQueued: boolean; phone: string } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/public/youth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, phone: f.phone, area: f.area, dateOfBirth: f.dateOfBirth, education: f.education, skills: f.skills, ghanaCard: f.ghanaCard }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Could not save. Try again.");
      else setDone({ serial: j.serial, smsQueued: !!j.smsQueued, phone: f.phone });
    } finally { setBusy(false); }
  }

  return (
    <>
      <PaperHead active="REGISTER" />
      <main className="main" style={{ maxWidth: 560 }}>
        {done ? (
          <div className="card" style={{ textAlign: "center" }}>
            <h2>You are registered</h2>
            <p className="sub">Write down this register number or screenshot this page.</p>
            <div className="big-num">{done.serial}</div>
            {done.smsQueued ? (
              <p style={{ fontSize: 13.5, color: "#157347", fontWeight: 600, margin: "10px 0 0" }}>
                A confirmation SMS is on its way to {done.phone}.
              </p>
            ) : null}
            <p style={{ fontSize: 13.5, color: "#5b6b86", margin: "10px 0 18px" }}>
              Your details now sit in the same register as the walk-in youth at the desk.
              Visit the office any time - the officer will already be able to see your record.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a href="/register" className="btn btn-ghost">Register another person</a>
              <a href="/report" className="btn btn-primary">Report an issue</a>
            </div>
          </div>
        ) : (
          <form className="card" onSubmit={go}>
            <h2>Register with the Youth Desk</h2>
            <p className="sub">
              Young people can add their details here from home - no need to walk in first.
              Your record joins the desk register, and the office can reach you or take up an
              issue whenever you come in.
            </p>
            {err && <div className="alert-err">{err}</div>}
            <label className="fld"><span className="cap">Full name *</span>
              <input type="text" value={f.name} onChange={set("name")} placeholder="e.g. Kwame Mensah" required maxLength={80} />
            </label>
            <label className="fld"><span className="cap">Phone (optional - a confirmation SMS goes here)</span>
              <input type="tel" value={f.phone} onChange={set("phone")} placeholder="e.g. 0240000000" maxLength={15} />
            </label>
            <label className="fld"><span className="cap">Area / community (optional)</span>
              <input type="text" value={f.area} onChange={set("area")} placeholder="e.g. Osabene" maxLength={60} />
            </label>
            <label className="fld"><span className="cap">Date of birth (optional)</span>
              <input type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
            </label>
            <label className="fld"><span className="cap">Education (optional)</span>
              <input type="text" value={f.education} onChange={set("education")} placeholder="e.g. SHS completed" maxLength={60} />
            </label>
            <label className="fld"><span className="cap">Skills (optional)</span>
              <input type="text" value={f.skills} onChange={set("skills")} placeholder="e.g. barbering, driving" maxLength={200} />
            </label>
            <label className="fld"><span className="cap">Ghana Card number (optional)</span>
              <input type="text" value={f.ghanaCard} onChange={set("ghanaCard")} placeholder="GHA-XXXXXXXXX-X" maxLength={20} />
            </label>
            <p style={{ fontSize: 12.5, color: "#5b6b86", margin: "0 0 14px" }}>
              Only the name is required. The office sees every registered person in one list.
            </p>
            <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Register me"}</button>
          </form>
        )}
      </main>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
        <span className="footrow" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</a>
          {" "}&middot;{" "}
          <a href="/terms" style={{ color: "underline", textDecoration: "underline" }}>Terms</a>
        </span>
      </footer>
    </>
  );
}
