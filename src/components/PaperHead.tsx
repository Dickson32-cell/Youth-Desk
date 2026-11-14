"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The Assembly Paper header: one identity for every public page (letterhead
// masthead + ruled nav strip), with the phone bottom tab bar preserved.
// Client component so client pages (report) can render it too.
const TABS: { href: string; label: string; nav: string; tab: string; exact?: boolean }[] = [
  { href: "/", label: "HOME", nav: "HOME", tab: "Home", exact: true },
  { href: "/news", label: "NEWS", nav: "NEWS", tab: "News" },
  { href: "/report", label: "REPORT AN ISSUE", nav: "REPORT AN ISSUE", tab: "Report" },
  { href: "/track", label: "TRACK A CASE", nav: "TRACK A CASE", tab: "Track" },
  { href: "/programs", label: "ABOUT", nav: "ABOUT", tab: "About" },
];

export default function PaperHead({ active = "" }: { active?: string }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState({ main: "Youth Desk NJSMA", sub: "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });
  const [deskLogo, setDeskLogo] = useState("");

  useEffect(() => {
    const html = document.documentElement;
    setBrand({ main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA", sub: html.getAttribute("data-brand-sub") || "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });
    setDeskLogo(html.getAttribute("data-logo-url") || "");
    if (localStorage.getItem("youthdesk-theme") === "dark") { html.setAttribute("data-theme", "dark"); setDark(true); }
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") { html.setAttribute("data-theme", "dark"); localStorage.setItem("youthdesk-theme", "dark"); setDark(true); }
    else { html.removeAttribute("data-theme"); localStorage.setItem("youthdesk-theme", "light"); setDark(false); }
  }

  const isOn = (t: { href: string; exact?: boolean; label: string }) =>
    active ? active === t.label : t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");

  return (
    <>
      <div className="paper-top noprint">
        {deskLogo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="paper-top-logo" src={deskLogo} alt="Youth Desk" />
        )}
        <span className="paper-region">KOFORIDUA &middot; EASTERN REGION &middot; GHANA</span>
        <span className="paper-top-r">
          <button type="button" className="paper-switch" role="switch" aria-checked={dark} aria-label="Toggle dark mode" title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>
            <svg className="sw-sun" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></svg>
            <svg className="sw-moon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" /></svg>
            <span className="knob" />
          </button>
        </span>
      </div>
      <div className="paper-mast">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/seal" alt="Assembly seal" />
        <h1 className="serif">{brand.main}</h1>
        <p>{brand.sub}</p>
      </div>
      <nav className="paper-nav noborder" aria-label="Primary">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={isOn(t) ? "pon" : ""}>
            {t.nav}
          </Link>
        ))}
      </nav>

    </>
  );
}
