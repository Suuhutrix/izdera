"use client";

import { History, X } from "lucide-react";
import Link from "next/link";
import { clearRecentSearches, removeRecentSearch, useRecentSearches } from "@/lib/storage";
import { buildSearchHref } from "./SearchBar";

/** Ana sayfadaki "son aramalar" kısayolları — veri yalnızca localStorage'da. */
export function RecentSearches() {
  const recent = useRecentSearches();
  if (recent.length === 0) return null;

  return (
    <section aria-label="Son aramalar" className="animate-fade-up w-full">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-subtle uppercase">
          <History className="size-3.5" />
          Son izler
        </h2>
        <button
          type="button"
          id="recent-clear"
          onClick={clearRecentSearches}
          className="text-xs text-subtle transition-colors hover:text-fg"
        >
          Temizle
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {recent.map((q) => (
          <li key={q} className="group relative">
            <Link
              href={buildSearchHref(q)}
              className="block max-w-[16rem] truncate rounded-full border border-line bg-surface/60 py-1.5 pr-8 pl-3.5 text-sm text-muted transition-all hover:border-line-strong hover:text-fg"
            >
              {q}
            </Link>
            <button
              type="button"
              aria-label={`"${q}" aramasını kaldır`}
              onClick={() => removeRecentSearch(q)}
              className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-full text-subtle opacity-60 transition-all hover:bg-elevated hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
