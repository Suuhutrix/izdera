"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { resolveBang } from "@/lib/search/bangs";
import { addRecentSearch, useSettings } from "@/lib/storage";
import { CATEGORIES, TIME_RANGES, type Category, type TimeRange } from "@/lib/types";
import { useHydrated, useSearch } from "@/lib/use-search";
import { cn } from "@/lib/utils";
import { ImageGrid } from "./ImageGrid";
import { InstantAnswerCard } from "./InstantAnswerCard";
import { KnowledgePanel } from "./KnowledgePanel";
import { ResultCard } from "./ResultCard";
import { buildSearchHref } from "./SearchBar";
import { SearchHeader } from "./SearchHeader";
import { ImageSkeleton, PanelSkeleton, ResultSkeleton } from "./Skeletons";
import { EmptyState, ErrorState } from "./States";

/** Sağlayıcı kimliğini okunur etikete çevirir (şeffaflık satırı). */
function providerLabel(provider: string): string {
  const names: Record<string, string> = {
    duckduckgo: "DuckDuckGo",
    brave: "Brave",
    wikipedia: "Vikipedi",
    marginalia: "Marginalia",
    commons: "Wikimedia Commons",
    wikinews: "Vikihaber",
    gdelt: "GDELT",
  };
  if (provider.startsWith("searxng:")) return `SearXNG · ${provider.slice(8)}`;
  return provider
    .split("+")
    .map((p) => names[p] ?? p)
    .join(" + ");
}

function Pagination({
  query,
  category,
  timeRange,
  page,
  hasMore,
}: {
  query: string;
  category: Category;
  timeRange: TimeRange;
  page: number;
  hasMore: boolean;
}) {
  if (page === 1 && !hasMore) return null;
  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-muted transition-all hover:border-line-strong hover:text-fg active:scale-95";
  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-center gap-3 py-10">
      {page > 1 ? (
        <Link id="page-prev" href={buildSearchHref(query, category, page - 1, timeRange)} className={btn}>
          <ChevronLeft className="size-4" /> Önceki
        </Link>
      ) : (
        <span className={cn(btn, "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-4" /> Önceki
        </span>
      )}
      <span className="min-w-8 text-center font-display text-2xl text-fg tabular-nums">{page}</span>
      {hasMore ? (
        <Link id="page-next" href={buildSearchHref(query, category, page + 1, timeRange)} className={btn}>
          Sonraki <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(btn, "pointer-events-none opacity-40")}>
          Sonraki <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function SearchView() {
  const sp = useSearchParams();
  const settings = useSettings();
  const hydrated = useHydrated();

  const query = (sp.get("q") ?? "").replace(/\s+/g, " ").trim();
  const catRaw = sp.get("category") ?? "general";
  const category: Category = (CATEGORIES as readonly string[]).includes(catRaw) ? (catRaw as Category) : "general";
  const timeRaw = sp.get("time") ?? "all";
  const timeRange: TimeRange = (TIME_RANGES as readonly string[]).includes(timeRaw) ? (timeRaw as TimeRange) : "all";
  const page = Math.min(20, Math.max(1, Number.parseInt(sp.get("p") ?? "1", 10) || 1));

  // Adres çubuğundan (Omnibox) "!yt nextjs" gibi bir bang sorgusu geldiyse doğrudan yönlendir
  const bangTarget = useMemo(() => (query ? resolveBang(query) : null), [query]);

  useEffect(() => {
    if (bangTarget) {
      window.location.replace(bangTarget.url);
    }
  }, [bangTarget]);

  // Ayarlar localStorage'dan hidrasyon sonrası okunur → URL ancak o zaman kurulur
  const apiUrl = useMemo(() => {
    if (!query || !hydrated || bangTarget) return null;
    const params = new URLSearchParams({
      q: query,
      p: String(page),
      category,
      lang: settings.lang,
      safe: String(settings.safe),
    });
    if (timeRange !== "all") params.set("time", timeRange);
    return `/api/search?${params}`;
  }, [query, page, category, timeRange, settings.lang, settings.safe, hydrated, bangTarget]);

  const { state, retry } = useSearch(apiUrl);

  // Başlık + geçmiş (eklenti/omnibox'tan gelen aramalar da kaydedilsin)
  useEffect(() => {
    document.title = query ? `${query} — İzdera` : "İzdera";
    if (query) addRecentSearch(query);
    window.scrollTo({ top: 0 });
  }, [query, category, timeRange, page]);

  const loading = state.status === "loading" || (query && !hydrated) || state.status === "idle";
  const data = state.status === "success" ? state.data : null;
  const isImages = category === "images";

  return (
    <div className="min-h-dvh [--rail:0px] lg:[--rail:11rem]">
      <SearchHeader query={query} category={category} timeRange={timeRange} />

      <main id="main" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {!query ? (
          <EmptyState query="" category="general" />
        ) : state.status === "error" ? (
          <div className="lg:pl-[calc(var(--rail)+1rem)]">
            <ErrorState message={state.error} onRetry={retry} />
          </div>
        ) : isImages ? (
          /* ---------------- Görseller: tam genişlik ızgara ---------------- */
          <section aria-label="Görsel sonuçları" aria-busy={Boolean(loading)} className="pt-6">
            {loading || !data ? (
              <ImageSkeleton />
            ) : data.results.length === 0 ? (
              <EmptyState query={query} category={category} />
            ) : (
              <>
                <ImageGrid results={data.results} newTab={settings.newTab} />
                <Pagination
                  query={query}
                  category={category}
                  timeRange={timeRange}
                  page={page}
                  hasMore={data.hasMore}
                />
              </>
            )}
          </section>
        ) : (
          /* ---------------- Tümü / Haberler: sonuç sütunu + bilgi paneli ---------------- */
          <div className="grid gap-x-12 lg:grid-cols-[minmax(0,680px)_minmax(0,360px)] lg:pl-[calc(var(--rail)+1rem)]">
            <section aria-label="Arama sonuçları" aria-busy={Boolean(loading)} className="min-w-0 pt-4">
              {loading || !data ? (
                <>
                  <div className="skeleton mt-1 mb-3 h-3 w-48" />
                  <ResultSkeleton />
                </>
              ) : data.results.length === 0 && !data.instantAnswer ? (
                <EmptyState query={query} category={category} />
              ) : (
                <>
                  {/* Şeffaflık satırı: süre + yanıtı veren kaynak */}
                  <p className="mt-1 mb-2 text-xs text-subtle">
                    {(data.tookMs / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} sn ·{" "}
                    <span title="Bu sonuçları sağlayan kaynak">{providerLabel(data.provider)}</span>
                  </p>

                  {data.suggestions.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-subtle">
                        <Sparkles className="size-3.5 text-accent" /> Bunu mu demek istediniz:
                      </span>
                      {data.suggestions.slice(0, 3).map((s) => (
                        <Link
                          key={s}
                          href={buildSearchHref(s, category, 1, timeRange)}
                          className="link-underline font-medium text-link italic"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Sıfır maliyetli Anlık Yanıt Kartı (hesap makinesi, birim, renk, saat/UUID) */}
                  {data.instantAnswer && <InstantAnswerCard answer={data.instantAnswer} />}

                  {/* Mobilde bilgi paneli sonuçların üstünde */}
                  {data.infobox && (
                    <div className="mb-4 lg:hidden">
                      <KnowledgePanel box={data.infobox} newTab={settings.newTab} />
                    </div>
                  )}

                  <div className="space-y-1">
                    {data.results.map((r, i) => (
                      <ResultCard key={`${r.url}-${i}`} result={r} query={query} newTab={settings.newTab} index={i} />
                    ))}
                  </div>
                  <Pagination
                    query={query}
                    category={category}
                    timeRange={timeRange}
                    page={page}
                    hasMore={data.hasMore}
                  />
                </>
              )}
            </section>

            {/* Masaüstü: yapışkan sağ panel */}
            <div className="hidden pt-6 lg:block">
              <div className="sticky top-36">
                {loading && category === "general" && page === 1 ? (
                  <PanelSkeleton />
                ) : (
                  data?.infobox && <KnowledgePanel box={data.infobox} newTab={settings.newTab} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
