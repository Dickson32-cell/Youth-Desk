"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/Shell";

type Img = { id: number; mimeType: string; size: number; createdAt: string };
type Item = { id: number; kind: string; title: string; body: string };
type Theme = { primary: string; accent: string };

const SWATCHES: [string, string][] = [
  ["Navy", "#1C3F6E"], ["Deep green", "#14532D"], ["Maroon", "#7F1D1D"],
  ["Teal", "#0F766E"], ["Royal blue", "#1D4ED8"], ["Charcoal", "#1F2937"],
];
const ACCENTS: [string, string][] = [
  ["Gold", "#B88721"], ["Orange", "#D97706"], ["Amber", "#F59E0B"],
  ["Cyan", "#0891B2"], ["Rose", "#E11D48"], ["Silver", "#94A3B8"],
];

export default function ContentStudio() {
  const [heroImgs, setHeroImgs] = useState<Img[]>([]);
  const [aboutImgs, setAboutImgs] = useState<Img[]>([]);
  const [departments, setDepartments] = useState<Item[]>([]);
  const [services, setServices] = useState<Item[]>([]);
  const [theme, setTheme] = useState<Theme>({ primary: "#1C3F6E", accent: "#B88721" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [newDept, setNewDept] = useState({ title: "", body: "" });
  const [newSvc, setNewSvc] = useState({ title: "", body: "" });
  const [words, setWords] = useState<Record<string, string>>({});

  const note = (m: string) => { setMsg(m); setErr(""); };
  const fail = (m: string) => { setErr(m); setMsg(""); };

  const loadAll = useCallback(async () => {
    const r = await fetch("/api/admin/auth");
    if (!r.ok) { window.location.href = "/office/login"; return; }
    const [h, a, d, s, t, w] = await Promise.all([
      fetch("/api/admin/site/images?slot=hero").then((x) => x.json()).catch(() => null),
      fetch("/api/admin/site/images?slot=about").then((x) => x.json()).catch(() => null),
      fetch("/api/admin/site/items?kind=department").then((x) => x.json()).catch(() => null),
      fetch("/api/admin/site/items?kind=service").then((x) => x.json()).catch(() => null),
      fetch("/api/admin/site/theme").then((x) => x.json()).catch(() => null),
      fetch("/api/admin/site/text").then((x) => x.json()).catch(() => null),
    ]);
    setHeroImgs(h?.images || []);
    setAboutImgs(a?.images || []);
    setDepartments(d?.items || []);
    setServices(s?.items || []);
    if (t?.theme) setTheme({ primary: t.theme.primary, accent: t.theme.accent });
    setWords(w?.texts || {});
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function upload(slot: "hero" | "about", target: HTMLInputElement) {
    const files = target.files;
    if (!files || files.length === 0) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const { prepareFilesForUpload } = await import("@/lib/imgPrepare");
      const chosen = await prepareFilesForUpload(files);
      const fd = new FormData();
      fd.append("slot", slot);
      chosen.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/site/images", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Upload failed");
      else { note(`${slot === "hero" ? "Homepage slideshow" : "About gallery"} updated (+${j.count}).`); await loadAll(); }
    } finally { setBusy(false); target.value = ""; }
  }

  async function delImage(id: number) {
    if (!window.confirm("Remove this image from the public site?")) return;
    const res = await fetch(`/api/admin/site/images?id=${id}`, { method: "DELETE" });
    if (res.ok) { note("Image removed."); await loadAll(); }
  }

  async function addItem(kind: "department" | "service", form: { title: string; body: string }, reset: () => void) {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/site/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...form }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Could not save");
      else { note(`${kind === "department" ? "Department" : "Service"} added — live on the About page.`); reset(); await loadAll(); }
    } finally { setBusy(false); }
  }

  async function delItem(id: number, kind: string) {
    const res = await fetch(`/api/admin/site/items?id=${id}`, { method: "DELETE" });
    if (res.ok) { note(`${kind === "department" ? "Department" : "Service"} removed.`); await loadAll(); }
  }

  async function saveTheme(patch: Partial<Theme>) {
    const next = { ...theme, ...patch };
    setTheme(next);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/site/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Could not save colors");
      else note("Colors saved — the public site updates in a few seconds.");
    } finally { setBusy(false); }
  }

  const W_FIELDS: [string, string][] = [
    ["brand_main", "Top bar name (main)"],
    ["brand_sub", "Top bar name (small, under it)"],
    ["hero_title", "Main page heading"],
    ["hero_sub", "Main page introduction"],
    ["c1t", "Box 1 - title"], ["c1b", "Box 1 - description"],
    ["c2t", "Box 2 - title"], ["c2b", "Box 2 - description"],
    ["c3t", "Box 3 - title"], ["c3b", "Box 3 - description"],
  ];
  async function saveWords() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/site/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: words }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Could not save words");
      else {
        // Empty boxes mean "use the default": drop those overrides.
        for (const k of Object.keys(words)) if (!words[k].trim()) {
          await fetch(`/api/admin/site/text?key=${encodeURIComponent(k)}`, { method: "DELETE" });
          setWords((s) => { const n = { ...s }; delete n[k]; return n; });
        }
        note("Main page words saved — reload the homepage to see them.");
      }
    } finally { setBusy(false); }
  }

  function imgThumb(slot: "hero" | "about", rows: Img[], label: string, cap: string) {
    return (
      <div className="card">
        <h2>{label}</h2>
        <p className="sub">{cap}</p>
        <label className="fld">
          <span className="cap">Add photos (JPG/PNG, up to 5, auto-compressed)</span>
          <input type="file" multiple accept="image/*" disabled={busy} onChange={(e) => upload(slot, e.target)} />
        </label>
        {rows.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {rows.map((im, i) => (
              <div key={im.id} className="imgthumb">
                <span className="ord">{i + 1}</span>
                <img src={`/api/media/${im.id}`} alt="" />
                <span className="meta">{Math.round(im.size / 1024)} KB</span>
                <button className="btn btn-sm btn-danger" onClick={() => delImage(im.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        {rows.length === 0 && <p style={{ fontSize: 13, color: "#5b6b86" }}>No images yet — the site hides this section until one is uploaded ({slot === "hero" ? "the homepage shows just the words" : "the About page shows no gallery"}).</p>}
      </div>
    );
  }

  return (
    <main>
      <TopBar mode="office" />
      <div className="main">
        {msg && <div className="alert-ok noprint">{msg}</div>}
        {err && <div className="alert-err noprint">{err}</div>}

        {imgThumb("hero", heroImgs, "Homepage slideshow", "These photos appear on the main page, sliding one after the other.")}
        {imgThumb("about", aboutImgs, "About page gallery", "These photos appear in a strip under the About the Assembly page.")}

        <div className="card">
          <h2>Departments of the Assembly</h2>
          <p className="sub">What you type here replaces the placeholder list on the public About page.</p>
          <div className="form-grid">
            <label className="fld"><span className="cap">Department name</span>
              <input value={newDept.title} onChange={(e) => setNewDept((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Physical Planning Department" />
            </label>
            <label className="fld"><span className="cap">What it does (one line)</span>
              <input value={newDept.body} onChange={(e) => setNewDept((s) => ({ ...s, body: e.target.value }))} placeholder="e.g. Building permits and planning advice" />
            </label>
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => addItem("department", newDept, () => setNewDept({ title: "", body: "" }))}>Add department</button>
          {departments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {departments.map((it) => (
                <div key={it.id} className="listrow">
                  <span style={{ flex: 1 }}><b>{it.title}</b>{it.body && <span style={{ color: "#5b6b86" }}> — {it.body}</span>}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => delItem(it.id, "department")}>Remove</button>
                </div>
              ))}
            </div>
          )}
          {departments.length === 0 && <p style={{ fontSize: 13, color: "#5b6b86", marginTop: 8 }}>Nothing typed yet — the public page shows the placeholder list until you add the real departments.</p>}
        </div>

        <div className="card">
          <h2>Services we render</h2>
          <p className="sub">The services shown on the public About page.</p>
          <div className="form-grid">
            <label className="fld"><span className="cap">Service name</span>
              <input value={newSvc.title} onChange={(e) => setNewSvc((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Business operating permits" />
            </label>
            <label className="fld"><span className="cap">How it works (one line)</span>
              <input value={newSvc.body} onChange={(e) => setNewSvc((s) => ({ ...s, body: e.target.value }))} placeholder="e.g. Apply at the Trade & Industry office" />
            </label>
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => addItem("service", newSvc, () => setNewSvc({ title: "", body: "" }))}>Add service</button>
          {services.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {services.map((it) => (
                <div key={it.id} className="listrow">
                  <span style={{ flex: 1 }}><b>{it.title}</b>{it.body && <span style={{ color: "#5b6b86" }}> — {it.body}</span>}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => delItem(it.id, "service")}>Remove</button>
                </div>
              ))}
            </div>
          )}
          {services.length === 0 && <p style={{ fontSize: 13, color: "#5b6b86", marginTop: 8 }}>Nothing typed yet — the public page shows the placeholder list until you add the real services.</p>}
        </div>

        <div className="card">
          <h2>Main page words</h2>
          <p className="sub">Every word of the main page. Clear a box to go back to the default wording.</p>
          {W_FIELDS.map(([key, cap]) => (
            <label className="fld" key={key}><span className="cap">{cap}</span>
              <input value={words[key] ?? ""} onChange={(e) => setWords((s) => ({ ...s, [key]: e.target.value }))} placeholder="default wording" />
            </label>
          ))}
          <button className="btn btn-primary" disabled={busy} onClick={saveWords}>Save words</button>
        </div>

        <div className="card">
          <h2>Site colors</h2>
          <p className="sub">Tap a color and press Save — the top bar, buttons and the homepage band change everywhere.</p>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#33415c", marginBottom: 6 }}>Main color (top bar, buttons, band)</div>
            {SWATCHES.map(([name, hex]) => (
              <button key={hex} className={"swatch" + (theme.primary.toUpperCase() === hex ? " on" : "")} style={{ background: hex }} title={name} onClick={() => saveTheme({ primary: hex })} disabled={busy} aria-label={name} />
            ))}
            <input type="color" value={theme.primary} onChange={(e) => setTheme((s) => ({ ...s, primary: e.target.value }))} onBlur={(e) => saveTheme({ primary: e.target.value })} style={{ width: 46, height: 34, border: "1px solid #ccd5e3", borderRadius: 8, padding: 2, background: "#fff", cursor: "pointer" }} aria-label="Custom main color" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#33415c", marginBottom: 6 }}>Accent (highlights and the active tab)</div>
            {ACCENTS.map(([name, hex]) => (
              <button key={hex} className={"swatch" + (theme.accent.toUpperCase() === hex ? " on" : "")} style={{ background: hex }} title={name} onClick={() => saveTheme({ accent: hex })} disabled={busy} aria-label={name} />
            ))}
            <input type="color" value={theme.accent} onChange={(e) => setTheme((s) => ({ ...s, accent: e.target.value }))} onBlur={(e) => saveTheme({ accent: e.target.value })} style={{ width: 46, height: 34, border: "1px solid #ccd5e3", borderRadius: 8, padding: 2, background: "#fff", cursor: "pointer" }} aria-label="Custom accent color" />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={() => saveTheme({})}>Save colors</button>
        </div>
      </div>
    </main>
  );
}
