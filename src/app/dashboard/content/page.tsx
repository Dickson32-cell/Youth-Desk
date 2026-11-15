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
  const [logoImgs, setLogoImgs] = useState<Img[]>([]);
  type NewsRow = { id: number; title: string; body: string; author: string; createdAt: string; images: { id: number; mimeType: string }[] };
  const [newsRows, setNewsRows] = useState<NewsRow[]>([]);
  const [newsForm, setNewsForm] = useState<{ id: number | null; title: string; body: string; important: boolean }>({ id: null, title: "", body: "", important: false });
  const [newsFiles, setNewsFiles] = useState<File[]>([]);
  const [newsRemove, setNewsRemove] = useState<number[]>([]);
  const [aboutImgs, setAboutImgs] = useState<Img[]>([]);
  const [departments, setDepartments] = useState<Item[]>([]);
  const [services, setServices] = useState<Item[]>([]);
  const [theme, setTheme] = useState<Theme>({ primary: "#1C3F6E", accent: "#B88721" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [newDept, setNewDept] = useState({ title: "", body: "" });
  const [newSvc, setNewSvc] = useState({ title: "", body: "" });
  const [editDept, setEditDept] = useState<number | null>(null);
  const [editSvc, setEditSvc] = useState<number | null>(null);
  const [words, setWords] = useState<Record<string, string>>({});

  const note = (m: string) => { setMsg(m); setErr(""); };
  const fail = (m: string) => { setErr(m); setMsg(""); };

  const loadAll = useCallback(async () => {
    const r = await fetch("/api/admin/auth");
    if (!r.ok) { window.location.href = "/office/login"; return; }
    // One failed list fetch used to leave the console empty until the next
    // action retried it silently. Now every load retries once on its own.
    const q = async (url: string) => {
      const one = () => fetch(url).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      const first = await one();
      return first !== null && first !== undefined ? first : await new Promise<typeof first>((res) => setTimeout(() => res(one()), 1200));
    };
    // Named results - the old positional destructure was shifted by two slots
    // (news landed in the about slot and vice versa), which left the posted
    // news list, the about gallery, words and theme loading from the wrong
    // responses forever.
    const [heroResp, logoResp, newsResp, aboutResp, deptResp, svcResp, themeResp, textResp] = await Promise.all([
      q("/api/admin/site/images?slot=hero"),
      q("/api/admin/site/images?slot=logo"),
      q("/api/admin/news"),
      q("/api/admin/site/images?slot=about"),
      q("/api/admin/site/items?kind=department"),
      q("/api/admin/site/items?kind=service"),
      q("/api/admin/site/theme"),
      q("/api/admin/site/text"),
    ]);
    setHeroImgs(heroResp?.images || []);
    setLogoImgs(logoResp?.images || []);
    setNewsRows(newsResp?.news || []);
    setAboutImgs(aboutResp?.images || []);
    setDepartments(deptResp?.items || []);
    setServices(svcResp?.items || []);
    if (themeResp?.theme) setTheme({ primary: themeResp.theme.primary, accent: themeResp.theme.accent });
    setWords(textResp?.texts || {});
  }, []);

  // Self-refresh: if a load fetch was eaten by a network flap, this heals it
  // within 15 seconds without the officer having to do anything.
  useEffect(() => { loadAll(); const iv = setInterval(() => { loadAll(); }, 15000); return () => clearInterval(iv); }, [loadAll]);

  async function uploadLogoWithIcons(target: HTMLInputElement) {
    const files = target.files;
    if (!files || files.length === 0) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const { prepareFilesForUpload } = await import("@/lib/imgPrepare");
      const prepared = await prepareFilesForUpload([files[0]]);
      const fd = new FormData();
      fd.append("slot", "logo");
      fd.append("files", prepared[0]);
      const res = await fetch("/api/admin/site/images", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Logo upload failed");
      else {
        // Install-card / home-screen icon variants from the same artwork.
        try {
          const { f192, f512, f512m } = await makePwaIconVariants(prepared[0]);
          for (const [slot, f] of [["icon192", f192], ["icon512", f512], ["icon512m", f512m]] as const) {
            const ifd = new FormData();
            ifd.append("slot", slot);
            ifd.append("files", f);
            await fetch("/api/admin/site/images", { method: "POST", body: ifd });
          }
        } catch { /* icon variants are best-effort; the manifest falls back to the built-in tile */ }
        note("Logo saved - the console, the main page and the install this app icon all use it now.");
        await loadAll();
      }
    } finally { setBusy(false); target.value = ""; }
  }

  async function upload(slot: "hero" | "about" | "logo", target: HTMLInputElement) {
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
      else { note(`${slot === "hero" ? "Homepage slideshow" : slot === "logo" ? "Logo" : "About gallery"} updated (+${j.count}).`); await loadAll(); }
    } finally { setBusy(false); target.value = ""; }
  }

  async function delImage(id: number) {
    if (!window.confirm("Remove this image from the public site?")) return;
    const res = await fetch(`/api/admin/site/images?id=${id}`, { method: "DELETE" });
    if (res.ok) { note("Image removed."); await loadAll(); }
  }

  function resetNewsForm() {
    setNewsForm({ id: null, title: "", body: "", important: false });
    setNewsFiles([]);
    setNewsRemove([]);
  }


  async function makePwaIconVariants(file: File | Blob): Promise<{ f192: File; f512: File; f512m: File }> {
    const bmp = await createImageBitmap(file);
    const draw = (size: number, scale: number) => {
      const cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      const cx = cv.getContext("2d")!;
      cx.fillStyle = "#FFFFFF";
      cx.fillRect(0, 0, size, size);
      const side = Math.round(size * scale);
      const ratio = Math.min(side / bmp.width, side / bmp.height);
      const w = Math.round(bmp.width * ratio), h = Math.round(bmp.height * ratio);
      cx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
      return cv;
    };
    const toFile = async (cv: HTMLCanvasElement, name: string) => {
      const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
      return new File([blob!], name, { type: "image/png" });
    };
    const f192 = await toFile(draw(192, 0.86), "icon-192.png");
    const f512 = await toFile(draw(512, 0.86), "icon-512.png");
    const f512m = await toFile(draw(512, 0.78), "icon-maskable-512.png");
    return { f192, f512, f512m };
  }

  async function submitNews(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("title", newsForm.title);
      fd.append("body", newsForm.body);
      fd.append("important", String(newsForm.important));
      newsRemove.forEach((rid) => fd.append("removeImages", String(rid)));
      // Same law as the gallery: phone photos are downscaled in the browser
      // (1600px/0.8) BEFORE upload, or 3 photos blow past the ~4.5 MB
      // serverless body cap and the save dies with "Could not save".
      const { prepareFilesForUpload } = await import("@/lib/imgPrepare");
      const chosen = await prepareFilesForUpload(newsFiles);
      chosen.forEach((f) => fd.append("files", f));
      const url = newsForm.id ? `/api/admin/news?id=${newsForm.id}` : "/api/admin/news";
      const res = await fetch(url, { method: newsForm.id ? "PATCH" : "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) fail(j.error || "Could not save the news");
      else { note(newsForm.id ? "News updated." : "News posted to the main page."); resetNewsForm(); await loadAll(); }
    } finally { setBusy(false); }
  }

  async function delNews(id: number) {
    if (!window.confirm("Delete this news item from the main page? Its images go too.")) return;
    const res = await fetch(`/api/admin/news?id=${id}`, { method: "DELETE" });
    if (res.ok) { note("News deleted."); if (newsForm.id === id) resetNewsForm(); await loadAll(); }
    else fail("Could not delete");
  }

  function editNews(n: NewsRow) {
    setNewsForm({ id: n.id, title: n.title, body: n.body, important: !!(n as { important?: boolean }).important });
    setNewsFiles([]);
    setNewsRemove([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addItem(
    kind: "department" | "service",
    form: { title: string; body: string },
    reset: () => void,
    editId: number | null,
    clearEdit: () => void,
  ) {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/site/items", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...form } : { kind, ...form }),
      });
      const j = await res.json().catch(() => ({}));
      const label = kind === "department" ? "Department" : "Service";
      if (!res.ok) fail(j.error || (editId ? `Could not save the ${label.toLowerCase()} change` : "Could not save"));
      else { note(editId ? `${label} updated — live on the About page.` : `${label} added — live on the About page.`); reset(); clearEdit(); await loadAll(); }
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
    ["c2t", "Track link - label"],
    ["card1_t", "Card 1 - title"], ["card1_d", "Card 1 - text"], ["card1_c", "Card 1 - action words"],
    ["card2_t", "Card 2 - title"], ["card2_d", "Card 2 - text"], ["card2_c", "Card 2 - action words"],
    ["card3_t", "Card 3 - title"], ["card3_d", "Card 3 - text"], ["card3_c", "Card 3 - action words"],
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
        <div className="card">
          <h2>Desk logo</h2>
          <p className="sub">Upload the Youth Desk NJSMA logo once (square image works best). It appears in the top-left corner of the officer console AND on the main web page.</p>
          <label className="fld">
            <span className="cap">{logoImgs.length > 0 ? "Replace the logo (the old one is removed)" : "Choose a logo file (JPG/PNG)"}</span>
            <input type="file" accept="image/*" disabled={busy} onChange={(e) => uploadLogoWithIcons(e.target)} />
          </label>
          {logoImgs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <img src={`/api/media/${logoImgs[0].id}`} alt="Desk logo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid #ccd8ea" }} />
              <div>
                <div style={{ fontSize: 13, color: "#3c5170", fontWeight: 600 }}>Live on the site</div>
                <button className="btn btn-sm btn-danger" style={{ marginTop: 6 }} onClick={() => delImage(logoImgs[0].id)}>Remove logo (site falls back to text)</button>
              </div>
            </div>
          )}
          {logoImgs.length === 0 && <p style={{ fontSize: 13, color: "#5b6b86", marginBottom: 0 }}>No logo yet — the consoles show the wordmark text only.</p>}
        </div>
        <div className="card">
          <h2>{newsForm.id ? `Edit news (#${newsForm.id})` : "Municipal news"}</h2>
          <p className="sub">Post updates from the Assembly. Delete or edit any posted item in the list under this form. The latest items appear on the main page: a scrolling newsflash line plus the newest three as photo cards.</p>
          <form onSubmit={submitNews}>
            <label className="fld"><span className="cap">Title *</span>
              <input value={newsForm.title} onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))} required maxLength={120} placeholder="e.g. Furniture handed over to 11 schools" />
            </label>
            <label className="fld"><span className="cap">The news *</span>
              <textarea rows={5} value={newsForm.body} onChange={(e) => setNewsForm((f) => ({ ...f, body: e.target.value }))} required maxLength={4000} placeholder="Write the full announcement as the public should read it" />
            </label>
            <label className="fld"><span className="cap">Photo(s) (optional, up to 3 - JPG/PNG/WebP)</span>
              {newsFiles.length === 0 ? (
                <input type="file" multiple accept="image/*" disabled={busy} onChange={(e) => setNewsFiles([...(e.target.files || [])])} />
              ) : (
                <div style={{ fontSize: 13, color: "#3c5170" }}>{newsFiles.map((f, i) => <span key={i}>{f.name} ({Math.round(f.size / 1024)} KB){i < newsFiles.length - 1 ? ", " : ""}</span>)} <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={() => setNewsFiles([])}>Clear</button></div>
              )}
            </label>
            {newsForm.id !== null && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <b style={{ fontSize: 12.5, width: "100%", color: "#5b6b86" }}>Current image(s):</b>
                {(newsRows.find((n) => n.id === newsForm.id)?.images || []).map((im) => (
                  <div key={im.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/news-image/${im.id}`} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid #ccd8ea" }} />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setNewsRemove((r) => [...r, im.id])}>Remove</button>
                  </div>
                ))}
                {(newsRows.find((n) => n.id === newsForm.id)?.images || []).length === 0 && <span style={{ fontSize: 12.5, color: "#8fa2bd" }}>No images on this item.</span>}
              </div>
            )}
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13.5, color: "#3c5170" }}>
              <input type="checkbox" checked={newsForm.important} onChange={(e) => setNewsForm((f) => ({ ...f, important: e.target.checked }))} />
              Mark as IMPORTANT — it scrolls in the newsflash ticker (main page + News page) and gets a badge
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : newsForm.id ? "Save news" : "Post news"}</button>
              {newsForm.id !== null && <button type="button" className="btn btn-ghost" onClick={resetNewsForm}>Cancel edit</button>}
            </div>
          </form>
          {newsRows.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid #eef1f8", paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "#8fa2bd", letterSpacing: 1, marginBottom: 8 }}>POSTED NEWS ({newsRows.length})</div>
              {newsRows.map((n) => (
                <div key={n.id} style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid #eef1f8", padding: "8px 0" }}>
                  {n.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/news-image/${n.images[0].id}`} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <span style={{ width: 56, height: 42, borderRadius: 8, background: "#eef1f8", display: "inline-flex", alignItems: "center", justifyContent: "center" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#12294a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: "#8fa2bd" }}>{new Date(n.createdAt).toLocaleDateString("en-GB")} · by {n.author} · {n.images.length} image(s){(n as { important?: boolean }).important ? " · IMPORTANT" : ""}</div>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => editNews(n)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => delNews(n.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {imgThumb("about", aboutImgs, "About page gallery", "These photos appear in a strip under the About the Assembly page.")}

        <div className="card">
          <h2>Departments of the Assembly</h2>
          <p className="sub">The official department list is here. Edit a name, write what it does, add or remove one — the public About page follows.</p>
          <div className="form-grid">
            <label className="fld"><span className="cap">Department name</span>
              <input value={newDept.title} onChange={(e) => setNewDept((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Physical Planning Department" />
            </label>
            <label className="fld"><span className="cap">What this department does (full description)</span>
              <textarea rows={6} maxLength={2000} value={newDept.body} onChange={(e) => setNewDept((s) => ({ ...s, body: e.target.value }))} placeholder="Write what the department handles and how the public can use it. Visitors read this when they tap the department on the About page." />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => addItem("department", newDept, () => setNewDept({ title: "", body: "" }), editDept, () => setEditDept(null))}>{editDept !== null ? "Save changes" : "Add department"}</button>
            {editDept !== null && <button className="btn btn-ghost btn-sm" onClick={() => { setEditDept(null); setNewDept({ title: "", body: "" }); }}>Cancel edit</button>}
          </div>
          {departments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {departments.map((it) => (
                <div key={it.id} className="listrow">
                  <span style={{ flex: 1 }}><b>{it.title}</b>{it.body && <span style={{ color: "#5b6b86" }}> — {it.body}</span>}{editDept === it.id && <span style={{ color: "#8fa2bd", fontSize: 12 }}> · editing</span>}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setNewDept({ title: it.title, body: it.body }); setEditDept(it.id); }}>Edit</button>
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
            <label className="fld"><span className="cap">How it works (up to a short paragraph)</span>
              <textarea rows={4} maxLength={2000} value={newSvc.body} onChange={(e) => setNewSvc((s) => ({ ...s, body: e.target.value }))} placeholder="e.g. Apply at the Trade & Industry office" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => addItem("service", newSvc, () => setNewSvc({ title: "", body: "" }), editSvc, () => setEditSvc(null))}>{editSvc !== null ? "Save changes" : "Add service"}</button>
            {editSvc !== null && <button className="btn btn-ghost btn-sm" onClick={() => { setEditSvc(null); setNewSvc({ title: "", body: "" }); }}>Cancel edit</button>}
          </div>
          {services.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {services.map((it) => (
                <div key={it.id} className="listrow">
                  <span style={{ flex: 1 }}><b>{it.title}</b>{it.body && <span style={{ color: "#5b6b86" }}> — {it.body}</span>}{editSvc === it.id && <span style={{ color: "#8fa2bd", fontSize: 12 }}> · editing</span>}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setNewSvc({ title: it.title, body: it.body }); setEditSvc(it.id); }}>Edit</button>
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
