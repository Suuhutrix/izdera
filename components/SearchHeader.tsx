"use client";

import type { Category, TimeRange } from "@/lib/types";
import { CategoryTabs } from "./CategoryTabs";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Sonuç sayfası başlığı. `--rail` değişkeni logonun kapladığı genişliktir;
 * sekmeler ve sonuç sütunu aynı değeri kullanarak arama kutusuyla hizalanır.
 * Performans: backdrop-blur yerine opak arka plan (GPU yükü yok).
 */
export function SearchHeader({
  query,
  category,
  timeRange = "all",
}: {
  query: string;
  category: Category;
  timeRange?: TimeRange;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-4 lg:flex-nowrap">
          <div className="flex shrink-0 items-center lg:w-[var(--rail)]">
            <Logo compact />
          </div>
          {/* Mobilde: logo + ikonlar üst satır, arama kutusu alt satırda tam genişlik */}
          <div className="order-last w-full lg:order-none lg:max-w-[680px] lg:flex-1">
            {/* key: URL'deki sorgu değişince input'u yeni değerle sıfırla */}
            <SearchBar key={query} initialQuery={query} category={category} timeRange={timeRange} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <SettingsMenu />
          </div>
        </div>
        <div className="mt-2 lg:pl-[calc(var(--rail)+1rem)]">
          <CategoryTabs query={query} active={category} timeRange={timeRange} />
        </div>
      </div>
    </header>
  );
}
