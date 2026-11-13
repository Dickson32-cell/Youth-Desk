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

type PostRow = { id: number; title: string; description: string; category: string; deadline: string | null; venue: string | null; seats: number | null; status: string; postedBy: string; registrations: number };
type RegRow = { id: number; name: string; phone: string | null; area: string | null; note: string | null; createdAt: string };

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
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [regFor, setRegFor] = useState<{ id: number; title: string } | null>(null);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [pf, setPf] = useState({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "" });
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), department: "", title: "", type: "TRAINING", target: "", reached: "", budget: "", note: "" });

  const load = () => {
    fetch("/api/admin/interventions")
      .then((r) => r.json())
      .then((j) => { setRows(j.rows || []); setSummary(j.summary || { items: 0, target: 0, reached: 0, budget: 0 }); setByDept(j.byDept || []); })
      .catch(() => setErr("Could not load programmes."));
  };
  useEffect(() => {
    fetch("/api/admin/auth").then(async (r) => (r.ok ? r.json() : null)).then((j) => (j ? setPreparedBy(j.fullName || j.username || "") : null));
    loadPosts();
  }, []);
  useEffect(load, []);

  function loadPosts() {
    fetch("/api/admin/programmes-post")
      .then((r) => r.json())
      .then((j) => setPosts(j.rows || []))
      .catch(() => {});
  }
  async function postProgramme(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const body = { ...pf, category: pf.category === "OTHER" && pf.categoryOther.trim() ? pf.categoryOther.trim().toUpperCase() : pf.category };
    const res = await fetch("/api/admin/programmes-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) fail(j.error || "Could not publish the programme.");
    else {
      setShowPostForm(false); setMsg("Programme published on the main website - registration is open.");
      setPf({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "" });
      loadPosts();
    }
    setBusy(false);
  }
  async function closeReopen(id: number, action: string) {
    const r = await fetch("/api/admin/programmes-post", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!r.ok) fail("Could not update it.");
    else { setMsg(action === "close" ? "Registration closed." : "Registration reopened."); loadPosts(); }
  }
  async function delPost(id: number) {
    if (!confirm("Remove this published programme and its sign-ups?")) return;
    const r = await fetch("/api/admin/programmes-post?id=" + id, { method: "DELETE" });
    if (!r.ok) fail("Could not remove it.");
    else { setRegFor(null); setMsg("Published programme removed."); loadPosts(); }
  }
  function openRegistrants(id: number, title: string) {
    if (regFor && regFor.id === id) { setRegFor(null); setRegs([]); return; }
    setRegFor({ id, title });
    fetch("/api/admin/programmes-post?registrants=" + id)
      .then((r) => r.json())
      .then((j) => setRegs(j.rows || []))
      .catch(() => setRegs([]));
  }

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

        <div className="card noprint">
          <h2>Open for registration</h2>
          <p className="sub">This is where the officer POSTS a programme for youth to register remotely: press "+ Publish a programme", fill in the details, and it appears on the MAIN WEBSITE under "Programmes open for registration". Youth anywhere sign up from their phones, each phone sign-up gets a confirmation SMS, and the who-signed-up list shows below.</p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary noprint" onClick={() => setShowPostForm(!showPostForm)}>{showPostForm ? "Close the publish form" : "+ Publish a programme"}</button>
          </div>
          {showPostForm && (
            <form onSubmit={postProgramme}>
              <div className="filters" style={{ flexWrap: "wrap", rowGap: 8, marginTop: 10 }}>
                <input required placeholder="Programme title (e.g: Skills training for young tailors)" value={pf.title} onChange={(e) => setPf({ ...pf, title: e.target.value })} style={{ minWidth: 320 }} />
                <select value={pf.category} onChange={(e) => setPf({ ...pf, category: e.target.value })} style={{ textTransform: "capitalize" }}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  <option value="OTHER">Other (type it)</option>
                </select>
                {pf.category === "OTHER" && (
                  <input required placeholder="Type the kind of programme" value={pf.categoryOther} onChange={(e) => setPf({ ...pf, categoryOther: e.target.value })} style={{ width: 240, textTransform: "uppercase" }} />
                )}
                <input placeholder="Deadline / closing date (optional, e.g: 30 Nov 2026)" value={pf.deadline} onChange={(e) => setPf({ ...pf, deadline: e.target.value })} style={{ minWidth: 240 }} />
                <input placeholder="Venue / how to take part (optional)" value={pf.venue} onChange={(e) => setPf({ ...pf, venue: e.target.value })} style={{ minWidth: 260 }} />
                <input type="number" min="1" placeholder="Planned seats (optional)" value={pf.seats} onChange={(e) => setPf({ ...pf, seats: e.target.value })} style={{ width: 180 }} />
              </div>
              <textarea required placeholder="Full details: what the programme offers, requirements, who can apply, how selection works." value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} style={{ width: "100%", minHeight: 90, marginTop: 8 }} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish to the main website"}</button>
              </div>
            </form>
          )}
          {posts.length === 0 ? (
            <p className="sub" style={{ marginTop: 10 }}>Nothing published yet.</p>
          ) : (
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>Programme</th><th>Type</th><th>Deadline</th><th>Seats</th><th>Sign-ups</th><th>Status</th><th className="noprint"></th></tr></thead>
              <tbody>
                {posts.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 320 }}><b>{r.title}</b></td>
                    <td>{tLabel(r.category)}</td>
                    <td>{r.deadline || "\u2014"}</td>
                    <td>{r.seats ?? "\u2014"}</td>
                    <td style={{ fontWeight: 700 }}>{r.registrations}</td>
                    <td><span className={"tag tag-" + (r.status === "OPEN" ? "NEW" : "RESOLVED")} style={{ cursor: "pointer" }} onClick={() => closeReopen(r.id, r.status === "OPEN" ? "close" : "reopen")} title="Tap to toggle open/closed">{r.status}</span></td>
                    <td className="noprint" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => openRegistrants(r.id, r.title)}>{regFor && regFor.id === r.id ? "Hide list" : "Sign-ups"}</button>
                      {" "}
                      <button type="button" className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => delPost(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {regFor && (
            <div style={{ marginTop: 12, borderTop: "1px solid #ccd8ea", paddingTop: 10 }}>
              <h3>Sign-ups: {regFor.title}</h3>
              {regs.length === 0 ? (
                <p className="sub">No sign-ups yet.</p>
              ) : (
                <table>
                  <thead><tr><th>When</th><th>Name</th><th>Phone</th><th>Area</th><th>Note</th></tr></thead>
                  <tbody>
                    {regs.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                        <td>{r.name}</td>
                        <td>{r.phone || "\u2014"}</td>
                        <td>{r.area || "\u2014"}</td>
                        <td>{r.note || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Programme KPI register — interventions</h2>
          <p className="sub">Every programme the desk runs lands here with its numbers (target vs youth reached) and feeds the KPI table in the Management report pack.</p>
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


        {rows.some((r) => r.note) && (
          <div className="card print-only">
            <h3 style={{ fontSize: 16 }}>Programme descriptions</h3>
            {rows.filter((r) => r.note).map((r) => (
              <div key={"pd-" + r.id} style={{ padding: "10px 0", borderBottom: "1px solid #e3e9f2" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#122447" }}>{r.title} — {r.department}</div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#33383f", lineHeight: 1.6 }}>{r.note}</div>
              </div>
            ))}
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
