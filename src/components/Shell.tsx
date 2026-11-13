"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_TABS = [
  { href: "/", label: "Home", exact: true },
  { href: "/report", label: "Report" },
  { href: "/track", label: "Track" },
  { href: "/programs", label: "About" },
];

const OFFICE_TABS = [
  { href: "/dashboard", label: "Cases", exact: true },
  { href: "/dashboard/youth", label: "Youth" },
  { href: "/dashboard/report", label: "Reports" },
  { href: "/dashboard/content", label: "Content" },
  { href: "/dashboard/account", label: "Account" },
];

export function NavBar({ mode = "public", on: _on }: { mode?: "public" | "office"; on?: string }) {
  const path = usePathname();
  const office = mode === "office";
  const tabs = office ? OFFICE_TABS : PUBLIC_TABS;
  const [me, setMe] = useState("");
  const [dark, setDark] = useState(false);
  const [brand, setBrand] = useState({ main: "Youth Desk NJSMA", sub: "NJSMA MUNICIPAL ASSEMBLY" });
  const [logo, setLogo] = useState<string>("");

  // Brand words + logo come from the layout (officer-edited); read once after mount.
  useEffect(() => {
    const html = document.documentElement;
    setBrand({ main: html.getAttribute("data-brand-main") || "Youth Desk NJSMA", sub: html.getAttribute("data-brand-sub") || "NJSMA MUNICIPAL ASSEMBLY" });
    setLogo(html.getAttribute("data-logo-url") || "");
  }, []);

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

      {/* Phone: fixed bottom tab bar (public 4 tabs; office adds Sign out). */}
      <nav className="tabbar noprint" aria-label="Primary">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={"tab" + (isActive(t) ? " on" : "")}
            aria-current={isActive(t) ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
        {office && (
          <button className="tab" onClick={signOut}>Sign out</button>
        )}
      </nav>
    </>
  );
}

export function Footer() {
  return <div className="footer">Youth Desk NJSMA. Every case gets a number; nothing is lost.</div>;
}

export default NavBar;
