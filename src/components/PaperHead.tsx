"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The Wise-chrome header: one compact row (logo + bold brand, pill links,
// sun/moon switch, officer sign-in). The marker class .wise-site scopes the
// public design language in globals.css. Client component so client pages
// (report) can render it too.
const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/", label: "HOME", exact: true },
  { href: "/news", label: "NEWS" },
  { href: "/report", label: "REPORT AN ISSUE" },
  { href: "/track", label: "TRACK A CASE" },
  { href: "/programs", label: "ABOUT" },
];

export default function PaperHead({ active = "" }: { active?: string }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState({ main: "Youth Desk NJSMA", sub: "KOFORIDUA - EASTERN REGION - GHANA" });
  const [deskLogo, setDeskLogo] = useState("");

  useEffect(() => {
    const html = document.documentElement;
    setBrand({ main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA", sub: html.getAttribute("data-logo-url") ? "KOFORIDUA - EASTERN REGION - GHANA" : (html.getAttribute("data-brand-sub") || "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY") });
    setDeskLogo(html.getAttribute("data-logo-url") || "");
    if (localStorage.getItem("youthdesk-theme") === "dark") { html.setAttribute("data-theme", "dark"); setDark(true); }
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") { html.setAttribute("data-theme", "dark"); localStorage.setItem("youthdesk-theme", "dark"); setDark(true); }
    else { html.removeAttribute("data-theme"); localStorage.setItem("youthdesk-theme", "light"); setDark(false); }
  }

  const isOn = (t: { href: string; label: string; exact?: boolean }) =>
    active ? active === t.label : t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");

  return (
    <div className="wise-site">
      <header className="wise-top noprint">
        <Link href="/" className="brand">
          {/* The NJSMA Assembly seal rides with the brand on every public page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/seal" alt="NJSMA seal" className="seal-img" />
          {deskLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={deskLogo} alt="Youth Desk" />
          )}
          <b>
            {brand.main}
            <small>{brand.sub}</small>
          </b>
        </Link>
        <span className="sp" />
        <nav className="top-links" aria-label="Primary">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={isOn(t) ? "on" : ""}>
              {t.label}
            </Link>
          ))}
        </nav>
        <label className="ui-switch" title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle dark mode">
          <input type="checkbox" checked={dark} onChange={toggleTheme} aria-label="Toggle dark mode" />
          <div className="slider"><div className="circle" /></div>
        </label>
      </header>
    </div>
  );
}
