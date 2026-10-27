import type { Category, Infobox, Lang, SearchResult, TimeRange } from "@/lib/types";

/** Doğrulanmış arama parametreleri (route.ts'de parse edilir). */
export interface SearchParams {
  q: string;
  page: number;
  category: Category;
  lang: Lang;
  /** 0 = kapalı, 1 = orta, 2 = sıkı */
  safe: 0 | 1 | 2;
  /** Zaman aralığı filtresi */
  timeRange: TimeRange;
}

/** Her sağlayıcının döndürdüğü ortak çıktı. */
export interface ProviderOutput {
  provider: string;
  results: SearchResult[];
  suggestions: string[];
  infobox: Infobox | null;
  hasMore: boolean;
}

/** Çekirdek dil kodu: "tr-TR" → "tr", "all" → "en" (en geniş Vikipedi kapsamı). */
export function baseLang(lang: Lang): "tr" | "en" {
  return lang === "tr-TR" ? "tr" : "en";
}

export function acceptLanguageFor(lang: Lang): string {
  if (lang === "tr-TR") return "tr-TR,tr;q=0.9,en;q=0.6";
  if (lang === "en-US") return "en-US,en;q=0.9";
  return "*";
}

/** URL'yi tekilleştirme anahtarına çevirir (protokol, www, son eğik çizgi, #hash yok sayılır). */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url;
  }
}

export function isHttpUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

/** Sonuç listesini URL'ye göre tekilleştirir, sırayı korur. */
export function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = urlKey(r.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
