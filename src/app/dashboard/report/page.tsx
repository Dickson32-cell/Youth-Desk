"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/Shell";

type Row = { area: string | null; type: string | null; total: number; resolved: number };
type Sum = {
  byArea: Row[];
  byType: { m: string | null; total: number; resolved: number }[];
  totals: { all: number; NEW: number; IN_PROGRESS: number; RESOLVED: number; FORWARDED: number };
  youth: number;
};
type CaseRow = {
  id: number; caseNumber: string; createdAt: string; updatedAt: string; type: string; area: string | null;
  status: string; reporterName: string | null; phone: string | null; description: string; forwardedTo: string | null;
  notes: { id: number; body: string; author: string; createdAt: string }[];
  attachments: { id: number; fileName: string; size: number }[];
};

export default function ReportPack() {
  const [d, setD] = useState<Sum | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [preparedBy, setPreparedBy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/report")
      .then(async (r) => {
        if (!r.ok) { window.location.href = "/office/login"; return null; }
        return r.json();
      })
      .then((j) => (j ? setD(j) : setErr("Could not load")));
    fetch("/api/admin/cases")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setCases(j.cases || []) : null));
    fetch("/api/admin/auth")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setPreparedBy(j.username || "") : null));
  }, []);

  if (err) return <main className="main"><div className="alert-err">{err}</div></main>;
  if (!d) return <main className="main"><div className="card">Loading…</div></main>;

  const resolvedRate = d.totals.all ? Math.round((d.totals.RESOLVED / d.totals.all) * 100) : 0;
  const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card print-only">
          <h2 style={{ fontSize: 18 }}>NJSMA Youth Desk</h2>
          <p className="sub" style={{ margin: 0 }}>Case report for {month} · prepared by {preparedBy || "the desk officer"} · generated {new Date().toLocaleString()}</p>
        </div>
        <div className="card noprint">
          <h2>Monthly report pack</h2>
          <p className="sub">For the MCD and the investor — download it as a PDF (choose “Save as PDF” in the print dialog) and submit it with the case register attached below.</p>
          <button className="btn btn-primary" onClick={() => window.print()}>Download PDF</button>
        </div>

        <div className="card">
          <h2>Headline numbers</h2>
          <div className="statrow" style={{ marginTop: 8 }}>
            <div className="st"><div className="big">{d.totals.all}</div><div className="lbl">CASES RECEIVED</div></div>
            <div className="st"><div className="big">{d.totals.RESOLVED}</div><div className="lbl">RESOLVED</div></div>
            <div className="st"><div className="big">{resolvedRate}%</div><div className="lbl">RESOLVED RATE</div></div>
            <div className="st"><div className="big">{d.totals.IN_PROGRESS}</div><div className="lbl">IN PROGRESS</div></div>
            <div className="st"><div className="big">{d.youth}</div><div className="lbl">YOUTH REGISTERED</div></div>
          </div>
        </div>

        <div className="card">
          <h2>Cases by area</h2>
          <table className="tbl">
            <thead><tr><th>Area</th><th>Cases</th><th>Resolved</th></tr></thead>
            <tbody>
              {d.byArea.map((r) => (
                <tr key={r.area || "none"}><td>{r.area || "—"}</td><td>{r.total}</td><td>{r.resolved}</td></tr>
              ))}
              {d.byArea.length === 0 && <tr><td colSpan={3} style={{ color: "#5b6b86" }}>No cases yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Cases by type</h2>
          <table className="tbl">
            <thead><tr><th>Type</th><th>Cases</th><th>Resolved</th></tr></thead>
            <tbody>
              {d.byType.map((r) => (
                <tr key={r.m || "none"}><td>{r.m || "—"}</td><td>{r.total}</td><td>{r.resolved}</td></tr>
              ))}
              {d.byType.length === 0 && <tr><td colSpan={3} style={{ color: "#5b6b86" }}>No cases yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Case register (every case this pack covers)</h2>
          <p className="sub">The register table, then each case in full for Management review.</p>
          <div className="tblwrap">
          <table className="tbl">
            <thead><tr><th>Case</th><th>Received</th><th>Last update</th><th>Type</th><th>Area</th><th>Status</th><th>Reported by</th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="serial">{c.caseNumber}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(c.updatedAt).toLocaleDateString()}</td>
                  <td>{c.type}</td>
                  <td>{c.area || "—"}</td>
                  <td><span className={"tag tag-" + c.status}>{c.status.replace("_", " ")}</span></td>
                  <td>{c.reporterName || "Anonymous"}</td>
                </tr>
              ))}
              {cases.length === 0 && <tr><td colSpan={7} style={{ color: "#5b6b86" }}>No cases yet this period.</td></tr>}
            </tbody>
          </table>
          </div>
        </div>

        <div className="card">
          <h2>Case details for Management review</h2>
          {cases.map((c) => (
            <div key={c.id} className="case-detail">
              <div className="case-head">
                <span className="cn">{c.caseNumber}</span>
                <span className={"tag tag-" + c.status}>{c.status.replace("_", " ")}</span>
                <span className="sp" style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "#5b6b86" }}>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="kv">
                <dt>Reported by</dt><dd>{c.reporterName || "Anonymous"}</dd>
                <dt>Contact phone</dt><dd>{c.phone || "—"}</dd>
                <dt>Area</dt><dd>{c.area || "—"}</dd>
                <dt>Type</dt><dd>{c.type}</dd>
                {c.forwardedTo && <><dt>Forwarded to</dt><dd>{c.forwardedTo}</dd></>}
                <dt>Last update</dt><dd>{new Date(c.updatedAt).toLocaleString()}</dd>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, background: "#f7f9fd", borderRadius: 10, padding: "10px 12px" }}>{c.description}</p>
              {c.notes.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, margin: "8px 0 4px" }}>OFFICER ACTIONS & RESOLUTION TRAIL</div>
                  {c.notes.map((n) => (
                    <div key={n.id} className="note">
                      <div className="who">{n.author} · {new Date(n.createdAt).toLocaleString()}</div>
                      {n.body}
                    </div>
                  ))}
                </>
              )}
              {c.attachments.length > 0 && (
                <p style={{ fontSize: 12, color: "#5b6b86", margin: "6px 0 0" }}>
                  Evidence on file: {c.attachments.map((a) => a.fileName).join(", ")}
                </p>
              )}
            </div>
          ))}
          {cases.length === 0 && <p style={{ fontSize: 13.5, color: "#5b6b86" }}>No cases to review yet.</p>}
        </div>
      </div>
    </main>
  );
}
