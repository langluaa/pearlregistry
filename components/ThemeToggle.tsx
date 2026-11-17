"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      setTheme((localStorage.getItem("theme") as Theme) || "system");
    } catch {}
  }, []);
  const cycle = () => {
    const next: Theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  };
  const label = theme === "system" ? "Auto" : theme === "dark" ? "Dark" : "Light";
  return (
    <button className="btn btn-ghost btn-sm" onClick={cycle} title="Change appearance" aria-label={`Theme: ${label}`}>
      <span aria-hidden="true">{theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}</span>
      <span className="hide-sm">{label}</span>
    </button>
  );
}

/** Inline script that applies the saved theme before paint (no flash). */
export const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
