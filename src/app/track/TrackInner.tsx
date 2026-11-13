"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/Shell";

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

  return (
    <><TopBar on="track" /><main className="main" style={{ maxWidth: 560 }}>
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
          <div className="kv">
            <dt>What it is about</dt><dd>{c.type}</dd>
            <dt>Area</dt><dd>{c.area || "—"}</dd>
            <dt>Received</dt><dd>{new Date(c.createdAt).toLocaleDateString()}</dd>
            <dt>What it means</dt><dd>{LABEL[c.status] || c.status}</dd>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
