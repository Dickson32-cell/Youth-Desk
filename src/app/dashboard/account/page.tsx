"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/Shell";
import PasswordInput from "@/components/PasswordInput";

export default function Account() {
  const [me, setMe] = useState<{ username: string; fullName: string } | null>(null);
  const [name, setName] = useState("");
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    fetch("/api/admin/auth")
      .then(async (r) => {
        if (!r.ok) return null;
        const j = (await r.json()) as { username: string; fullName?: string };
        setMe({ username: j.username, fullName: j.fullName || "" });
        setName(j.fullName || "");
        return j;
      })
      .catch(() => {});
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/name", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: name }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Could not save name");
      else {
        if (me) setMe({ ...me, fullName: j.fullName || name });
        setOk("Your full name is saved - it now appears on your report pack, referral forms and case slips.");
      }
    } finally { setBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Could not save");
      else {
        setOk("Your new password is saved. Use it next time you sign in.");
        setF({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } finally { setBusy(false); }
  }

  return (
    <>
      <TopBar mode="office" />
      <main className="main" style={{ maxWidth: 560 }}>
        <div className="card">
          <h2>My account</h2>
          <p className="sub">
            {me ? <>Signed in as <b>{me.username}</b>{me.fullName ? ` - ${me.fullName}` : ""}.</> : "Loading…"}
          </p>
          {ok && <div className="alert-ok">{ok}</div>}
          {err && <div className="alert-err">{err}</div>}

          <form onSubmit={saveName}>
            <label className="fld"><span className="cap">Your full name (appears on reports and printouts) *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Kwame Mensah" minLength={3} maxLength={80} />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save full name"}</button>
          </form>
        </div>

        <div className="card">
          <h2>Password</h2>
          <p className="sub">Create your own password here - it is saved securely (we never see it).</p>
          <form onSubmit={save}>
            <label className="fld"><span className="cap">Current password *</span>
              <PasswordInput value={f.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" required ariaLabel="Current password" />
            </label>
            <label className="fld"><span className="cap">New password (at least 8 characters) *</span>
              <PasswordInput value={f.newPassword} onChange={set("newPassword")} autoComplete="new-password" required minLength={8} ariaLabel="New password" />
            </label>
            <label className="fld"><span className="cap">Repeat new password *</span>
              <PasswordInput value={f.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" required minLength={8} ariaLabel="Repeat new password" />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        </div>

        <div className="card">
          <p className="sub" style={{ margin: 0 }}>
            Security tip: pick something only you know - a mix of letters and numbers, at least 8 characters.
            Forgotten passwords can be reset only by the office supervisor.
          </p>
        </div>
      </main>
    </>
  );
}
