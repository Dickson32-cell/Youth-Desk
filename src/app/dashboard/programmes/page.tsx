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
  programs?: { id: number; title: string; status: string; venue: string | null; deadline: string | null; meetingDate: string | null; _count?: { registrations: number } }[];
  reachedCalc?: number;
  liveReached?: number | null;
  coverage?: number | null;
};
type Summary = { items: number; target: number; reached: number; budget: number; coverage?: number | null };
type ByDept = { department: string; target: number; reached: number; items: number };
type PostRow = {
  id: number; title: string; description: string; category: string; deadline: string | null;
  venue: string | null; seats: number | null; status: string; meetingDate: string | null; postedBy: string; registrations: number; reminded: number;
};
type RegRow = { id: number; name: string; phone: string | null; area: string | null; note: string | null; walkin?: boolean; createdAt: string; reminderSentAt: string | null };
type PubFullRow = { id: number; title: string; description: string; category: string; deadline: string | null; venue: string | null; seats: number | null; status: string; registrations: RegRow[] };

const TYPES: [string, string][] = [
  ["TRAINING", "Skills training"],
  ["APPRENTICESHIP", "Apprenticeship"],
  ["INTERNSHIP", "Internship"],
  ["MENTORSHIP", "Mentorship"],
  ["GRANT", "Grant / funding support"],
  ["MARKET", "Market linkage"],
  ["OTHER", "Other (type it)"],
];
const catLabel = (c: string) => (c ? c[0] + c.slice(1).toLowerCase() : "—");

export default function Programmes() {
  // ---- shared UI state ----
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  // ---- (1) open-for-registration posts ----
  const [posts, setPosts] = useState<PostRow[] | null>(null); // null = loading (cold-start retry)
  const [showPostForm, setShowPostForm] = useState(false);
  const [pf, setPf] = useState({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "", meetingDate: "" });
  const [remBusy, setRemBusy] = useState<number | null>(null);
  const [regFor, setRegFor] = useState<{ id: number; title: string } | null>(null);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [pubFull, setPubFull] = useState<PubFullRow[]>([]);

  // ---- (2+3) KPI register ----
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({ items: 0, target: 0, reached: 0, budget: 0 });
  const [byDept, setByDept] = useState<ByDept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customType, setCustomType] = useState("");
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), department: "", title: "", type: "TRAINING", target: "", reached: "", budget: "", note: "", venue: "", deadline: "", meetingDate: "" });
  const [postToSite, setPostToSite] = useState(false);
  const [walkRow, setWalkRow] = useState<{ id: number; title: string } | null>(null);
  const [walk, setWalk] = useState({ name: "", phone: "", area: "", note: "" });
  const [walkList, setWalkList] = useState<RegRow[] | null>(null);
  const [walkBusy, setWalkBusy] = useState(false);

  function loadPosts(attempt = 0) {
    // Neon cold start can swallow the first request; retry instead of
    // showing a false "Nothing published yet".
    fetch("/api/admin/programmes-post")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http " + r.status))))
      .then((j) => setPosts(j.rows || []))
      .catch(() => { if (attempt < 3) setTimeout(() => loadPosts(attempt + 1), 4000); });
    fetch("/api/admin/programmes-post?full=1")
      .then((r) => r.json())
      .then((j) => setPubFull(j.rows || []))
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
    // live console: silent refresh every 10s + instant refresh when returning to the tab
    const t = setInterval(() => { if (!document.hidden) { loadPosts(); loadRows(); } }, 10000);
    const onVis = () => { if (!document.hidden) { loadPosts(); loadRows(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
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
    setPf({ title: "", category: "TRAINING", categoryOther: "", description: "", deadline: "", venue: "", seats: "", meetingDate: "" });
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
  async function openWalkin(r: Row) {
    const link = r.programs && r.programs[0];
    if (!link) return;
    setWalkRow({ id: link.id, title: r.title });
    setWalk({ name: "", phone: "", area: "", note: "" });
    const lst = await fetch("/api/admin/programmes-post/walkin?id=" + link.id).then((x) => x.json()).catch(() => null);
    setWalkList(lst && lst.rows ? lst.rows : []);
  }
  async function saveWalk() {
    if (!walkRow) return;
    setWalkBusy(true);
    const res = await fetch("/api/admin/programmes-post/walkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: walkRow.id, name: walk.name, phone: walk.phone || null, area: walk.area || null, note: walk.note || null }) });
    const j = await res.json().catch(() => ({}));
    setWalkBusy(false);
    if (!res.ok) return fail(j.error || "Could not register this youth.");
    setMsg(j.smsQueued ? walk.name + " registered. A confirmation SMS was sent (if a phone was given)." : walk.name + " registered (no phone - registered without SMS).");
    setWalk({ name: "", phone: "", area: "", note: "" });
    const lst = await fetch("/api/admin/programmes-post/walkin?id=" + walkRow.id).then((x) => x.json()).catch(() => null);
    setWalkList(lst && lst.rows ? lst.rows : []);
    loadRows(); loadPosts();
  }
  async function postToInterventionSite(r: Row) {
    const res = await fetch("/api/admin/interventions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, action: "post", venue: (r.programs && r.programs[0] && r.programs[0].venue) || undefined }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return fail(j.error || "Could not post the programme.");
    setMsg("Posted on the main website - youth can now register online.");
    loadRows(); loadPosts();
  }

  async function setMeeting(id: number, date: string) {
    if (!date || !date.trim()) return;
    const r = await fetch("/api/admin/programmes-post/reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, meetingDate: date }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return fail(j.error || "Could not save the meeting date.");
    const lst = await fetch("/api/admin/programmes-post/walkin?id=" + id).then((x) => x.json()).catch(() => null);
    setWalkList(lst && lst.rows ? lst.rows : []);
    setMsg("Meeting date saved: " + date); loadRows(); loadPosts();
  }
  async function sendReminder(id: number, title: string) {
    const r0 = await fetch("/api/admin/programmes-post?registrants=" + id);
    const j0 = await r0.json().catch(() => ({}));
    const withPhone = (j0.rows || []).filter((g: { phone: string | null }) => g.phone).length;
    if (!withPhone) return fail("No registrant with a phone number yet.");
    if (!confirm("Send the meeting-reminder SMS to " + withPhone + " registrant(s)? One SMS each, venue included.")) return;
    setRemBusy(id); setErr(""); setMsg("");
    const r = await fetch("/api/admin/programmes-post/reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return fail(j.error || "Could not send the reminders.");
    setMsg("Reminder sent to " + j.sent + " of " + j.targets + " registrant(s). The venue is in the message.");
    setRemBusy(null); loadRows(); loadPosts();
    { const lst = await fetch("/api/admin/programmes-post/walkin?id=" + id).then((x) => x.json()).catch(() => null); setWalkList(lst && lst.rows ? lst.rows : []); }
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
    const res = await fetch("/api/admin/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postToWebsite: postToSite, ...f, type }) });
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

        {/* The old standalone posts card is gone: publishing happens from the KPI register (checkbox on logging or the row button); programme management (meeting date, reminders, open/close) lives in the per-programme drawer. */}

        {/* ============ (2+3) KPI REGISTER ============ */}
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Programme KPI register — interventions</h2>
          <p className="sub">Log a programme after it happens (targeted vs youth actually reached, optionally the amount committed). These numbers build the KPI table in the Management report PDF.</p>
          <div className="filters" style={{ gap: 14, marginTop: 10 }}>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Programmes</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.items}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Target</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.target}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Youth reached</div><div style={{ fontSize: 20, fontWeight: 800, color: "#0d6b3a" }}>{summary.reached}</div></div>
            <div className="tile" style={{ padding: "10px 16px" }}><div style={{ fontSize: 12, color: "#5b6b86" }}>Coverage</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1c3f6e" }}>{summary.coverage != null ? summary.coverage : pct}%</div></div>
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
                <input placeholder="Venue (when posting online)" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} style={{ flex: "1 1 240px", minWidth: 0, marginTop: 8 }} />
                <input placeholder="Closing date for online sign-up (optional)" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} style={{ flex: "1 1 230px", minWidth: 0 }} />
                <input placeholder="Meeting date (optional)" value={f.meetingDate} onChange={(e) => setF({ ...f, meetingDate: e.target.value })} style={{ flex: "1 1 230px", minWidth: 0 }} />
                <label style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontWeight: 700, color: "#12294a", cursor: "pointer", paddingTop: 4 }}>
                  <input type="checkbox" checked={postToSite} onChange={(e) => setPostToSite(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#0d6b3a" }} />
                  Also post this programme on the main website so youth can register online
                </label>
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
            <div className="tblwrap" style={{ marginTop: 8 }}>
            <table className="tbl" style={{ minWidth: 560 }}>
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
          </div>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Online programme registrations — recorded automatically</h3>
          <p className="sub">Every youth who signs up on the main website appears here with their details. The counts feed the KPI tiles above (targeted = planned seats, reached = sign-ups).</p>
          {posts !== null && posts.length === 0 && <p className="sub" style={{ marginTop: 6 }}>No published programmes yet.</p>}
          {(posts || []).length > 0 && (
            <div className="tblwrap" style={{ marginTop: 8 }}>
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead><tr><th>#</th><th>Programme</th><th>Planned (target)</th><th>Sign-ups (reached)</th><th>Coverage</th><th>Where</th></tr></thead>
                <tbody>
                  {(posts || []).map((r, i) => (
                    <tr key={"kpi" + r.id}>
                      <td>{i + 1}</td>
                      <td><b style={{ color: "#12294a" }}>{r.title}</b>{r.deadline ? <span style={{ fontSize: 12, color: "#8fa2bd" }}> &middot; closes {r.deadline}</span> : null}</td>
                      <td>{r.seats ?? "\u2014"}</td>
                      <td style={{ fontWeight: 700 }}>{r.registrations}</td>
                      <td>{r.seats ? Math.min(100, Math.round((r.registrations / r.seats) * 100)) + "%" : "\u2014"}</td>
                      <td>{r.venue || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Programme KPI register</h3>
          {rows.length === 0 ? (
            <p className="sub">No interventions logged yet. Use &quot;+ Log an intervention&quot; above after a programme happens.</p>
          ) : (
            <div className="tblwrap" style={{ marginTop: 8 }}>
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead><tr><th>Date</th><th>Department</th><th>Programme</th><th>Type</th><th>Target</th><th>Reached</th><th>Coverage</th><th className="noprint"></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{r.department}</td>
                    <td>{r.title}{r.note ? <div style={{ fontSize: 12, color: "#5b6b86" }}>{r.note}</div> : null}</td>
                    <td>{tLabel(r.type)}</td>
                    <td>{r.target}</td><td style={{ fontWeight: 700, color: "#12294a" }}>{r.reachedCalc ?? r.reached}{r.liveReached != null ? <span style={{ fontSize: 10.5, fontWeight: 500, color: "#8fa2bd" }}> (live)</span> : null}</td>
                    <td>{r.coverage != null ? <b style={{ color: "#1c3f6e" }}>{r.coverage}%</b> : "\u2014"}</td>
                    <td className="noprint" style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 420 }}>
                      {(() => {
                        const prog = r.programs && r.programs[0];
                        return prog ? (
                          <>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#0d6b3a", background: "rgba(13,107,58,.09)", borderRadius: 999, padding: "4px 10px", alignSelf: "center" }}>On website - {(prog._count && prog._count.registrations) || 0} signed up{r.target ? " (" + Math.round(((prog._count && prog._count.registrations) || 0) / r.target * 100) + "% of " + r.target + ")" : ""}</span>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => openWalkin(r)} style={{ padding: "3px 10px", fontSize: 12 }}>Register walk-in</button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => postToInterventionSite(r)} style={{ padding: "3px 10px", fontSize: 12 }}>Post to main website</button>
                        );
                      })()}
                      <button type="button" className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => del(r.id)}>Delete</button>
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {walkRow && (
          <div className="sheetwrap noprint" onClick={() => setWalkRow(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "86vh", overflow: "auto" }}>
              <div className="sheet-grip" aria-hidden="true" />
              <div className="sheet-head">Register a walk-in youth - {walkRow.title}</div>
              <div style={{ padding: "0 18px 4px" }}>
                <input placeholder="Full name" value={walk.name} onChange={(e) => setWalk({ ...walk, name: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
                <input placeholder="Phone (optional - they get a confirmation SMS)" value={walk.phone} onChange={(e) => setWalk({ ...walk, phone: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
                <input placeholder="Area / community (optional)" value={walk.area} onChange={(e) => setWalk({ ...walk, area: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
                <input placeholder="Note (optional)" value={walk.note} onChange={(e) => setWalk({ ...walk, note: e.target.value })} style={{ width: "100%", marginBottom: 10 }} />
                <button type="button" className="btn btn-primary" onClick={() => { saveWalk(); }} disabled={walkBusy || !walk.name.trim()} style={{ minHeight: 40, width: "100%" }}>
                  {walkBusy ? "Registering…" : "Register this youth"}
                </button>
              </div>
              <div className="sheet-sep" style={{ margin: "10px 14px 6px" }} />
              <div className="sheet-head">Programme</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 8px" }}>
                {(() => {
                  const prog = (posts || []).find((x) => x.id === walkRow.id);
                  if (!prog) return null;
                  return (
                    <>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => { const d = window.prompt("Set the meeting date (e.g: 20 Dec 2026):", prog.meetingDate || ""); if (d) setMeeting(prog.id, d); }}>{prog.meetingDate ? "Change date" : "Set date"}</button>
                      <button type="button" className="btn btn-sm btn-primary" disabled={remBusy === prog.id} onClick={() => sendReminder(prog.id, prog.title)} style={{ padding: "3px 10px", fontSize: 12 }}>
                        {remBusy === prog.id ? "Sending…" : "Remind all (" + (prog.registrations - prog.reminded) + " to go)"}
                      </button>
                      {prog.reminded > 0 && (
                        <button type="button" className="btn btn-sm btn-ghost" disabled={remBusy === prog.id} onClick={async () => {
                          if (!confirm("Remind EVERYONE again, including those already reminded? This is for meetings that moved or youth who did not come.")) return;
                          setRemBusy(prog.id); setErr(""); setMsg("");
                          const r = await fetch("/api/admin/programmes-post/reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: prog.id, reset: true }) });
                          const j = await r.json().catch(() => ({}));
                          if (!r.ok) return fail(j.error || "Could not send the reminders.");
                          setMsg("Reminder sent to " + j.sent + " registrant(s) (including previously reminded).");
                          setRemBusy(null); loadRows(); loadPosts();
                          { const lst = await fetch("/api/admin/programmes-post/walkin?id=" + prog.id).then((x) => x.json()).catch(() => null); setWalkList(lst && lst.rows ? lst.rows : []); }
                        }} style={{ padding: "3px 10px", fontSize: 12 }}>
                          Remind everyone again
                        </button>
                      )}
                      <button type="button" className={"btn btn-sm " + (prog.status === "OPEN" ? "btn-ghost" : "btn-primary")} onClick={() => closeReopen(prog.id, prog.status === "OPEN" ? "close" : "reopen")} style={{ padding: "3px 10px", fontSize: 12 }}>
                        {prog.status === "OPEN" ? "Close registration" : "Reopen registration"}
                      </button>
                      <button type="button" className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { delPost(prog.id); setWalkRow(null); }}>Delete programme</button>
                    </>
                  );
                })()}
              </div>
              <div className="sheet-sep" style={{ margin: "10px 14px 6px" }} />
              <div className="sheet-head">Registered ({walkList ? walkList.length : 0})</div>
              {(walkList || []).map((rr) => (
                <div key={rr.id} className="sheet-row" style={{ justifyContent: "flex-start", minHeight: 40 }}>
                  <b style={{ fontSize: 13.5, color: "#12294a" }}>{rr.name}</b>
                  <span style={{ fontSize: 11, fontWeight: 700, color: rr.walkin ? "#1c3f6e" : "#0d6b3a", background: rr.walkin ? "rgba(28,63,110,.09)" : "rgba(13,107,58,.09)", borderRadius: 999, padding: "3px 9px" }}>{rr.walkin ? "Walk-in" : "Online"}</span>
                  <span style={{ fontSize: 12, color: "#8fa2bd", marginLeft: "auto" }}>{rr.phone || ""}</span>
                </div>
              ))}
              {walkList && walkList.length === 0 && <div className="sheet-row" style={{ color: "#8fa2bd" }}>No one yet - walk-ins and online sign-ups will appear here.</div>}
            </div>
          </div>
        )}

        {pubFull.length > 0 && (
          <div className="card print-only">
            <h3 style={{ fontSize: 16 }}>Programmes published for registration &amp; their sign-ups</h3>
            {pubFull.map((r) => (
              <div key={"pp-" + r.id} style={{ padding: "12px 0", borderBottom: "1px solid #dfe6f1" }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: "#122447" }}>
                  {r.title} <span style={{ fontWeight: 400, color: "#5b6b86" }}>({catLabel2(r.category)}; {r.status === "OPEN" ? "registration open" : "registration closed"}</span>)
                </div>
                <div style={{ fontSize: 13, color: "#33383f", lineHeight: 1.6, whiteSpace: "pre-line", margin: "4px 0" }}>{r.description}</div>
                <div style={{ fontSize: 12, color: "#52637d", lineHeight: 1.7 }}>
                  {r.deadline ? <>Registration closes: {r.deadline}<br /></> : null}
                  {r.venue ? <>Venue: {r.venue}<br /></> : null}
                  {r.seats ? <>Planned participants: {r.seats}<br /></> : null}
                  Registered young people: {r.registrations.length}
                </div>
                {r.registrations.length > 0 && (
                  <table style={{ marginTop: 8 }}>
                    <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Area</th><th>Source</th><th>Registered</th></tr></thead>
                    <tbody>
                      {r.registrations.map((g, k) => (
                        <tr key={"pr-" + g.id}>
                          <td>{k + 1}</td>
                          <td>{g.name}</td>
                          <td>{g.phone || "—"}</td>
                          <td>{g.area || "—"}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{g.walkin ? "Walk-in" : "Online"}</td>
                          <td>{new Date(g.createdAt).toLocaleDateString("en-GB")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
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
      </div>
    </main>
  );
}
const catLabel2 = (c: string) => (c ? c[0] + c.slice(1).toLowerCase() : c);
