"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/Shell";

// Programmes & interventions the desk coordinates: the municipal KPI register.
type Row = {
  id: number; date: string; department: string; title: string; type: string;
  target: number; reached: number; budget: number | null; note: string | null; officer: string;
};
type Summary = { items: number; target: number; reached: number; budget: number };
type ByDept = { department: string; target: number; reached: number; items: number };

const TYPES: [string, string][] = [
  ["TRAINING", "Skills training"],
  ["APPRENTICESHIP", "Apprenticeship"],
  ["INTERNSHIP", "Internship"],
  ["MENTORSHIP", "Mentorship"],
  ["GRANT", "Grant / funding support"],
  ["MARKET", "Market linkage"],
  ["OTHER", "Other"],
];

export default function Programmes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({ items: 0, target: 0, reached: 0, budget: 0 });
  const [byDept, setByDept] = useState<ByDept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [customType, setCustomType] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), department: "", title: "", type: "TRAINING", target: "", reached: "", budget: "", note: "" });

  const load = () => {
    fetch("/api/admin/interventions")
      .then((r) => r.json())
      .then((j) => { setRows(j.rows || []); setSummary(j.summary || { items: 0, target: 0, reached: 0, budget: 0 }); setByDept(j.byDept || []); })
      .catch(() => setErr("Could not load programmes."));
  };
  useEffect(() => {
    fetch("/api/admin/auth").then(async (r) => (r.ok ? r.json() : null)).then((j) => (j ? setPreparedBy(j.fullName || j.username || "") : null));
  }, []);
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const res = await fetch("/api/admin/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, type: f.type === "OTHER" && customType.trim() ? customType.trim().toUpperCase() : f.type }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) fail(j.error || "Could not save the programme.");
    else { setShowForm(false); setMsg("Programme saved."); setF({ ...f, department: "", title: "", target: "", reached: "", budget: "", note: "" }); load(); }
    setBusy(false);
  }
  function fail(m: string) { setErr(m); setBusy(false); }

  async function del(id: number) {
    if (!confirm("Remove this programme from the register?")) return;
    const r = await fetch("/api/admin/interventions?id=" + id, { method: "DELETE" });
    if (!r.ok) fail("Could not remove it.");
    else { setMsg("Programme removed."); load(); }
  }

  const pct = summary.target > 0 ? Math.round((summary.reached / summary.target) * 100) : 0;
  const tLabel = (t: string) => {
    const known = TYPES.find((x) => x[0] === t);
    if (t === "ALL") return "—";
    return known ? known[1] : (t[0] + t.slice(1).toLowerCase());
  };

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card">
          <h2>Programmes &amp; interventions</h2>
          <p className="sub">Municipal programmes and interventions for young people that the desk coordinates or monitors. These feed the KPI table in the Management report pack.</p>
          <div className="filters" style={{ gap: 14, marginTop: 10 }}>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Programmes</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.items}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Target (planned)</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.target}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Youth reached</div><div style={{ fontSize: 20, fontWeight: 800, color: "#0d6b3a" }}>{summary.reached}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Coverage</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{pct}%</div></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary noprint" onClick={() => setShowForm(!showForm)}>{showForm ? "Close the form" : "+ Log a programme"}</button>
            <button className="btn btn-primary noprint" style={{ marginLeft: 10 }} onClick={() => window.print()}>Download PDF</button>
          </div>
          {err && <div className="alert-err">{err}</div>}
          {msg && <div className="alert-ok">{msg}</div>}
        </div>


        <div className="card print-only" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/api/seal" alt="NJSMA seal" width={52} height={52} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#122447" }}>Youth Desk NJSMA — Programmes &amp; interventions</div>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#5b6b86" }}>MANAGEMENT KPI REPORT — {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#5b6b86", textAlign: "right", lineHeight: 1.6 }}>
              Prepared by: {preparedBy || "the desk officer"}<br />{new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {showForm && (
          <form className="card noprint" onSubmit={submit}>
            <h3>Log a programme</h3>
            <div className="filters" style={{ flexWrap: "wrap", rowGap: 8, marginTop: 8 }}>
              <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={{ paddingRight: 8 }} />
              <input required placeholder="Leading department (e.g. Social Welfare)" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} style={{ minWidth: 240 }} />
              <input required placeholder="Programme title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={{ minWidth: 260 }} />
              <select value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); if (e.target.value !== "OTHER") setCustomType(""); }}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {f.type === "OTHER" && (
                <input required autoFocus placeholder="Type the kind of programme (e.g: SATELLITE WORKSHOP)" value={customType} onChange={(e) => setCustomType(e.target.value)} style={{ width: 280, textTransform: "uppercase" }} />
              )}
              <input type="number" min="0" placeholder="Target (planned youth)" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} style={{ width: 180 }} />
              <input type="number" min="0" placeholder="Youth reached" value={f.reached} onChange={(e) => setF({ ...f, reached: e.target.value })} style={{ width: 180 }} />
              <input type="number" min="0" step="0.01" placeholder="Amount committed (GHS, optional)" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} style={{ width: 220 }} />
              <textarea placeholder="Notes (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={{ width: "100%", minHeight: 60 }} />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save programme"}</button>
            </div>
          </form>
        )}

        {byDept.length > 0 && (
          <div className="card">
            <h3>By department</h3>
            <table>
              <thead><tr><th>Department</th><th>Programmes</th><th>Target</th><th>Reached</th><th>Coverage</th></tr></thead>
              <tbody>
                {byDept.map((d) => (
                  <tr key={d.department}>
                    <td>{d.department}</td><td>{d.items}</td><td>{d.target}</td><td>{d.reached}</td>
                    <td>{d.target > 0 ? Math.round((d.reached / d.target) * 100) + "%" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h3>Programme register</h3>
          {rows.length === 0 ? (
            <p className="sub">No programmes logged yet.</p>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Department</th><th>Programme</th><th>Type</th><th>Target</th><th>Reached</th><th className="noprint"></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{r.department}</td>
                    <td>{r.title}{r.note ? <div style={{ fontSize: 12, color: "#5b6b86" }}>{r.note}</div> : null}</td>
                    <td>{tLabel(r.type)}</td>
                    <td>{r.target}</td><td style={{ fontWeight: 600 }}>{r.reached}</td>
                    <td className="noprint" style={{ textAlign: "right" }}><button type="button" className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => del(r.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
