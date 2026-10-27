"use client";

import { Clock, Image as ImageIcon, Newspaper, Search } from "lucide-react";
import Link from "next/link";
import type { Category, TimeRange } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildSearchHref } from "./SearchBar";

const TABS: { id: Category; label: string; icon: typeof Search }[] = [
  { id: "general", label: "Tümü", icon: Search },
  { id: "images", label: "Görseller", icon: ImageIcon },
  { id: "news", label: "Haberler", icon: Newspaper },
];

const TIME_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "all", label: "Tüm zamanlar" },
  { id: "day", label: "Son 24 saat" },
  { id: "week", label: "Son hafta" },
  { id: "month", label: "Son ay" },
  { id: "year", label: "Son yıl" },
];

/** Kategori sekmeleri + Zaman aralığı filtresi: URL'yi günceller → SearchView API'yi çağırır. */
export function CategoryTabs({
  query,
  active,
  timeRange = "all",
}: {
  query: string;
  active: Category;
  timeRange?: TimeRange;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <nav aria-label="Arama kategorileri" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              id={`tab-${id}`}
              href={buildSearchHref(query, id, 1, id === "images" ? "all" : timeRange)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 pt-2 pb-3 text-sm transition-colors",
                isActive ? "font-medium text-fg" : "text-subtle hover:text-fg",
              )}
            >
              <Icon className={cn("size-4", isActive && "text-accent")} strokeWidth={isActive ? 2.25 : 1.75} />
              {label}
              {/* Aktif sekme alt çizgisi — scale ile animasyonlu (GPU dostu) */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2 bottom-0 h-0.5 origin-center rounded-full bg-accent transition-transform duration-300",
                  isActive ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Zaman aralığı seçici (Tümü ve Haberler için) */}
      {active !== "images" && query && (
        <div
          aria-label="Zaman aralığı filtresi"
          className="flex items-center gap-1 overflow-x-auto pb-1.5 text-xs [scrollbar-width:none]"
        >
          <Clock className="mr-0.5 size-3.5 shrink-0 text-subtle" aria-hidden="true" />
          {TIME_OPTIONS.map((t) => {
            const isSelected = timeRange === t.id;
            return (
              <Link
                key={t.id}
                href={buildSearchHref(query, active, 1, t.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 transition-colors",
                  isSelected
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-subtle hover:bg-elevated hover:text-fg",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
