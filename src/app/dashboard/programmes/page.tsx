"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/Shell";

// THE OFFICER'S PROGRAMMES TAB — three jobs on one page, in order:
// (1) Open for registration: publish a programme on the main website so youth
//     who cannot walk to the office can sign up from their phones (each sign-up
//     with a phone gets a confirmation SMS). The officer sees every sign-up.
// (2) Programme KPI register: log interventions AFTER they happen (target vs
//     youth reached) - feeds the KPI table of the Management report pack.
// (3) The register of everything logged, printable as PDF for Management.

type Row = {
  id: number; date: string; department: string; title: string; type: string;
  target: number; reached: number; budget: number | null; note: string | null; officer: string;
};
type Summary = { items: number; target: number; reached: number; budget: number };
type ByDept = { department: string; target: number; reached: number; items: number };
type PostRow = {
  id: number; title: string; description: string; category: string; deadline: string | null;
  venue: string | null; seats: number | null; status: string; postedBy: string; registrations: number;
};
type RegRow = { id: number; name: string; phone: string | null; area: string | null; note: string | null; createdAt: string };

const TYPES: [string, string][] = [
  ["TRAINING", "Skills training"],
  ["APPRENTICESHIP", "Apprenticeship"],
  ["INTERNSHIP", "Internship"],
  ["MENTORSHIP", "Mentorship"],
  ["GRANT", "Grant / funding support"],
  ["MARKET", "Market linkage"],
  ["OTHER", "Other (type it)"],
];

export default function Programmes() {
  // ---- shared UI state ----
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  // ---- (1) open-for-registration posts ----
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [pf, setPf] = useState({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "" });
  const [regFor, setRegFor] = useState<{ id: number; title: string } | null>(null);
  const [regs, setRegs] = useState<RegRow[]>([]);

  // ---- (2+3) KPI register ----
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({ items: 0, target: 0, reached: 0, budget: 0 });
  const [byDept, setByDept] = useState<ByDept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customType, setCustomType] = useState("");
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), department: "", title: "", type: "TRAINING", target: "", reached: "", budget: "", note: "" });

  function loadPosts() {
    fetch("/api/admin/programmes-post")
      .then((r) => r.json())
      .then((j) => setPosts(j.rows || []))
      .catch(() => {});
  }
  function loadRows() {
    fetch("/api/admin/interventions")
      .then((r) => r.json())
      .then((j) => { setRows(j.rows || []); setSummary(j.summary || { items: 0, target: 0, reached: 0, budget: 0 }); setByDept(j.byDept || []); })
      .catch(() => {});
  }
  useEffect(() => {
    fetch("/api/admin/auth").then(async (r) => (r.ok ? r.json() : null)).then((j) => (j ? setPreparedBy(j.fullName || j.username || "") : null));
    loadPosts();
    loadRows();
  }, []);

  function fail(m: string) { setErr(m); setBusy(false); }

  // ---- publish handlers ----
  async function postProgramme(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const category = pf.category === "OTHER" && pf.categoryOther.trim() ? pf.categoryOther.trim().toUpperCase() : pf.category;
    const res = await fetch("/api/admin/programmes-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pf, category }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return fail(j.error || "Could not publish the programme.");
    setShowPostForm(false); setMsg("Published. It now shows on the main website under Programmes open for registration.");
    setPf({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "" });
    loadPosts(); setBusy(false);
  }
  async function closeReopen(id: number, action: string) {
    const r = await fetch("/api/admin/programmes-post", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!r.ok) return fail("Could not update it.");
    setMsg(action === "close" ? "Registration closed - the youth sign-up button is hidden." : "Registration reopened."); loadPosts();
  }
  async function delPost(id: number) {
    if (!confirm("Remove this published programme and its sign-ups?")) return;
    const r = await fetch("/api/admin/programmes-post?id=" + id, { method: "DELETE" });
    if (!r.ok) return fail("Could not remove it.");
    if (regFor && regFor.id === id) { setRegFor(null); setRegs([]); }
    setMsg("Published programme removed."); loadPosts();
  }
  function openRegistrants(id: number, title: string) {
    if (regFor && regFor.id === id) { setRegFor(null); setRegs([]); return; }
    setRegFor({ id, title });
    fetch("/api/admin/programmes-post?registrants=" + id)
      .then((r) => r.json())
      .then((j) => setRegs(j.rows || []))
      .catch(() => setRegs([]));
  }

  // ---- KPI register handlers ----
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const type = f.type === "OTHER" && customType.trim() ? customType.trim().toUpperCase() : f.type;
    const res = await fetch("/api/admin/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, type }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return fail(j.error || "Could not log the programme.");
    setShowForm(false); setCustomType(""); setMsg("Logged in the KPI register.");
    setF({ ...f, department: "", title: "", target: "", reached: "", budget: "", note: "" });
    loadRows(); setBusy(false);
  }
  async function del(id: number) {
    if (!confirm("Remove this logged programme?")) return;
    const r = await fetch("/api/admin/interventions?id=" + id, { method: "DELETE" });
    if (!r.ok) return fail("Could not remove it.");
    setMsg("Removed."); loadRows();
  }

  const pct = summary.target > 0 ? Math.round((summary.reached / summary.target) * 100) : 0;
  const tLabel = (t: string) => (t === "ALL" ? "\u2014" : TYPES.find((x) => x[0] === t)?.[1] || catLabel(t));

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        {/* print header (only in the Download PDF) */}
        <div className="card print-only" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/seal" alt="NJSMA seal" width={52} height={52} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#122447" }}>Youth Desk NJSMA — Programmes &amp; interventions</div>
              <div style={{ fontSize: 11, letterSpacing: 1, color: "#5b6b86" }}>MANAGEMENT KPI REPORT — {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#5b6b86", textAlign: "right" }}>
            Prepared by: {preparedBy || "the desk officer"} · {new Date().toLocaleString()}
          </div>
        </div>

        {/* ============ (1) OPEN FOR REGISTRATION ============ */}
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Open for registration — post a programme for youth to join</h2>
          <p className="sub">
            Press <b>+ Publish a programme</b> and it appears on the MAIN WEBSITE under &quot;Programmes open for registration&quot;.
            Youth who cannot walk to the office tap Register and sign up from their phones; every sign-up with a phone gets a
            confirmation SMS. The sign-ups appear below as &quot;Sign-ups&quot;.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" style={{ minHeight: 40 }} onClick={() => setShowPostForm(!showPostForm)}>{showPostForm ? "Cancel" : "+ Publish a programme"}</button>
          </div>
          {msg && <div className="alert-ok" style={{ marginTop: 8 }}>{msg}</div>}
          {err && <div className="alert-err" style={{ marginTop: 8 }}>{err}</div>}

          {showPostForm && (
            <form onSubmit={postProgramme}>
              <div className="filters" style={{ flexWrap: "wrap", rowGap: 8, marginTop: 10 }}>
                <input required placeholder="Programme title" value={pf.title} onChange={(e) => setPf({ ...pf, title: e.target.value })} style={{ minWidth: 320 }} />
                <select value={pf.category} onChange={(e) => setPf({ ...pf, category: e.target.value })}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {pf.category === "OTHER" && (
                  <input required placeholder="Type the kind of programme" value={pf.categoryOther} onChange={(e) => setPf({ ...pf, categoryOther: e.target.value })} style={{ width: 240, textTransform: "uppercase" }} />
                )}
                <input placeholder="Closing date (optional, e.g: 30 Nov 2026)" value={pf.deadline} onChange={(e) => setPf({ ...pf, deadline: e.target.value })} style={{ minWidth: 220 }} />
                <input placeholder="Venue / how to take part (optional)" value={pf.venue} onChange={(e) => setPf({ ...pf, venue: e.target.value })} style={{ minWidth: 260 }} />
                <input type="number" min="1" placeholder="Planned seats (optional)" value={pf.seats} onChange={(e) => setPf({ ...pf, seats: e.target.value })} style={{ width: 170 }} />
              </div>
              <textarea required placeholder="Full details: what the programme offers, requirements, who can apply, how selection works." value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} style={{ width: "100%", minHeight: 90, marginTop: 8 }} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish to the main website"}</button>
              </div>
            </form>
          )}

          {posts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Programme</th><th>Type</th><th>Closing</th><th>Seats</th><th>Sign-ups</th><th>Status</th><th className="noprint"></th></tr></thead>
                <tbody>
                  {posts.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.title}</b></td>
                      <td>{catLabel(r.category)}</td>
                      <td>{r.deadline || "\u2014"}</td>
                      <td>{r.seats ?? "\u2014"}</td>
                      <td style={{ fontWeight: 700 }}>{r.registrations}</td>
                      <td>
                        <button type="button" className={"tag tag-" + (r.status === "OPEN" ? "NEW" : "RESOLVED")} style={{ cursor: "pointer" }} onClick={() => closeReopen(r.id, r.status === "OPEN" ? "close" : "reopen")} title="Tap to open or close registration">
                          {r.status}
                        </button>
                      </td>
                      <td className="noprint" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => openRegistrants(r.id, r.title)}>{regFor && regFor.id === r.id ? "Hide list" : "Sign-ups"}</button>
                        {" "}
                        <button type="button" className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => delPost(r.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {regFor && (
                <div style={{ marginTop: 12, borderTop: "1px solid #ccd8ea", paddingTop: 10 }}>
                  <h3>Sign-ups: {regFor.title}</h3>
                  {regs.length === 0 ? (
                    <p className="sub">No sign-ups yet - share the main website link.</p>
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
          )}
          {posts.length === 0 && <p className="sub" style={{ marginTop: 10 }}>Nothing published yet. Publish above for youth to sign up from their phones.</p>}
        </div>

        {/* ============ (2+3) KPI REGISTER ============ */}
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Programme KPI register — interventions</h2>
          <p className="sub">Log a programme after it happens (targeted vs youth actually reached, optionally the amount committed). These numbers build the KPI table in the Management report PDF.</p>
          <div className="filters" style={{ gap: 14, marginTop: 10 }}>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Programmes</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.items}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Target</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.target}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Youth reached</div><div style={{ fontSize: 20, fontWeight: 800, color: "#0d6b3a" }}>{summary.reached}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Coverage</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{pct}%</div></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" style={{ minHeight: 40 }} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Log an intervention"}</button>
            <button className="btn btn-primary" style={{ marginLeft: 10, minHeight: 40 }} onClick={() => window.print()}>Download PDF</button>
          </div>

          {showForm && (
            <form onSubmit={submit}>
              <div className="filters" style={{ flexWrap: "wrap", rowGap: 8, marginTop: 8 }}>
                <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={{ paddingRight: 8 }} />
                <input required placeholder="Leading department (e.g. Social Welfare)" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} style={{ minWidth: 240 }} />
                <input required placeholder="Programme title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={{ minWidth: 260 }} />
                <select value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); if (e.target.value !== "OTHER") setCustomType(""); }}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {f.type === "OTHER" && (
                  <input required autoFocus placeholder="Type the kind of programme" value={customType} onChange={(e) => setCustomType(e.target.value)} style={{ width: 250, textTransform: "uppercase" }} />
                )}
                <input type="number" min="0" placeholder="Target (planned youth)" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} style={{ width: 180 }} />
                <input type="number" min="0" placeholder="Youth reached" value={f.reached} onChange={(e) => setF({ ...f, reached: e.target.value })} style={{ width: 180 }} />
                <input type="number" min="0" step="0.01" placeholder="Amount committed (GHS, optional)" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} style={{ width: 210 }} />
                <textarea placeholder="Notes (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={{ width: "100%", minHeight: 50 }} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save to the KPI register"}</button>
              </div>
            </form>
          )}
        </div>

        {byDept.length > 0 && (
          <div className="card">
            <h3>By department</h3>
            <table>
              <thead><tr><th>Department</th><th>Programmes</th><th>Target</th><th>Reached</th><th>Coverage</th></tr></thead>
              <tbody>
                {byDept.map((d) => (
                  <tr key={d.department}>
                    <td>{d.department}</td><td>{d.items}</td><td>{d.target}</td><td>{d.reached}</td>
                    <td>{d.target > 0 ? Math.round((d.reached / d.target) * 100) + "%" : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h3>Programme KPI register</h3>
          {rows.length === 0 ? (
            <p className="sub">No interventions logged yet. Use &quot;+ Log an intervention&quot; above after a programme happens.</p>
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
      </div>
    </main>
  );
}
