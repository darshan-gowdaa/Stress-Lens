"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-[var(--radius-full)] bg-[var(--color-surface-variant)] animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ml-2"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${
          isDark ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <i className="ri-moon-fill text-lg text-indigo-400"></i>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${
          isDark ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <i className="ri-sun-fill text-lg text-amber-500"></i>
      </div>
    </button>
  );
}
