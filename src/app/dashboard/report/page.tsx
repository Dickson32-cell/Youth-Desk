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

export default function ReportPack() {
  const [d, setD] = useState<Sum | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/report")
      .then(async (r) => {
        if (!r.ok) { window.location.href = "/office/login"; return null; }
        return r.json();
      })
      .then((j) => (j ? setD(j) : setErr("Could not load")));
  }, []);

  if (err) return <main className="main"><div className="alert-err">{err}</div></main>;
  if (!d) return <main className="main"><div className="card">Loading…</div></main>;

  const resolvedRate = d.totals.all ? Math.round((d.totals.RESOLVED / d.totals.all) * 100) : 0;

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card noprint">
          <h2>Monthly report pack</h2>
          <p className="sub">For the MCD and the investor — print this page or keep it as the month&apos;s summary.</p>
          <button className="btn btn-primary" onClick={() => window.print()}>Print</button>
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
      </div>
    </main>
  );
}
