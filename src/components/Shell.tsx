"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_TABS = [
  { href: "/", label: "Home", exact: true },
  { href: "/report", label: "Report" },
  { href: "/track", label: "Track" },
  { href: "/programs", label: "Programs" },
];

const OFFICE_TABS = [
  { href: "/dashboard", label: "Cases", exact: true },
  { href: "/dashboard/youth", label: "Youth" },
  { href: "/dashboard/report", label: "Reports" },
  { href: "/dashboard/account", label: "Account" },
];

export function NavBar({ mode = "public", on: _on }: { mode?: "public" | "office"; on?: string }) {
  const path = usePathname();
  const office = mode === "office";
  const tabs = office ? OFFICE_TABS : PUBLIC_TABS;
  const [me, setMe] = useState("");

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
            <span className="logo-t">Youth Desk</span>
            <span className="logo-s">{office ? "OFFICER CONSOLE" : "MUNICIPAL ASSEMBLY"}</span>
          </Link>
          <span className="sp" />
          <nav className="navlinks" aria-label="Primary">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} className={"navbtn" + (isActive(t) ? " on" : "")}>
                {t.label}
              </Link>
            ))}
          </nav>
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
  return <div className="footer">Youth Desk — Municipal Assembly. Every case gets a number; nothing is lost.</div>;
}

export default NavBar;
