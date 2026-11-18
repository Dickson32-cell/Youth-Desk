"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/Shell";

type Youth = {
  id: number; serial: string; name: string; phone: string | null;
  area: string | null; dateOfBirth: string | null; education: string | null;
  skills: string | null; ghanaCard: string | null; createdAt: string; source?: string;
};

export default function YouthRegister() {
  const [list, setList] = useState<Youth[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", area: "", education: "", skills: "", ghanaCard: "", dateOfBirth: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lastYouth, setLastYouth] = useState<{ id: number; serial: string; name: string; phone: string; area: string } | null>(null);
  const [editing, setEditing] = useState<Youth | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const load = useCallback(async (query: string) => {
    const res = await fetch("/api/admin/cases/youth?q=" + encodeURIComponent(query));
    if (res.status === 401) { window.location.href = "/office/login"; return; }
    setList((await res.json()).youth || []);
  }, []);

  useEffect(() => { load(""); }, [load]); /* eslint-disable-line */
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q]); /* eslint-disable-line */

  function exportExcel() {
    window.location.href = "/api/admin/youth-export";
  }

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

  function startEdit(y: Youth) {
    setEditing(y);
    setForm({
      name: y.name || "", phone: y.phone || "", area: y.area || "",
      education: y.education || "", skills: y.skills || "", ghanaCard: y.ghanaCard || "",
      dateOfBirth: (() => { const d = y.dateOfBirth ? new Date(y.dateOfBirth) : null; return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ""; })(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setMsg(""); setErr("");
    const res = await fetch(`/api/admin/cases/youth?id=${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const j = await res.json();
    if (!res.ok) setErr(j.error || "Could not save changes");
    else {
      setMsg(`${editing.serial} updated.`);
      setEditing(null);
      setForm({ name: "", phone: "", area: "", education: "", skills: "", ghanaCard: "", dateOfBirth: "" });
      load(q);
    }
  }

  function takeComplaint(y: { id: number; serial: string; name: string; phone: string; area: string } | null) {
    if (!y) return;
    sessionStorage.setItem("youthcomplaint", JSON.stringify(y));
    window.location.href = "/dashboard";
  }

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        <div className="card">
          <h2>Walk-in youth register</h2>
          <p className="sub">Everyone who visits the desk gets a card with their serial. Online registrations from the website land here too (ONLINE tag). Search by name, serial or area on the left.</p>
          {editing && (
            <div className="alert-ok" style={{ marginBottom: 10 }}>
              Editing <b>{editing.serial} - {editing.name}</b>{" "}
              <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ name: "", phone: "", area: "", education: "", skills: "", ghanaCard: "", dateOfBirth: "" }); }}>Cancel edit</button>
            </div>
          )}
          <form className="form-grid" onSubmit={editing ? saveEdit : go}>
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
              <button className="btn btn-primary w-full">{editing ? "Save changes" : "Register this youth"}</button>
            </div>
          </form>
          {msg && (
            <div className="alert-ok" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ flex: 1 }}>{msg}</span>
              {lastYouth && (
                <button className="btn btn-primary btn-sm" onClick={() => takeComplaint(lastYouth)}>Take their complaint</button>
              )}
            </div>
          )}
          {err && <div className="alert-err">{err}</div>}
        </div>

        <div className="card">
          <div className="filters">
            <input type="text" placeholder="Search name, serial, area…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-sm btn-ghost" onClick={exportExcel}>Download Excel</button>
          </div>
          <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr><th>Serial</th><th>Name</th><th>Area</th><th>Phone</th><th>Skills</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((y) => (
                <tr key={y.id} style={{ cursor: "pointer" }} title="Click to take this youth's complaint" onClick={() => takeComplaint({ id: y.id, serial: y.serial, name: y.name, phone: y.phone || "", area: y.area || "" })}>
                  <td className="serial">{y.serial}</td>
                  <td style={{ fontWeight: 600 }}>
                    {y.name}
                    {y.source === "ONLINE" ? (
                      <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, padding: "2px 7px", borderRadius: 999, border: "1px solid var(--gold)", color: "#a2631f", verticalAlign: "1px" }}>ONLINE</span>
                    ) : null}
                  </td>
                  <td>{y.area || "—"}</td>
                  <td>{y.phone || "—"}</td>
                  <td>{y.skills || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost" onClick={() => takeComplaint({ id: y.id, serial: y.serial, name: y.name, phone: y.phone || "", area: y.area || "" })}>Take complaint</button>
                    <button className="btn btn-sm btn-ghost" style={{ marginLeft: 6 }} onClick={() => startEdit(y)}>Edit</button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={async () => {
                      if (!window.confirm(`Delete ${y.serial} - ${y.name} from the walk-in register?`)) return;
                      let res = await fetch(`/api/admin/cases/youth?id=${y.id}`, { method: "DELETE" });
                      let j = await res.json().catch(() => ({}));
                      if (res.status === 409 && Array.isArray(j.linkedCases) && j.linkedCases.length > 0) {
                        const list = j.linkedCases.map((lc: { caseNumber: string; description: string }) => `- ${lc.caseNumber}: ${lc.description}`).join("\n");
                        if (!window.confirm(`${j.error}\n\nLinked case(s):\n${list}\n\nDelete these case(s) AND the register record together?`)) return;
                        res = await fetch(`/api/admin/cases/youth?id=${y.id}&force=1`, { method: "DELETE" });
                        j = await res.json().catch(() => ({}));
                      }
                      if (res.ok) load(q);
                      else window.alert(j.error || "Could not delete");
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} style={{ color: "#5b6b86" }}>No youth registered yet.</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </main>
  );
}
