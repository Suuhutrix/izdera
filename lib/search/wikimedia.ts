/**
 * Wikimedia sağlayıcıları — resmi, ücretsiz, anahtarsız ve güvenilir.
 *  - fetchWikipediaInfobox: bilgi paneli (her zaman bu kaynaktan)
 *  - searchWikipedia:       "Tümü" için yedek web sonuçları
 *  - searchCommons:         "Görseller" için yedek
 *  - searchWikinews:        "Haberler" için yedek
 * Wikimedia API politikası: açıklayıcı User-Agent zorunlu (http.ts'de ayarlı).
 */
import type { Infobox, SearchResult } from "@/lib/types";
import { foldText, stripHtml, truncate } from "@/lib/utils";
import { searchConfig } from "./config";
import { fetchJson } from "./http";
import { type ProviderOutput, type SearchParams, baseLang } from "./shared";

const PAGE_SIZE = 10;

function wikiArticleUrl(lang: string, title: string) {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

/* ============================== Bilgi Paneli ============================== */

interface InfoboxPage {
  title: string;
  index?: number;
  extract?: string;
  description?: string;
  fullurl?: string;
  thumbnail?: { source: string };
  pageprops?: { disambiguation?: string };
}

/**
 * Panel yalnızca başlık sorguyla gerçekten örtüşüyorsa gösterilir
 * (alakasız bir makale paneli, hiç panel olmamasından kötüdür).
 */
function isRelevant(title: string, q: string): boolean {
  const t = foldText(title.replace(/\s*\(.*?\)\s*/g, " ")).trim();
  const query = foldText(q).trim();
  if (!t || !query) return false;
  if (t === query) return true;
  const tTokens = t.split(/[\s,]+/).filter((w) => w.length > 1);
  const qTokens = query.split(/\s+/).filter((w) => w.length > 1);
  if (!tTokens.length || !qTokens.length) return false;
  return tTokens.every((w) => query.includes(w)) || qTokens.every((w) => t.includes(w));
}

export async function fetchWikipediaInfobox(p: SearchParams): Promise<Infobox | null> {
  const lang = baseLang(p.lang);
  // Tek istekte: arama + özet + görsel + kısa açıklama + anlam ayrımı bayrağı
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: p.q,
    gsrlimit: "1",
    prop: "extracts|pageimages|description|info|pageprops",
    exintro: "1",
    explaintext: "1",
    exsentences: "4",
    piprop: "thumbnail",
    pithumbsize: "480",
    inprop: "url",
    ppprop: "disambiguation",
    redirects: "1",
  });
  const data = await fetchJson<{ query?: { pages?: InfoboxPage[] } }>(
    `https://${lang}.wikipedia.org/w/api.php?${params}`,
    { timeoutMs: searchConfig.timeoutMs, revalidate: 3600 }, // ansiklopedik veri: 1 saat önbellek
  );
  const page = data.query?.pages?.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
  if (!page?.extract || page.pageprops?.disambiguation !== undefined) return null;
  if (!isRelevant(page.title, p.q)) return null;

  return {
    title: page.title,
    description: page.description,
    content: truncate(page.extract.replace(/\s+/g, " ").trim(), 520),
    url: page.fullurl ?? wikiArticleUrl(lang, page.title),
    image: page.thumbnail?.source,
    source: lang === "tr" ? "Vikipedi" : "Wikipedia",
  };
}

/* ============================== Web (yedek) ============================== */

interface WikiSearchHit {
  title: string;
  snippet?: string;
  timestamp?: string;
}
interface WikiSearchResponse {
  query?: { search?: WikiSearchHit[]; searchinfo?: { suggestion?: string; totalhits?: number } };
}

async function mediawikiSearch(host: string, p: SearchParams, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    list: "search",
    srsearch: p.q,
    srlimit: String(PAGE_SIZE),
    sroffset: String((p.page - 1) * PAGE_SIZE),
    srprop: "snippet|timestamp",
    srinfo: "suggestion|totalhits",
    ...extra,
  });
  return fetchJson<WikiSearchResponse>(`https://${host}/w/api.php?${params}`, {
    timeoutMs: searchConfig.timeoutMs,
  });
}

export async function searchWikipedia(p: SearchParams): Promise<ProviderOutput> {
  const lang = baseLang(p.lang);
  const data = await mediawikiSearch(`${lang}.wikipedia.org`, p);
  const hits = data.query?.search ?? [];
  const total = data.query?.searchinfo?.totalhits ?? 0;
  return {
    provider: "wikipedia",
    results: hits.map((h) => ({
      title: h.title,
      url: wikiArticleUrl(lang, h.title),
      content: truncate(stripHtml(h.snippet), 320),
      engine: "wikipedia",
    })),
    suggestions: data.query?.searchinfo?.suggestion ? [data.query.searchinfo.suggestion] : [],
    infobox: null,
    hasMore: p.page * PAGE_SIZE < total,
  };
}

/* ============================== Haberler (yedek) ============================== */

export async function searchWikinews(p: SearchParams): Promise<ProviderOutput> {
  const lang = baseLang(p.lang);
  const data = await mediawikiSearch(`${lang}.wikinews.org`, p, { srsort: "create_timestamp_desc" });
  const hits = data.query?.search ?? [];
  return {
    provider: "wikinews",
    results: hits.map((h) => ({
      title: h.title,
      url: `https://${lang}.wikinews.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`,
      content: truncate(stripHtml(h.snippet), 280),
      engine: "wikinews",
      publishedDate: h.timestamp,
    })),
    suggestions: [],
    infobox: null,
    hasMore: hits.length === PAGE_SIZE,
  };
}

/* ============================== Görseller (yedek) ============================== */

interface CommonsPage {
  title: string;
  index?: number;
  imageinfo?: { url?: string; thumburl?: string; descriptionurl?: string; mime?: string }[];
}

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/;
const IMAGE_PAGE_SIZE = 40;

export async function searchCommons(p: SearchParams): Promise<ProviderOutput> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${p.q} filetype:bitmap`,
    gsrnamespace: "6", // File: ad alanı
    gsrlimit: String(IMAGE_PAGE_SIZE),
    gsroffset: String((p.page - 1) * IMAGE_PAGE_SIZE),
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "400",
  });
  const data = await fetchJson<{ query?: { pages?: CommonsPage[] } }>(
    `https://commons.wikimedia.org/w/api.php?${params}`,
    { timeoutMs: searchConfig.timeoutMs },
  );
  const pages = (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const results: SearchResult[] = [];
  for (const pg of pages) {
    const info = pg.imageinfo?.[0];
    if (!info?.thumburl || !info.url || !IMAGE_MIME.test(info.mime ?? "")) continue;
    results.push({
      title: pg.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " "),
      url: info.descriptionurl ?? info.url,
      content: "",
      engine: "wikimedia commons",
      thumbnail: info.thumburl,
      img: info.url,
    });
  }
  return {
    provider: "commons",
    results,
    suggestions: [],
    infobox: null,
    hasMore: pages.length === IMAGE_PAGE_SIZE,
  };
}
