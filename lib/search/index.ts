/**
 * Arama orkestratörü — sağlayıcı-bağımsız katman.
 *
 *   ┌──────────────┐  başarılı   ┌───────────────┐
 *   │ SearXNG pool │ ──────────► │   Yanıt +     │◄── Anlık Yanıt (0 ms, hesap/birim/renk)
 *   │ (özel +      │             │   Bilgi Paneli│◄── Wikipedia REST (paralel, her zaman)
 *   │  hızlı yarış)│  başarısız  │               │
 *   └──────┬───────┘ ──────┐     └───────────────┘
 *          │               ▼             ▲
 *          │     ┌────────────────────┐  │
 *          │     │ Gerçek Web Yedeği  │──┘
 *          │     │ DuckDuckGo + Wiki  │
 *          │     │ + Marginalia/GDELT │
 *          │     └────────────────────┘
 */
import type { SearchResponse, SearchResult } from "@/lib/types";
import { searchConfig } from "./config";
import { UpstreamError } from "./http";
import { searchBraveApi, searchDuckDuckGo, searchGdelt, searchMarginalia } from "./independent";
import { evaluateInstantAnswer } from "./instant";
import { searchSearxng } from "./searxng";
import { type ProviderOutput, type SearchParams, dedupe } from "./shared";
import { fetchWikipediaInfobox, searchCommons, searchWikinews, searchWikipedia } from "./wikimedia";

export type { SearchParams } from "./shared";

/**
 * Web sonuçlarını birincil tutup ansiklopedik/bağımsız kaynakları aralara serpiştirir.
 * Böylece ilk sonuçlar her zaman en alakalı web sayfaları olur.
 */
function mergeWebResults(outputs: ProviderOutput[]): SearchResult[] {
  const webPrimary = outputs
    .filter((o) => o.provider === "brave" || o.provider === "duckduckgo")
    .flatMap((o) => o.results);
  const secondary = outputs
    .filter((o) => o.provider !== "brave" && o.provider !== "duckduckgo")
    .flatMap((o) => o.results);

  if (webPrimary.length === 0) return secondary;
  if (secondary.length === 0) return webPrimary;

  const out: SearchResult[] = [];
  let sIdx = 0;
  for (let i = 0; i < webPrimary.length; i++) {
    out.push(webPrimary[i]!);
    // Her 3 web sonucundan sonra 1 Vikipedi/Marginalia sonucu ekle
    if ((i + 1) % 3 === 0 && sIdx < secondary.length) {
      out.push(secondary[sIdx++]!);
    }
  }
  while (sIdx < secondary.length) {
    out.push(secondary[sIdx++]!);
  }
  return out;
}

/** Yedek zincir: kategoriye uygun ücretsiz sağlayıcıları PARALEL çağırır, düşenleri yok sayar. */
async function runFallback(p: SearchParams): Promise<ProviderOutput> {
  const generalTasks: (() => Promise<ProviderOutput>)[] = [
    ...(searchConfig.braveApiKey ? [() => searchBraveApi(p)] : []),
    () => searchDuckDuckGo(p),
    () => searchWikipedia(p),
    () => searchMarginalia(p),
  ];

  const tasks: Record<SearchParams["category"], (() => Promise<ProviderOutput>)[]> = {
    general: generalTasks,
    images: [() => searchCommons(p)],
    news: [() => searchGdelt(p), () => searchWikinews(p), () => searchDuckDuckGo({ ...p, timeRange: p.timeRange === "all" ? "week" : p.timeRange })],
  };

  const settled = await Promise.allSettled(tasks[p.category].map((t) => t()));
  const ok = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));

  if (ok.length === 0) {
    const reasons = settled.map((s) => (s.status === "rejected" ? (s.reason as Error)?.message : "")).join(" | ");
    throw new UpstreamError(`all fallback providers failed → ${reasons}`);
  }

  let results =
    p.category === "news"
      ? ok
          .flatMap((o) => o.results)
          .sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""))
      : mergeWebResults(ok);
  results = dedupe(results);

  const activeProviders = ok.filter((o) => o.results.length > 0).map((o) => o.provider);

  return {
    provider: activeProviders.join("+") || ok.map((o) => o.provider).join("+"),
    results,
    suggestions: ok.flatMap((o) => o.suggestions).slice(0, 4),
    infobox: null,
    hasMore: ok.some((o) => o.hasMore),
  };
}

export interface SearchOutcome extends SearchResponse {
  /** true → yanıt yedek sağlayıcılardan geldi (daha kısa CDN önbelleği uygulanır). */
  degraded: boolean;
}

export async function runSearch(p: SearchParams): Promise<SearchOutcome> {
  const started = Date.now();
  const deadline = started + searchConfig.budgetMs;

  // Sıfır maliyetli anlık yanıt (hesaplama, birim, renk, saat/UUID)
  const instantAnswer = p.category === "general" && p.page === 1 ? evaluateInstantAnswer(p.q) : null;

  // Bilgi paneli ana aramayla PARALEL başlar → toplam süreye eklenmez.
  const infoboxPromise =
    p.category === "general" && p.page === 1
      ? fetchWikipediaInfobox(p).catch(() => null)
      : Promise.resolve(null);

  let primary: ProviderOutput | null = null;
  let degraded = false;
  try {
    primary = await searchSearxng(p, deadline);
  } catch (err) {
    // Sorgu içeriği loglanmaz (gizlilik) — yalnızca sağlayıcı hata özeti.
    console.warn("[izdera] searxng phase failed:", (err as Error).message.replace(p.q, "<q>"));
    primary = await runFallback(p);
    degraded = true;
  }

  const wikiBox = await infoboxPromise;

  return {
    query: p.q,
    page: p.page,
    category: p.category,
    lang: p.lang,
    timeRange: p.timeRange,
    results: primary.results,
    infobox: wikiBox ?? primary.infobox,
    instantAnswer,
    suggestions: primary.suggestions,
    provider: primary.provider,
    hasMore: primary.hasMore,
    tookMs: Date.now() - started,
    degraded,
  };
}
