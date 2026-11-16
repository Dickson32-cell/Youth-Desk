"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import PaperHead from "@/components/PaperHead";
const LABEL: Record<string, string> = {
  NEW: "Received — waiting for the officer",
  IN_PROGRESS: "In progress — the officer is on it",
  RESOLVED: "Resolved",
  FORWARDED: "Forwarded — with another department",
};

const GENERIC = "We could not find that case. Use the case number AND the tracking key from your SMS or slip.";

export default function TrackInner() {
  const sp = useSearchParams();
  const [num, setNum] = useState(sp.get("c") || "");
  const [key, setKey] = useState(sp.get("k") || "");
  const [c, setC] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(n?: string, k?: string) {
    const target = (n ?? num).trim().toUpperCase();
    const k2 = (k ?? key).trim().toUpperCase();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/public/track?caseNumber=" + encodeURIComponent(target) + "&key=" + encodeURIComponent(k2));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || GENERIC); setC(null); }
      else setC(j);
    } finally { setBusy(false); }
  }

  useEffect(() => { const q = sp.get("c"); if (q) go(q, sp.get("k") || ""); /* eslint-disable-next-line */ }, []);
  // Live update: while a case is open, its stage view refreshes every 10 s
  // (silent - the checker button only shows its busy state on manual checks).
  useEffect(() => {
    if (!c) return;
    const t = setInterval(() => {
      fetch("/api/public/track?caseNumber=" + encodeURIComponent(c.caseNumber) + "&key=" + encodeURIComponent(key))
        .then(async (r) => (r.ok ? r.json() : null))
        .then((j) => j && setC(j))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [c, key]);

  // Stage timeline for the client: where the case has gotten to.
  const fmtS = (v: string | null) => (v ? new Date(v).toLocaleString() : "");
  const statusNow = c ? c.status : "";
  const inProg = c && (c.inProgressAt || statusNow === "IN_PROGRESS" || statusNow === "RESOLVED" || statusNow === "FORWARDED");
  const resolved = c && (c.resolvedAt || statusNow === "RESOLVED");
  const forwarded = c && statusNow === "FORWARDED";
  const steps = c ? [
    { label: "Received", done: true, current: statusNow === "NEW", date: fmtS(c.createdAt) },
    ...(forwarded && !inProg
      ? [{ label: "Forwarded", done: true, current: true, date: fmtS(c.updatedAt) }]
      : [
          { label: "In progress", done: !!inProg, current: statusNow === "IN_PROGRESS", date: fmtS(c.inProgressAt || (inProg ? c.updatedAt : null)) },
          ...(forwarded ? [{ label: "Forwarded", done: true, current: true, date: fmtS(c.updatedAt) }] : []),
        ]),
    { label: "Resolved", done: !!resolved, current: statusNow === "RESOLVED", date: fmtS(c.resolvedAt) },
  ] : [];

  return (
    <><PaperHead active="TRACK A CASE" />
      <main className="main" style={{ maxWidth: 560 }}>
      <form className="card" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <h2>Track your case</h2>
        <p className="sub">Both details are on your slip and in the SMS you received. Your case stays private — only these two together open it.</p>
        <label className="fld"><span className="cap">Case number</span>
          <input type="text" value={num} onChange={(e) => setNum(e.target.value)} placeholder="YD-2026-0001" required style={{ textTransform: "uppercase" }} />
        </label>
        <label className="fld"><span className="cap">Tracking key</span>
          <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. K7M2QPX4RA" required style={{ textTransform: "uppercase" }} autoComplete="off" />
        </label>
        <button className="btn btn-primary w-full" disabled={busy || !num || !key}>{busy ? "Checking…" : "Check my case"}</button>
        {err && <div className="alert-err" style={{ marginTop: 10 }}>{err}</div>}
      </form>
      {c && (
        <div className="card">
          <div className="case-head">
            <span className="cn">{c.caseNumber}</span>
            <span className={"tag tag-" + c.status}>{c.status.replace("_", " ")}</span>
          </div>
          {/* Where the case has gotten to: stage timeline (updates every 10 s) */}
          <div style={{ margin: "16px 0 4px", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, left: 16, right: 16, height: 2, background: "#dde5f2" }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
              {steps.map((st) => (
                <div key={st.label} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999, margin: "0 auto 6px",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700,
                    background: st.done ? "#1f7a48" : st.current ? "#1C3F6E" : "#eef1f8",
                    color: st.done || st.current ? "#fff" : "#8fa2bd",
                    boxShadow: st.current ? "0 0 0 4px rgba(28,63,110,.18)" : "none",
                  }}>{st.done ? "✓" : ""}</div>
                  <div style={{ fontSize: 11.5, fontWeight: st.done || st.current ? 700 : 500, color: st.done || st.current ? "#12294a" : "#8fa2bd" }}>{st.label}</div>
                  <div style={{ fontSize: 10.5, color: "#8fa2bd", marginTop: 2 }}>{st.date}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="kv" style={{ marginTop: 14 }}>
            <dt>What it is about</dt><dd>{c.type}</dd>
            <dt>Area</dt><dd>{c.area || "—"}</dd>
            <dt>Received</dt><dd>{new Date(c.createdAt).toLocaleDateString()}</dd>
            <dt>Last update</dt><dd>{new Date(c.updatedAt).toLocaleString()}</dd>
            <dt>What it means</dt><dd>{LABEL[c.status] || c.status}</dd>
          </div>
          {c.resolution && c.resolution.trim() !== "" && (
            <div style={{ marginTop: 14, background: "#f2faf3", border: "1px solid #cfe8d6", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#1f7a48", marginBottom: 4 }}>THE DESK'S RESOLUTION</div>
              <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, margin: 0, color: "#16281c" }}>{c.resolution}</p>
            </div>
          )}
        </div>
      )}

    <footer className="paper-foot">
      <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
          </footer>
    </main>
    </>
  );
}
