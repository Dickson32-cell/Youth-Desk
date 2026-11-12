"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/Shell";

type Youth = {
  id: number; serial: string; name: string; phone: string | null;
  area: string | null; dateOfBirth: string | null; education: string | null;
  skills: string | null; ghanaCard: string | null; createdAt: string;
};

export default function YouthRegister() {
  const [list, setList] = useState<Youth[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", area: "", education: "", skills: "", ghanaCard: "", dateOfBirth: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lastYouth, setLastYouth] = useState<{ id: number; serial: string; name: string; phone: string; area: string } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const load = useCallback(async (query: string) => {
    const res = await fetch("/api/admin/cases/youth?q=" + encodeURIComponent(query));
    if (res.status === 401) { window.location.href = "/office/login"; return; }
    setList((await res.json()).youth || []);
  }, []);

  useEffect(() => { load(""); }, [load]); /* eslint-disable-line */
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q]); /* eslint-disable-line */

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr("");
    const res = await fetch("/api/admin/cases/youth", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const j = await res.json();
    if (!res.ok) setErr(j.error || "Could not save");
    else {
      setMsg(`Registered ${j.youth.name} — serial ${j.youth.serial}`);
      setLastYouth({ id: j.youth.id, serial: j.youth.serial, name: j.youth.name, phone: j.youth.phone || "", area: j.youth.area || "" });
      setForm({ name: "", phone: "", area: "", education: "", skills: "", ghanaCard: "", dateOfBirth: "" });
      load(q);
    }
  }

  function takeComplaint() {
    if (!lastYouth) return;
    sessionStorage.setItem("youthcomplaint", JSON.stringify(lastYouth));
    window.location.href = "/dashboard";
  }

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card">
          <h2>Walk-in youth register</h2>
          <p className="sub">Everyone who visits the desk gets a card with their serial. Search by name, serial or area on the left.</p>
          <form className="form-grid" onSubmit={go}>
            <label className="fld"><span className="cap">Full name *</span>
              <input type="text" value={form.name} onChange={set("name")} required />
            </label>
            <label className="fld"><span className="cap">Phone</span>
              <input type="tel" value={form.phone} onChange={set("phone")} />
            </label>
            <label className="fld"><span className="cap">Area / community</span>
              <input type="text" value={form.area} onChange={set("area")} />
            </label>
            <label className="fld"><span className="cap">Date of birth</span>
              <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </label>
            <label className="fld"><span className="cap">Education</span>
              <input type="text" value={form.education} onChange={set("education")} placeholder="e.g. SHS completed" />
            </label>
            <label className="fld"><span className="cap">Skills</span>
              <input type="text" value={form.skills} onChange={set("skills")} placeholder="e.g. barbering, driving" />
            </label>
            <label className="fld"><span className="cap">Ghana Card number</span>
              <input type="text" value={form.ghanaCard} onChange={set("ghanaCard")} placeholder="GHA-XXXXXXXXX-X" />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-primary w-full">Register this youth</button>
            </div>
          </form>
          {msg && (
            <div className="alert-ok" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ flex: 1 }}>{msg}</span>
              {lastYouth && (
                <button className="btn btn-primary btn-sm" onClick={takeComplaint}>Take their complaint</button>
              )}
            </div>
          )}
          {err && <div className="alert-err">{err}</div>}
        </div>

        <div className="card">
          <div className="filters">
            <input type="text" placeholder="Search name, serial, area…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Serial</th><th>Name</th><th>Area</th><th>Phone</th><th>Skills</th></tr>
            </thead>
            <tbody>
              {list.map((y) => (
                <tr key={y.id}>
                  <td className="serial">{y.serial}</td>
                  <td>{y.name}</td>
                  <td>{y.area || "—"}</td>
                  <td>{y.phone || "—"}</td>
                  <td>{y.skills || "—"}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} style={{ color: "#5b6b86" }}>No youth registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
