"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_TABS = [
  { href: "/", label: "Home", exact: true },
  { href: "/news", label: "News" },
  { href: "/report", label: "Report" },
  { href: "/track", label: "Track" },
  { href: "/programs", label: "About" },
];

// Officer bar: four primary destinations + one More button on phones/tablets;
// Content and Account (plus identity + sign out) live in the More bottom sheet
// so the bar never packs more than five items.
const OFFICE_TABS = [
  { href: "/dashboard", label: "Cases", exact: true },
  { href: "/dashboard/youth", label: "Youth" },
  { href: "/dashboard/programmes", label: "Programmes" },
  { href: "/dashboard/report", label: "Reports" },
];

const OFFICE_MORE = [
  { href: "/dashboard/content", label: "Content", note: "Edit the public pages" },
  { href: "/dashboard/account", label: "Account", note: "Officer details" },
];

const CASES_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);
const YOUTH_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);
const PROG_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const REP_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8" />
  </svg>
);
const MORE_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);
const TAB_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": CASES_ICON,
  "/dashboard/youth": YOUTH_ICON,
  "/dashboard/programmes": PROG_ICON,
  "/dashboard/report": REP_ICON,
};

export function NavBar({ mode = "public", on: _on }: { mode?: "public" | "office"; on?: string }) {
  const path = usePathname();
  const office = mode === "office";
  const tabs = office ? OFFICE_TABS : PUBLIC_TABS;
  const [me, setMe] = useState("");
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState({ main: "Youth Desk NJSMA", sub: "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });
  const [logo, setLogo] = useState<string>("");
  const [moreOpen, setMoreOpen] = useState(false);

  // Brand words + logo come from the layout (officer-edited); read once after mount.
  useEffect(() => {
    const html = document.documentElement;
    setBrand({ main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA", sub: html.getAttribute("data-brand-sub") || "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });
    setLogo(html.getAttribute("data-logo-url") || "");
  }, []);

  // close the More sheet whenever the route changes
  useEffect(() => { setMoreOpen(false); }, [path]);

  // Public pages remember the visitor's light/dark choice; officer pages stay light
  // (the console and all printables are designed for paper-white surfaces).
  useEffect(() => {
    const html = document.documentElement;
    if (office) {
      html.removeAttribute("data-theme");
      setDark(false);
      return;
    }
    const stored = localStorage.getItem("youthdesk-theme");
    if (stored === "dark") { html.setAttribute("data-theme", "dark"); setDark(true); }
    return () => { if (!office) { /* keep visitor choice between public pages */ } };
  }, [office]);

  function toggleTheme() {
    const html = document.documentElement;
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") { html.setAttribute("data-theme", "dark"); localStorage.setItem("youthdesk-theme", "dark"); setDark(true); }
    else { html.removeAttribute("data-theme"); localStorage.setItem("youthdesk-theme", "light"); setDark(false); }
    void html;
  }

  useEffect(() => {
    if (!office) return;
    fetch("/api/admin/auth")
      .then(async (r) => { if (r.ok) setMe(((await r.json()) as { username?: string }).username || ""); })
      .catch(() => {});
  }, [office]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/office/login";
  }

  const isActive = (t: { href: string; exact?: boolean }) =>
    t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");

  const moreActive = office && OFFICE_MORE.some((t) => isActive(t));

  return (
    <>
      {/*
        Desktop + tablet: one navy top bar with quiet text links (active = pill).
        Office mode shows the signed-in officer + sign out instead of public links.
      */}
      <header className="topbar noprint">
        <div className="bar">
          <Link href={office ? "/dashboard" : "/"} className="brand">
            {logo && <img src={logo} alt="" className="logo-img" />}
            <span className="logo-t">{brand.main}</span>
            <span className="logo-s">{office ? "OFFICER CONSOLE" : brand.sub}</span>
          </Link>
          <span className="sp" />
          <nav className="navlinks" aria-label="Primary">
            {office && OFFICE_MORE.map((t) => (
              <Link key={t.href} href={t.href} className={"navbtn" + (isActive(t) ? " on" : "")}>
                {t.label}
              </Link>
            ))}
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} className={"navbtn" + (isActive(t) ? " on" : "")}>
                {t.label}
              </Link>
            ))}
          </nav>
          {!office && (
            <button className="themetoggle" onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle dark mode">
              {dark ? "\u2600 Light" : "\u263E Dark"}
            </button>
          )}
          {office && (
            <span className="officer-chip">
              {me || "Officer"}
              <button className="signout" onClick={signOut}>Sign out</button>
            </span>
          )}
        </div>
      </header>

      {/* Phone + tablet: fixed bottom tab bar - four primary destinations + More.
          The More bottom sheet carries Content, Account, identity and Sign out. */}
      <nav className="tabbar noprint" aria-label="Primary">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={"tab" + (isActive(t) ? " on" : "")}
            aria-current={isActive(t) ? "page" : undefined}
          >
            {office ? TAB_ICONS[t.href] : null}
            <span>{t.label}</span>
          </Link>
        ))}
        {office && (
          <button
            type="button"
            className={"tab" + (moreOpen || moreActive ? " on" : "")}
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
          >
            {MORE_ICON}
            <span>More</span>
          </button>
        )}
      </nav>

      {office && moreOpen && (
        <div className="sheetwrap noprint" onClick={() => setMoreOpen(false)}>
          <div className="sheet" role="menu" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" aria-hidden="true" />
            <div className="sheet-head">More</div>
            {OFFICE_MORE.map((t) => (
              <Link key={t.href} href={t.href} className={"sheet-row" + (isActive(t) ? " on" : "")}>
                <span>{t.label}</span>
                <span className="sheet-note">{t.note}</span>
              </Link>
            ))}
            <div className="sheet-sep" />
            <div className="sheet-id">Signed in as <b>{me || "Officer"}</b></div>
            <button className="sheet-row so" onClick={signOut}>Sign out</button>
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return <div className="footer">Youth Desk NJSMA. Every case gets a number; nothing is lost.</div>;
}

export default NavBar;
