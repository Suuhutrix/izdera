"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "izdera:theme";

/**
 * Tema değiştirici.
 * İkon görünürlüğü tamamen CSS ile (`dark:` varyantı) yönetilir → React state yok,
 * hidrasyon uyumsuzluğu yok, ilk boyamada doğru ikon görünür.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";

    // Geçiş sırasında yalnızca renkleri yumuşat, sonra sınıfı kaldır (performans).
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* depolama yoksa yalnızca bu oturum için geçerli */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0f1117" : "#fbfaf7");
  };

  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={toggle}
      aria-label="Temayı değiştir"
      title="Temayı değiştir"
      className={cn(
        "grid size-9 place-items-center rounded-full text-muted transition-colors",
        "hover:bg-elevated hover:text-fg active:scale-95",
        className,
      )}
    >
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.75} />
      <Moon className="size-[18px] dark:hidden" strokeWidth={1.75} />
    </button>
  );
}
