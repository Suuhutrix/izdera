/**
 * Bağımsız ve yedek web indeks sağlayıcıları:
 *  - DuckDuckGo HTML: Anahtarsız, gerçek Türkçe/küresel web sonuçları (birincil web yedeği)
 *  - Brave API:       Opsiyonel resmi Brave Search API (BRAVE_API_KEY tanımlıysa)
 *  - Marginalia:      Bağımsız web indeksi (ücretsiz kişisel anahtar: contact@marginalia-search.com)
 *  - GDELT:           Açık küresel haber veritabanı (anahtarsız)
 */
import type { SearchResult } from "@/lib/types";
import { hostnameOf, stripHtml, truncate } from "@/lib/utils";
import { searchConfig } from "./config";
import { fetchJson, fetchText } from "./http";
import { type ProviderOutput, type SearchParams, acceptLanguageFor, dedupe, isHttpUrl } from "./shared";

/* ============================== DuckDuckGo HTML (Gerçek Web Yedeği) ============================== */

function unwrapDdgUrl(rawHref: string): string {
  let clean = rawHref.replace(/&amp;/g, "&").trim();
  if (clean.startsWith("//")) clean = `https:${clean}`;
  try {
    const u = new URL(clean);
    if (u.hostname.includes("duckduckgo.com")) {
      const uddg = u.searchParams.get("uddg");
      if (uddg) return uddg;
    }
  } catch {
    /* geçersiz URL */
  }
  return clean;
}

export async function searchDuckDuckGo(p: SearchParams): Promise<ProviderOutput> {
  const kl = p.lang === "tr-TR" ? "tr-tr" : p.lang === "en-US" ? "us-en" : "wt-wt";
  const kp = p.safe === 2 ? "1" : p.safe === 0 ? "-2" : "-1";
  const dfMap: Record<SearchParams["timeRange"], string> = {
    all: "",
    day: "d",
    week: "w",
    month: "m",
    year: "y",
  };

  const params = new URLSearchParams({
    q: p.q,
    kl,
    kp,
  });
  if (dfMap[p.timeRange]) params.set("df", dfMap[p.timeRange]);
  if (p.page > 1) params.set("s", String((p.page - 1) * 25));

  const html = await fetchText(`https://html.duckduckgo.com/html/?${params}`, {
    timeoutMs: Math.min(searchConfig.timeoutMs + 500, 3500),
    acceptLanguage: acceptLanguageFor(p.lang),
  });

  const chunks = html.split(/<h2 class="result__title">/i).slice(1);
  const parsed: SearchResult[] = [];

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const url = unwrapDdgUrl(titleMatch[1]!);
    if (!isHttpUrl(url) || url.includes("duckduckgo.com/y.js")) continue;

    const snippetMatch = chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    const title = truncate(stripHtml(titleMatch[2]) || hostnameOf(url), 140);
    const content = truncate(stripHtml(snippetMatch?.[1] ?? ""), 320);

    parsed.push({
      title,
      url,
      content,
      engine: "duckduckgo",
    });
  }

  const results = dedupe(parsed).slice(0, 25);
  return {
    provider: "duckduckgo",
    results,
    suggestions: [],
    infobox: null,
    hasMore: results.length >= 10,
  };
}

/* ============================== Brave Search Resmi API (Opsiyonel) ============================== */

interface BraveWebResponse {
  web?: {
    results?: { title?: string; url?: string; description?: string; age?: string }[];
  };
}

export async function searchBraveApi(p: SearchParams): Promise<ProviderOutput> {
  if (!searchConfig.braveApiKey) {
    return { provider: "brave", results: [], suggestions: [], infobox: null, hasMore: false };
  }
  const safesearch = p.safe === 2 ? "strict" : p.safe === 0 ? "off" : "moderate";
  const freshnessMap: Record<SearchParams["timeRange"], string> = {
    all: "",
    day: "pd",
    week: "pw",
    month: "pm",
    year: "py",
  };
  const params = new URLSearchParams({
    q: p.q,
    count: "20",
    offset: String(Math.min(9, p.page - 1)),
    safesearch,
    search_lang: p.lang === "tr-TR" ? "tr" : "en",
  });
  if (freshnessMap[p.timeRange]) params.set("freshness", freshnessMap[p.timeRange]);

  const data = await fetchJson<BraveWebResponse>(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    timeoutMs: searchConfig.timeoutMs,
    headers: { "X-Subscription-Token": searchConfig.braveApiKey },
  });

  const results: SearchResult[] = (data.web?.results ?? [])
    .filter((r) => isHttpUrl(r.url))
    .map((r) => ({
      title: truncate(stripHtml(r.title) || hostnameOf(r.url!), 140),
      url: r.url!,
      content: truncate(stripHtml(r.description), 320),
      engine: "brave",
    }));

  return {
    provider: "brave",
    results,
    suggestions: [],
    infobox: null,
    hasMore: results.length >= 15,
  };
}

/* ============================== Marginalia ============================== */

interface MarginaliaResponse {
  results?: { url?: string; title?: string; description?: string }[];
}

export async function searchMarginalia(p: SearchParams): Promise<ProviderOutput> {
  const params = new URLSearchParams({
    query: p.q,
    count: "10",
    page: String(p.page),
    nsfw: p.safe > 0 ? "1" : "0",
  });
  const data = await fetchJson<MarginaliaResponse>(`https://api2.marginalia-search.com/search?${params}`, {
    timeoutMs: searchConfig.timeoutMs,
    headers: { "API-Key": searchConfig.marginaliaKey },
  });
  const results: SearchResult[] = (data.results ?? [])
    .filter((r) => isHttpUrl(r.url))
    .map((r) => ({
      title: truncate(stripHtml(r.title) || hostnameOf(r.url!), 140),
      url: r.url!,
      content: truncate(stripHtml(r.description), 320),
      engine: "marginalia",
    }));
  return { provider: "marginalia", results, suggestions: [], infobox: null, hasMore: results.length === 10 };
}

/* ============================== GDELT (haber) ============================== */

interface GdeltResponse {
  articles?: { url?: string; title?: string; seendate?: string; domain?: string }[];
}

/** "20261027T053000Z" → ISO 8601 */
function gdeltDate(s?: string): string | undefined {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : undefined;
}

export async function searchGdelt(p: SearchParams): Promise<ProviderOutput> {
  // GDELT sayfalama desteklemez ve 3 karakterden kısa terimleri reddeder.
  if (p.page > 1 || p.q.trim().length < 3) {
    return { provider: "gdelt", results: [], suggestions: [], infobox: null, hasMore: false };
  }
  const langFilter = p.lang === "tr-TR" ? " sourcelang:turkish" : p.lang === "en-US" ? " sourcelang:english" : "";
  const timespanMap: Record<SearchParams["timeRange"], string> = {
    all: "",
    day: "24h",
    week: "1w",
    month: "1m",
    year: "1y",
  };
  const params = new URLSearchParams({
    query: `${p.q}${langFilter}`,
    mode: "artlist",
    format: "json",
    maxrecords: "25",
    sort: "datedesc",
  });
  if (timespanMap[p.timeRange]) params.set("timespan", timespanMap[p.timeRange]);

  const data = await fetchJson<GdeltResponse>(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    timeoutMs: searchConfig.timeoutMs,
    revalidate: 300, // haberler daha hızlı eskir
  });
  const results: SearchResult[] = (data.articles ?? [])
    .filter((a) => isHttpUrl(a.url) && a.title)
    .map((a) => ({
      title: truncate(stripHtml(a.title), 140),
      url: a.url!,
      content: a.domain ?? hostnameOf(a.url!),
      engine: "gdelt",
      publishedDate: gdeltDate(a.seendate),
    }));
  return { provider: "gdelt", results, suggestions: [], infobox: null, hasMore: false };
}
