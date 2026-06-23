"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      /* localStorage indisponible */
    }
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="text-green-300 hover:text-green-100 transition-colors p-1 rounded-md hover:bg-green-700/40"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
