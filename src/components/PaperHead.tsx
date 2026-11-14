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
  { href: "/programs", label: "ABOUT & PROGRAMMES", nav: "ABOUT & PROGRAMMES", tab: "About" },
];

export default function PaperHead({ active = "" }: { active?: string }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState({ main: "Youth Desk NJSMA", sub: "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });

  useEffect(() => {
    const html = document.documentElement;
    setBrand({ main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA", sub: html.getAttribute("data-brand-sub") || "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY" });
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
        <span className="paper-region">KOFORIDUA &middot; EASTERN REGION &middot; GHANA</span>
        <span className="paper-top-r">
          <button type="button" className="themetoggle" onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle dark mode">
            {dark ? "Light" : "Dark"}
          </button>
          <Link href="/office/login" className="paper-login">OFFICER SIGN IN</Link>
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
