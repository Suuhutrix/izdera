/**
 * İzdera — paylaşılan tip tanımları.
 * API (route.ts) ile istemci bileşenleri aynı sözleşmeyi kullanır.
 */

export const CATEGORIES = ["general", "images", "news"] as const;
export type Category = (typeof CATEGORIES)[number];

export const LANGUAGES = ["tr-TR", "en-US", "all"] as const;
export type Lang = (typeof LANGUAGES)[number];

export const TIME_RANGES = ["all", "day", "week", "month", "year"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

/** Frontend'e dönen sadeleştirilmiş tek sonuç. */
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  /** Sonucu üreten motor/kaynak etiketi (örn. "wikipedia", "duckduckgo", "bing"). */
  engine: string;
  /** Yalnızca görsel sonuçlarında: küçük önizleme. */
  thumbnail?: string;
  /** Yalnızca görsel sonuçlarında: tam boy görsel. */
  img?: string;
  /** Yalnızca haber sonuçlarında: ISO tarih. */
  publishedDate?: string;
}

/** Sağ paneldeki bilgi kutusu (Knowledge Panel). */
export interface Infobox {
  title: string;
  content: string;
  url: string;
  image?: string;
  /** Kaynak etiketi (örn. "Vikipedi"). */
  source: string;
  /** Kısa açıklama (örn. "Türkiye'nin en kalabalık şehri"). */
  description?: string;
}

/** Sıfır maliyetli anlık yanıt kartı (hesaplama, birim, renk, zaman/UUID). */
export interface InstantAnswer {
  type: "calculator" | "unit" | "color" | "datetime" | "uuid";
  title: string;
  value: string;
  subtitle?: string;
  /** Ek bilgiler (örn. renk için HEX/RGB/HSL karşılıkları). */
  meta?: Record<string, string>;
}

export interface SearchResponse {
  query: string;
  page: number;
  category: Category;
  lang: Lang;
  timeRange?: TimeRange;
  results: SearchResult[];
  infobox: Infobox | null;
  instantAnswer?: InstantAnswer | null;
  suggestions: string[];
  /** Yanıtı veren sağlayıcı zinciri (hata ayıklama + şeffaflık). */
  provider: string;
  hasMore: boolean;
  tookMs: number;
}

export interface SearchErrorBody {
  error: string;
  code: "BAD_REQUEST" | "UPSTREAM_UNAVAILABLE" | "RATE_LIMITED";
}
