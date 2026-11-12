"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar, {} from "@/components/Shell";

type Case = {
  id: number;
  caseNumber: string;
  reporterName: string | null;
  phone: string | null;
  area: string | null;
  type: string;
  description: string;
  status: string;
  forwardedTo: string | null;
  createdAt: string;
  updatedAt: string;
  notes: { id: number; body: string; author: string; createdAt: string }[];
};

const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "FORWARDED"] as const;

export default function Dashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [counts, setCounts] = useState<any>({ all: 0, NEW: 0, IN_PROGRESS: 0, RESOLVED: 0, FORWARDED: 0 });
  const [filter, setFilter] = useState<string>("NEW");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Case | null>(null);
  const [me, setMe] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({ name: "", phone: "", area: "", type: "EMPLOYMENT", description: "" });
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeErr, setIntakeErr] = useState("");
  const [intakeDone, setIntakeDone] = useState<{ caseNumber: string; smsQueued: boolean } | null>(null);
  const intake = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setIntakeForm((s) => ({ ...s, [k]: e.target.value }));

  const load = useCallback(async (f: string, query: string) => {
    const res = await fetch(`/api/admin/cases?status=${f}&q=${encodeURIComponent(query)}`);
    if (res.status === 401) { window.location.href = "/office/login"; return; }
    const j = await res.json();
    setCases(j.cases || []);
    setCounts(j.counts || {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth").then(async (r) => {
      if (r.ok) setMe((await r.json()).username);
    });
    load(filter, q);
  }, [filter, load]); /* eslint-disable-line */

  useEffect(() => {
    const t = setTimeout(() => load(filter, q), 250);
    return () => clearTimeout(t);
  }, [q]); /* eslint-disable-line */

  async function patch(id: number, body: object) {
    const res = await fetch("/api/admin/notes", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const j = await res.json();
    if (j.case) {
      setOpen(j.case);
      load(filter, q);
    }
  }

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card">
          <h2 style={{ fontSize: 17 }}>Case queue</h2>
          <p className="sub" style={{ margin: 0 }}>Signed in as {me}. Pick a case, act on it, keep the note. Use the menu to move between Cases, Youth and Reports.</p>
        </div>

        <div className="statrow">
          <button className={"st" + (filter === "NEW" ? " on" : "")} onClick={() => setFilter("NEW")}>
            <div className="big">{counts.NEW}</div><div className="lbl">NEW</div>
          </button>
          <button className={"st" + (filter === "IN_PROGRESS" ? " on" : "")} onClick={() => setFilter("IN_PROGRESS")}>
            <div className="big">{counts.IN_PROGRESS}</div><div className="lbl">IN PROGRESS</div>
          </button>
          <button className={"st" + (filter === "FORWARDED" ? " on" : "")} onClick={() => setFilter("FORWARDED")}>
            <div className="big">{counts.FORWARDED}</div><div className="lbl">FORWARDED</div>
          </button>
          <button className={"st" + (filter === "RESOLVED" ? " on" : "")} onClick={() => setFilter("RESOLVED")}>
            <div className="big">{counts.RESOLVED}</div><div className="lbl">RESOLVED</div>
          </button>
          <button className={"st" + (filter === "" ? " on" : "")} onClick={() => setFilter("")}>
            <div className="big">{counts.all}</div><div className="lbl">ALL CASES</div>
          </button>
        </div>

        <div className="card">
          <div className="filters">
            <input type="text" placeholder="Search name, number, area…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm noprint" onClick={() => { setIntakeDone(null); setIntakeErr(""); setIntakeForm({ name: "", phone: "", area: "", type: "EMPLOYMENT", description: "" }); setIntakeOpen(true); }}>+ New case</button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Case</th><th>Area</th><th>Type</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody className="caselist">
              {cases.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setOpen(c)}>
                  <td className="serial">{c.caseNumber}</td>
                  <td>{c.area || "—"}</td>
                  <td>{c.type}</td>
                  <td><span className={"tag tag-" + c.status}>{c.status.replace("_", " ")}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={5} style={{ color: "#5b6b86" }}>No cases under this filter yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {open && (
          <>
            <div className="tb-scrim" style={{ position: "fixed", inset: 0, background: "rgba(10,20,35,.45)", zIndex: 70 }} onClick={() => setOpen(null)} />
            <div className="card" style={{ position: "fixed", zIndex: 71, left: "50%", top: "6%", transform: "translateX(-50%)", width: "min(720px, calc(100% - 20px))", maxHeight: "84vh", overflowY: "auto" }}>
              <div className="case-head">
                <span className="cn">{open.caseNumber}</span>
                <span className={"tag tag-" + open.status}>{open.status.replace("_", " ")}</span>
                <span className="sp" style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(null)}>Close</button>
              </div>
              <div className="kv">
                <dt>Reported by</dt><dd>{open.reporterName || "Anonymous"}</dd>
                <dt>Phone</dt><dd>{open.phone || "—"}</dd>
                <dt>Area</dt><dd>{open.area || "—"}</dd>
                <dt>Type</dt><dd>{open.type}</dd>
                <dt>Received</dt><dd>{new Date(open.createdAt).toLocaleString()}</dd>
                {open.forwardedTo && <><dt>Forwarded to</dt><dd>{open.forwardedTo}</dd></>}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, background: "#f7f9fd", borderRadius: 10, padding: "12px 14px" }}>{open.description}</p>

              {open.notes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="sub">Case notes</div>
                  {open.notes.map((n) => (
                    <div key={n.id} className="note">
                      <div className="who">{n.author} · {new Date(n.createdAt).toLocaleString()}</div>
                      {n.body}
                    </div>
                  ))}
                </div>
              )}

              <div className="noprint">
                <div className="filters">
                  <button className="btn btn-sm btn-ghost" onClick={() => patch(open.id, { status: "IN_PROGRESS", note: "Started working on it." })}>Start working</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => patch(open.id, { status: "RESOLVED" })}>Mark resolved</button>
                </div>
                <div className="filters">
                  <input id="fwd" type="text" placeholder="Forward to (department / agency)…" style={{ flex: 1 }} defaultValue={open.forwardedTo || ""} />
                  <button className="btn btn-sm btn-ghost" onClick={() => {
                    const el = document.getElementById("fwd") as HTMLInputElement;
                    patch(open.id, { status: "FORWARDED", forwardedTo: el.value });
                  }}>Forward</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: "auto" }} onClick={async () => {
                    if (!window.confirm(`Delete case ${open.caseNumber}? This removes the report and its notes permanently (for inappropriate or junk entries).`)) return;
                    const res = await fetch(`/api/admin/cases/${open.id}`, { method: "DELETE" });
                    if (!res.ok) { const j = await res.json().catch(() => ({})); window.alert(j.error || "Could not delete"); return; }
                    setOpen(null);
                    load(filter, q);
                  }}>Delete case</button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const el = (e.target as HTMLFormElement).querySelector("textarea") as HTMLTextAreaElement;
                  patch(open.id, { note: el.value }).then(() => { el.value = ""; });
                }}>
                  <textarea rows={2} placeholder="Add a note (what was done, what was agreed)…" style={{ marginBottom: 8 }} />
                  <button className="btn btn-primary btn-sm">Add note</button>
                </form>
              </div>
            </div>
          </>
        )}
      {intakeOpen && (
        <>
          <div className="tb-scrim" style={{ position: "fixed", inset: 0, background: "rgba(10,20,35,.45)", zIndex: 70 }} onClick={() => setIntakeOpen(false)} />
          <div className="card" style={{ position: "fixed", zIndex: 71, left: "50%", top: "4%", transform: "translateX(-50%)", width: "min(640px, calc(100% - 20px))", maxHeight: "88vh", overflowY: "auto" }}>
            {intakeDone ? (
              <div style={{ textAlign: "center" }}>
                <h2>Case logged</h2>
                <p className="sub">{intakeDone.smsQueued ? "Confirmation SMS on its way to the youth's phone." : "No confirmation SMS for this entry (no phone on file)."}</p>
                <div className="big-num">{intakeDone.caseNumber}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
                  <a href={`/slip/${intakeDone.caseNumber}`} target="_blank" rel="noreferrer" className="btn btn-ghost">Print case slip</a>
                  <button className="btn btn-ghost" onClick={() => { setIntakeDone(null); setIntakeForm({ name: "", phone: "", area: "", type: "EMPLOYMENT", description: "" }); }}>Log another</button>
                  <button className="btn btn-primary" onClick={() => { setIntakeOpen(false); load(filter, q); }}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <div className="case-head">
                  <h2 style={{ fontSize: 16 }}>Log a walk-in case</h2>
                  <span className="sp" style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setIntakeOpen(false)}>Close</button>
                </div>
                {intakeErr && <div className="alert-err">{intakeErr}</div>}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIntakeErr(""); setIntakeBusy(true);
                  try {
                    const res = await fetch("/api/admin/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intakeForm) });
                    const j = await res.json().catch(() => ({}));
                    if (!res.ok) setIntakeErr(j.error || "Could not save");
                    else { setIntakeDone({ caseNumber: j.caseNumber, smsQueued: !!j.smsQueued }); load(filter, q); }
                  } finally { setIntakeBusy(false); }
                }}>
                  <div className="form-grid">
                    <label className="fld"><span className="cap">Youth / client name (optional)</span>
                      <input value={intakeForm.name} onChange={intake("name")} autoComplete="off" />
                    </label>
                    <label className="fld"><span className="cap">Phone (for SMS updates)</span>
                      <input value={intakeForm.phone} onChange={intake("phone")} autoComplete="off" inputMode="tel" placeholder="05xxxxxxxx" />
                    </label>
                    <label className="fld"><span className="cap">Area / community</span>
                      <input value={intakeForm.area} onChange={intake("area")} autoComplete="off" />
                    </label>
                    <label className="fld"><span className="cap">Category</span>
                      <select value={intakeForm.type} onChange={intake("type")}>
                        <option>EMPLOYMENT</option>
                        <option>TRAINING</option>
                        <option>GRIEVANCE</option>
                        <option>FINANCE</option>
                        <option>HEALTH</option>
                        <option>EDUCATION</option>
                        <option>OTHER</option>
                      </select>
                    </label>
                  </div>
                  <label className="fld"><span className="cap">The complaint / request, as told to you *</span>
                    <textarea rows={4} value={intakeForm.description} onChange={intake("description")} required placeholder="Write what the youth asked for or complained about…" style={{ marginBottom: 10 }} />
                  </label>
                  <button className="btn btn-primary w-full" disabled={intakeBusy}>{intakeBusy ? "Saving…" : "Log the case"}</button>
                </form>
              </>
            )}
          </div>
        </>
      )}
      </div>
    </main>
  );
}
