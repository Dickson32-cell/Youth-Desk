"use client";
import { useState } from "react";
import PaperHead from "@/components/PaperHead";
import { prepareFilesForUpload } from "@/lib/imgPrepare";

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
  const [customType, setCustomType] = useState(""); // if the client types their own issue type, it wins over the dropdown
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [doneKey, setDoneKey] = useState<string>("");
  const [smsNote, setSmsNote] = useState("");
  const [upNote, setUpNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = await prepareFilesForUpload(e.target.files || []);
    setFiles((cur) => [...cur, ...chosen].slice(0, 5));
    e.target.value = "";
  };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", anon ? "" : f.name);
      fd.append("phone", f.phone);
      fd.append("area", f.area);
      fd.append("type", (customType.trim() || f.type).slice(0, 20));
      fd.append("description", f.description);
      files.forEach((fl) => fd.append("files", fl));
      const res = await fetch("/api/public/report", { method: "POST", body: fd });
      if (res.status === 413) { setErr("A file is too large (max 4 MB). Remove the big file and try again."); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Could not send");
      else {
        setDone(j.caseNumber); setDoneKey(j.trackKey || "");
        setSmsNote(j.smsQueued ? `An SMS with this case number is on its way to ${f.phone}.` : "");
        setUpNote(j.warning || "");
      }
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <>
      <PaperHead active="REPORT AN ISSUE" />
      <main className="main" style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Case received</h2>
          <p className="sub">Write down this number or screenshot this page.</p>
          <div className="big-num">{done}</div>
          {smsNote && (
            <p style={{ fontSize: 13.5, color: "#157347", fontWeight: 600, margin: "10px 0 0" }}>{smsNote}</p>
          )}
          {upNote && (
            <p style={{ fontSize: 13, color: "#a2631f", fontWeight: 600, margin: "8px 0 0" }}>Note: {upNote} Your case was still received.</p>
          )}
          {doneKey && (
            <div style={{ margin: "14px auto 0", padding: "10px 14px", border: "1.5px solid var(--navy)", borderRadius: 0, background: "var(--paper)", maxWidth: 420, fontSize: 14 }}>
              <b>Tracking key: {doneKey}</b>
              <div style={{ fontSize: 12.5, color: "#5b6b86", marginTop: 4 }}>Keep this PRIVATE. The case number alone cannot open your case — only the number plus this key can.</div>
            </div>
          )}
          <p style={{ fontSize: 13.5, color: "#5b6b86", margin: "10px 0 18px" }}>
            Keep it safe — it is your proof and your way to check progress.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a href={`/track?c=${done}&k=${doneKey}`} className="btn btn-ghost">Track it</a>
            <a href="/report" className="btn btn-ghost">Report another</a>
          </div>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
    <PaperHead active="REPORT AN ISSUE" />
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
          <label className="fld"><span className="cap">Phone for updates (optional - SMS goes here)</span>
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
        <label className="fld"><span className="cap">Not in the list? Type your issue type here — it overrides the dropdown</span>
          <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="e.g. Land dispute, Police harassment, Electricity bill…" maxLength={40} />
        </label>
        <label className="fld"><span className="cap">Describe your issue</span>
          <textarea rows={5} value={f.description} onChange={set("description")} placeholder="Tell the officer what happened and what you ask for…" required />
        </label>
        <label className="fld"><span className="cap">Photos or documents (optional, up to 5)</span>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.mp4" onChange={onFiles} />
        </label>
        {files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {files.map((fl, i) => (
              <span key={i} style={{ background: "var(--paper)", border: "1px solid var(--navy)", color: "#3c5170", padding: "4px 10px", borderRadius: 2, fontSize: 12.5, display: "inline-flex", gap: 6, alignItems: "center" }}>
                {fl.name.length > 28 ? fl.name.slice(0, 25) + "…" : fl.name} ({Math.round(fl.size / 1024)} KB)
                <button type="button" onClick={() => setFiles((c) => c.filter((_, k) => k !== i))} style={{ border: 0, background: "transparent", cursor: "pointer", fontWeight: 800, color: "#8a3a3a", padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ width: 18, height: 18 }} />
          Send this anonymously
        </label>
        {anon && (
          <div style={{ border: "1.5px solid var(--navy)", borderRadius: 2, background: "var(--paper)", padding: "12px 14px", marginBottom: 16 }}>
            <b style={{ fontSize: 14 }}>Would the officer like to reach you?</b>
            <p style={{ fontSize: 12.5, color: "#5b6b86", margin: "4px 0 8px" }}>
              Your name stays hidden either way. If you leave your number, the officer can call or text you about the case - this is optional.
            </p>
            <label className="fld" style={{ marginBottom: 0 }}><span className="cap">Your number (optional, so we can reach you)</span>
              <input type="tel" value={f.phone} onChange={set("phone")} placeholder="e.g. 0240000000" />
            </label>
            <p style={{ fontSize: 12, color: "#5b6b86", margin: "6px 0 0" }}>If you leave it, an SMS with your case number comes to this line.</p>
          </div>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send to the Youth Desk"}</button>
      </form>
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
