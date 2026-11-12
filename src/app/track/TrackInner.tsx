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

export default function TrackInner() {
  const sp = useSearchParams();
  const [num, setNum] = useState(sp.get("c") || "");
  const [c, setC] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(n?: string) {
    const target = (n || num).trim().toUpperCase();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/public/track?caseNumber=" + encodeURIComponent(target));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Not found"); setC(null); }
      else setC(j);
    } finally { setBusy(false); }
  }

  useEffect(() => { const q = sp.get("c"); if (q) go(q); /* eslint-disable-next-line */ }, []);

  return (
    <><TopBar on="track" /><main className="main" style={{ maxWidth: 560 }}>
      <form className="card" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <h2>Track your case</h2>
        <p className="sub">Enter the case number from your slip or SMS.</p>
        <div className="filters" style={{ marginBottom: 12 }}>
          <input type="text" value={num} onChange={(e) => setNum(e.target.value)} placeholder="YD-2026-0001" style={{ flex: 1 }} required />
          <button className="btn btn-primary" disabled={busy || !num}>Check</button>
        </div>
        {err && <div className="alert-err">{err}</div>}
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
