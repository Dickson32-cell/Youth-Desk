"use client";

import { useEffect, useState } from "react";

// Public dark/light switch used by the Assembly Paper homepage top bar.
// Same behaviour as the shell toggle: remembered per device under
// 'youthdesk-theme'; light by default on first visit.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("youthdesk-theme") === "dark") setDark(true);
  }, []);
  function toggle() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") { html.setAttribute("data-theme", "dark"); localStorage.setItem("youthdesk-theme", "dark"); setDark(true); }
    else { html.removeAttribute("data-theme"); localStorage.setItem("youthdesk-theme", "light"); setDark(false); }
  }
  return (
    <button type="button" className="themetoggle" onClick={toggle} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle dark mode">
      {dark ? "Light" : "Dark"}
    </button>
  );
}
