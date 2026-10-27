"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SearchResult } from "@/lib/types";
import { cn, hostnameOf } from "@/lib/utils";

function ImageTile({
  result,
  index,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null; // kırık görseli gizle, ızgarada boşluk bırakma

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${result.title} görselini büyüt`}
      className="group animate-fade-up relative mb-3 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-xl border border-line bg-elevated text-left"
      style={{ animationDelay: `${Math.min(index, 16) * 25}ms` }}
    >
      {/* Yüklenene kadar shimmer; min-h layout sıçramasını sınırlar */}
      {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
      <img
        src={result.thumbnail}
        alt={result.title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "block min-h-28 w-full object-cover transition-all duration-500 group-hover:scale-[1.03]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Hover katmanı: başlık + kaynak */}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="line-clamp-2 text-xs font-medium text-white">{result.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-white/70">
          {hostnameOf(result.url)}
          <ExternalLink className="size-2.5" />
        </p>
      </div>
    </button>
  );
}

/** Masonry görsel ızgarası + Tam ekran Lightbox önizleme modalı. */
export function ImageGrid({ results, newTab }: { results: SearchResult[]; newTab: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [useFallbackThumb, setUseFallbackThumb] = useState(false);

  const active = activeIndex !== null ? results[activeIndex] : null;

  useEffect(() => {
    setUseFallbackThumb(false);
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveIndex(null);
      else if (e.key === "ArrowRight") setActiveIndex((i) => (i !== null ? (i + 1) % results.length : null));
      else if (e.key === "ArrowLeft")
        setActiveIndex((i) => (i !== null ? (i - 1 + results.length) % results.length : null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, results.length]);

  const fullImageUrl = active ? (useFallbackThumb ? active.thumbnail : (active.img ?? active.thumbnail)) : undefined;

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
        {results.map((r, i) => (
          <ImageTile key={`${r.url}-${i}`} result={r} index={i} onSelect={() => setActiveIndex(i)} />
        ))}
      </div>

      {/* Lightbox Önizleme Modalı */}
      {active && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActiveIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
          >
            {/* Üst bar */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{active.title}</p>
                <p className="truncate text-xs text-subtle">
                  {hostnameOf(active.url)} · {activeIndex + 1} / {results.length}
                </p>
              </div>
              <button
                type="button"
                aria-label="Önizlemeyi kapat"
                onClick={() => setActiveIndex(null)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Görsel alanı + önceki/sonraki butonları */}
            <div className="relative flex min-h-64 flex-1 items-center justify-center overflow-hidden bg-black/50 p-3">
              {results.length > 1 && (
                <button
                  type="button"
                  aria-label="Önceki görsel"
                  onClick={() => setActiveIndex((activeIndex - 1 + results.length) % results.length)}
                  className="absolute left-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-fg shadow transition-transform hover:scale-105 active:scale-95"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}

              <img
                src={fullImageUrl}
                alt={active.title}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (!useFallbackThumb && active.thumbnail && active.img !== active.thumbnail) {
                    setUseFallbackThumb(true);
                  }
                }}
                className="max-h-[65dvh] max-w-full rounded-lg object-contain"
              />

              {results.length > 1 && (
                <button
                  type="button"
                  aria-label="Sonraki görsel"
                  onClick={() => setActiveIndex((activeIndex + 1) % results.length)}
                  className="absolute right-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-fg shadow transition-transform hover:scale-105 active:scale-95"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>

            {/* Alt aksiyon çubuğu */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <span className="rounded-full bg-elevated px-2.5 py-1 text-[0.7rem] tracking-wider text-subtle uppercase">
                {active.engine}
              </span>
              <div className="flex items-center gap-2">
                {fullImageUrl && (
                  <a
                    href={fullImageUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <ImageIcon className="size-3.5" />
                    Görseli aç
                  </a>
                )}
                <a
                  href={active.url}
                  target={newTab ? "_blank" : undefined}
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-bg transition-all hover:brightness-110"
                >
                  Kaynak sayfaya git
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
