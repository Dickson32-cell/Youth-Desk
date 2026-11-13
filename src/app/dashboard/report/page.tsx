"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/Shell";

type Row = { area: string | null; type: string | null; total: number; resolved: number };
type Period = { label: string; year: number | null; q: string };
type Sum = {
  byArea: Row[];
  byType: { m: string | null; total: number; resolved: number }[];
  totals: { all: number; NEW: number; IN_PROGRESS: number; RESOLVED: number; FORWARDED: number };
  youth: number;
  youthInPeriod?: number;
  period?: Period;
};

const QUARTER_TEXT: Record<string, string> = { Q1: "Jan – Mar", Q2: "Apr – Jun", Q3: "Jul – Sep", Q4: "Oct – Dec" };
function qBounds(year: number, q: string): { from: string; to: string } | null {
  if (q === "all" || q === "whole" || !q) return null;
  const starts: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
  const m0 = starts[q];
  if (m0 === undefined) return null;
  const from = `${year}-${String(m0 + 1).padStart(2, "0")}-01`;
  const endMonth = m0 + 3; // exclusive month
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const to = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}
function quarterOf(d: string): { q: string; year: number } {
  const dt = new Date(d);
  const m = dt.getUTCMonth();
  return { q: "Q" + (Math.floor(m / 3) + 1), year: dt.getUTCFullYear() };
}
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
  const now0 = new Date();
  const thisQ = "Q" + (Math.floor(now0.getUTCMonth() / 3) + 1);
  const [year, setYear] = useState(now0.getUTCFullYear());
  const [qSel, setQSel] = useState(thisQ); // Q1..Q4 | whole | all
  const [includeEv, setIncludeEv] = useState(false); // print evidence photos inside the PDF

  // Management-review blocks collapse when the pack grows; printing always expands everything.
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggleCase = (id: number) =>
    setOpenIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const printPack = () => {
    setOpenIds(new Set(cases.map((c) => c.id))); // expand all so the PDF keeps every detail
    setTimeout(() => window.print(), 80);
  };

  useEffect(() => {
    fetch("/api/admin/auth")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setPreparedBy(j.fullName || j.username || "") : null));
  }, []);
  useEffect(() => {
    const b = qBounds(year, qSel);
    const pf = "/api/admin/report?year=" + year + "&q=" + qSel;
    const cf = "/api/admin/cases" + (b ? `?from=${b.from}&to=${b.to}` : "");
    fetch(pf)
      .then(async (r) => {
        if (!r.ok) { window.location.href = "/office/login"; return null; }
        return r.json();
      })
      .then((j) => (j ? setD(j) : setErr("Could not load")));
    fetch(cf)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setCases(j.cases || []) : null));
  }, [year, qSel]);

  if (err) return <main className="main"><div className="alert-err">{err}</div></main>;
  if (!d) return <main className="main"><div className="card">Loading…</div></main>;

  const resolvedRate = d.totals.all ? Math.round((d.totals.RESOLVED / d.totals.all) * 100) : 0;
  // Quarter sections for easy reference: shown whenever the pack covers more
  // than one quarter (Whole year / All time). A single-quarter pack needs none.
  const multi = qSel === "all" || qSel === "whole";
  const groups: { key: string; q: string; year: number; items: CaseRow[] }[] = [];
  if (multi && cases.length) {
    for (const c of cases) {
      const g = quarterOf(c.createdAt);
      const key = g.q + " " + g.year;
      let last = groups[groups.length - 1];
      if (!last || last.key !== key) { last = { key, q: g.q, year: g.year, items: [] }; groups.push(last); }
      last.items.push(c);
    }
  } else if (cases.length) {
    groups.push({ key: "", q: "", year: year, items: cases });
  }
  const groupTotal = (items: CaseRow[]) => items.length;
  const packTitle = qSel === "all" ? "Full report — every case since the desk opened" : qSel === "whole" ? `Annual report — ${year}` : `Quarterly report — ${qSel} ${year}`;

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card print-only">
          <h2 style={{ fontSize: 18 }}>NJSMA Youth Desk</h2>
          <p className="sub" style={{ margin: 0 }}>{packTitle}{d.period?.label ? ` · ${d.period.label}` : ""} · prepared by {preparedBy || "the desk officer"} · generated {new Date().toLocaleString()}</p>
        </div>
        <div className="card noprint">
          <h2>Management report pack</h2>
          <p className="sub">Pick the period, then download it as a PDF (choose “Save as PDF” in the print dialog) and submit it with the case register attached below. Quarters follow the calendar: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.</p>
          <div className="filters" style={{ flexWrap: "wrap", rowGap: 8, marginTop: 8 }}>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={{ minWidth: 110 }}>
              {[...Array(16)].map((_, i) => {
                const y = now0.getUTCFullYear() - 10 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button className={"btn btn-sm " + (!["Q1", "Q2", "Q3", "Q4"].includes(qSel) ? "btn-primary" : "btn-ghost")} onClick={() => setQSel("all")}>All time</button>
            <button className={"btn btn-sm " + (qSel === "whole" ? "btn-primary" : "btn-ghost")} onClick={() => setQSel("whole")}>Whole year</button>
            {["Q1", "Q2", "Q3", "Q4"].map((qq) => (
              <button key={qq} className={"btn btn-sm " + (qSel === qq ? "btn-primary" : "btn-ghost")} onClick={() => setQSel(qq)}>{qq} · {QUARTER_TEXT[qq]}</button>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={printPack}>Download PDF</button>
            <label style={{ fontSize: 13, color: "#3c5170", display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={includeEv} onChange={(e) => setIncludeEv(e.target.checked)} />
              Print evidence photos in this report
            </label>
          </div>
        </div>

        <div className="card">
          <h2>Headline numbers</h2>
          <div className="statrow" style={{ marginTop: 8 }}>
            <div className="st"><div className="big">{d.totals.all}</div><div className="lbl">CASES RECEIVED</div></div>
            <div className="st"><div className="big">{d.totals.RESOLVED}</div><div className="lbl">RESOLVED</div></div>
            <div className="st"><div className="big">{resolvedRate}%</div><div className="lbl">RESOLVED RATE</div></div>
            <div className="st"><div className="big">{d.totals.IN_PROGRESS}</div><div className="lbl">IN PROGRESS</div></div>
            <div className="st"><div className="big">{qSel === "all" ? d.youth : (d.youthInPeriod ?? d.youth)}</div><div className="lbl">{qSel === "all" ? "YOUTH REGISTERED" : "YOUTH REGISTERED (THIS PERIOD)"}</div></div>
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
              {groups.map((g) => (
                <>
                  {g.key && (
                    <tr key={"gh-" + g.key}>
                      <td colSpan={7} style={{ background: "#eef3fb", fontWeight: 700, color: "#122447", letterSpacing: 0.5 }}>
                        {g.key} ({QUARTER_TEXT[g.q] || ""} {g.year}) — {g.items.length} case{g.items.length === 1 ? "" : "s"} received
                      </td>
                    </tr>
                  )}
                  {g.items.map((c) => (
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
                </>
              ))}
              {cases.length === 0 && <tr><td colSpan={7} style={{ color: "#5b6b86" }}>No cases yet this period.</td></tr>}
            </tbody>
          </table>
          </div>
        </div>

        <div className="card">
          <div className="case-head">
            <h2 style={{ margin: 0 }}>Case details for Management review</h2>
            <span className="sp" style={{ flex: 1 }} />
            {cases.length > 0 && (
              <span className="noprint" style={{ display: "inline-flex", gap: 8 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setOpenIds(new Set(cases.map((c) => c.id)))}>Expand all</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setOpenIds(new Set())}>Minimize all</button>
              </span>
            )}
          </div>
          <p className="sub noprint">Each case starts minimized — tap a case to open its details. Printing expands every case automatically.</p>
          {groups.map((g) => (
            <div key={"g-" + (g.key || "one")} style={g.key ? { margin: "14px 0 6px" } : undefined}>
            {g.key && (
              <div style={{ background: "#eef3fb", color: "#122447", fontWeight: 700, padding: "7px 10px", borderRadius: 8, fontSize: 13, letterSpacing: 0.5 }}>
                {g.key} ({QUARTER_TEXT[g.q] || ""} {g.year}) — {g.items.length} case{g.items.length === 1 ? "" : "s"}
              </div>
            )}
            {g.items.map((c) => {
            const isOpen = openIds.has(c.id);
            return (
            <div key={c.id} className="case-detail">
              <button className="case-toggle" onClick={() => toggleCase(c.id)} title={isOpen ? "Minimize this case" : "Open this case"}>
                <span className="cn">{c.caseNumber}</span>
                <span className={"tag tag-" + c.status}>{c.status.replace("_", " ")}</span>
                <span style={{ fontSize: 11.5, color: "#5b6b86" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#3c5170" }}>{isOpen ? "Minimize ↑" : "Open details ↓"}</span>
              </button>
              {!isOpen ? (
                <p style={{ fontSize: 12.5, color: "#5b6b86", padding: "0 2px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.description.slice(0, 90)}{c.description.length > 90 ? "…" : ""}
                </p>
              ) : (
              <>
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
                <>
                  <p style={{ fontSize: 12, color: "#5b6b86", margin: "6px 0 0" }}>
                    Evidence on file: {c.attachments.map((a) => a.fileName).join(", ")}
                  </p>
                  {includeEv && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, pageBreakInside: "avoid" }}>
                      {c.attachments.map((a) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={a.id} src={`/api/attachments/${a.id}`} alt={a.fileName} style={{ width: 200, height: "auto", border: "1px solid #ccd8ea", borderRadius: 8 }} />
                      ))}
                    </div>
                  )}
                </>
              )}
              </>
              )}
            </div>
            );
            })}
            </div>
          ))}
          {cases.length === 0 && <p style={{ fontSize: 13.5, color: "#5b6b86" }}>No cases to review yet.</p>}
        </div>
      </div>
    </main>
  );
}
