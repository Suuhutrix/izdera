import type { Infobox, SearchResult } from "@/lib/types";
import { hostnameOf, stripHtml, truncate } from "@/lib/utils";
import { searchConfig } from "./config";
import { UpstreamError, fetchJson, fnv1a } from "./http";
import { type ProviderOutput, type SearchParams, acceptLanguageFor, dedupe, isHttpUrl } from "./shared";

/* ---------- Ham SearXNG JSON şeması (yalnızca kullandığımız alanlar) ---------- */
interface RawResult {
  url?: string;
  title?: string;
  content?: string;
  engine?: string;
  engines?: string[];
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  publishedDate?: string | null;
}
interface RawInfobox {
  infobox?: string;
  content?: string;
  img_src?: string;
  id?: string;
  urls?: { title?: string; url?: string }[];
  engine?: string;
}
interface RawResponse {
  results?: RawResult[];
  infoboxes?: RawInfobox[];
  suggestions?: string[];
  corrections?: string[];
}

/* ---------- Devre kesici (circuit breaker) ----------
 * Modül düzeyindeki Map, sıcak (warm) lambda örneği yaşadıkça korunur.
 * Düşen instance bir süre sıranın sonuna itilir → boşa harcanan süre azalır. */
const cooldownUntil = new Map<string, number>();

function isLocalInstance(base: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|searxng)(:\d+)?$/i.test(base);
}

function markFailed(base: string, err: UpstreamError) {
  // Localhost kapalıysa 60 sn beklet; 429/403 veya JSON kapalıysa 3 kat soğuma uygula
  if (isLocalInstance(base)) {
    cooldownUntil.set(base, Date.now() + 60_000);
    return;
  }
  const isBlocked = err.status === 429 || err.status === 403 || err.message.startsWith("non-json");
  const factor = isBlocked ? 3 : 1;
  cooldownUntil.set(base, Date.now() + searchConfig.cooldownMs * factor);
}

/**
 * Deneme sırası:
 * - İlk sıradaki özel instance (örn. kullanıcının kendi SearXNG sunucusu) her zaman en önde tutulur.
 * - Diğer havuz üyeleri sorgu hash'ine göre döndürülür.
 * - Soğumadaki instance'lar yalnızca sağlıklı hiç instance kalmadıysa denenir.
 */
function orderedPool(q: string): string[] {
  const pool = searchConfig.searxngPool;
  if (pool.length <= 1) return pool;

  const [primary, ...rest] = pool;
  const offset = rest.length ? fnv1a(q.toLowerCase()) % rest.length : 0;
  const rotatedRest = [...rest.slice(offset), ...rest.slice(0, offset)];
  const all = [primary!, ...rotatedRest];

  const now = Date.now();
  const healthy = all.filter((b) => (cooldownUntil.get(b) ?? 0) <= now);
  return healthy.length > 0 ? healthy : all.slice(0, 1);
}

function buildUrl(base: string, p: SearchParams): string {
  const params = new URLSearchParams({
    q: p.q,
    format: "json",
    pageno: String(p.page),
    categories: p.category,
    language: p.lang,
    safesearch: String(p.safe),
  });
  if (p.timeRange !== "all") {
    params.set("time_range", p.timeRange);
  }
  return `${base}/search?${params}`;
}

/* ---------- Veri sadeleştirme: ham JSON → minimal SearchResult ---------- */
function normalizeResults(raw: RawResult[] | undefined, p: SearchParams): SearchResult[] {
  if (!Array.isArray(raw)) return [];
  const out: SearchResult[] = [];
  for (const r of raw) {
    if (!isHttpUrl(r.url)) continue;
    const base: SearchResult = {
      title: truncate(stripHtml(r.title) || hostnameOf(r.url), 140),
      url: r.url,
      content: truncate(stripHtml(r.content), 320),
      engine: (r.engine ?? r.engines?.[0] ?? "searxng").toLowerCase(),
    };
    if (p.category === "images") {
      const img = isHttpUrl(r.img_src) ? r.img_src : undefined;
      const thumb = [r.thumbnail_src, r.thumbnail, r.img_src].find(isHttpUrl);
      if (!thumb) continue; // görselsiz görsel sonucu işe yaramaz
      base.thumbnail = thumb;
      base.img = img ?? thumb;
    }
    if (p.category === "news" && r.publishedDate) {
      const d = new Date(r.publishedDate);
      if (!Number.isNaN(d.getTime())) base.publishedDate = d.toISOString();
    }
    out.push(base);
  }
  return dedupe(out).slice(0, p.category === "images" ? 60 : 30);
}

function normalizeInfobox(raw: RawInfobox[] | undefined): Infobox | null {
  const box = raw?.find((b) => b.infobox && b.content);
  if (!box?.infobox) return null;
  const url = box.urls?.find((u) => isHttpUrl(u.url))?.url ?? (isHttpUrl(box.id) ? box.id : "");
  if (!url) return null;
  return {
    title: stripHtml(box.infobox),
    content: truncate(stripHtml(box.content), 600),
    url,
    image: isHttpUrl(box.img_src) ? box.img_src : undefined,
    source: box.engine ?? hostnameOf(url),
  };
}

async function queryInstance(base: string, p: SearchParams, timeoutMs: number): Promise<ProviderOutput> {
  const headers: Record<string, string> = {};
  if (searchConfig.searxngSecret) {
    headers["X-SearXNG-Secret"] = searchConfig.searxngSecret;
    headers.Authorization = `Bearer ${searchConfig.searxngSecret}`;
  }

  const raw = await fetchJson<RawResponse>(buildUrl(base, p), {
    timeoutMs: isLocalInstance(base) ? Math.min(timeoutMs, 1500) : timeoutMs,
    acceptLanguage: acceptLanguageFor(p.lang),
    headers,
  });

  const results = normalizeResults(raw.results, p);
  if (results.length === 0) throw new UpstreamError("empty result set");

  cooldownUntil.delete(base);
  return {
    provider: `searxng:${hostnameOf(base)}`,
    results,
    suggestions: [...(raw.corrections ?? []), ...(raw.suggestions ?? [])]
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 6),
    infobox: normalizeInfobox(raw.infoboxes),
    hasMore: results.length >= 8,
  };
}

/**
 * Akıllı SearXNG sorgulama:
 * 1) Önce birincil (özel/yerel) instance denenir.
 * 2) Başarısız olursa kalan sağlıklı adaylardan en fazla 2 tanesi paralel yarıştırılır
 *    (böylece ölü açık sunucular yüzünden 4 × 2.5 sn = 10 sn beklenmez).
 */
export async function searchSearxng(p: SearchParams, deadline: number): Promise<ProviderOutput> {
  const errors: string[] = [];
  const candidates = orderedPool(p.q);
  if (candidates.length === 0) {
    throw new UpstreamError("no searxng instances configured");
  }

  const [first, ...rest] = candidates;
  const remainingFirst = deadline - Date.now();
  if (first && remainingFirst >= 400) {
    try {
      return await queryInstance(first, p, Math.min(searchConfig.timeoutMs, remainingFirst));
    } catch (err) {
      const e = err as UpstreamError;
      markFailed(first, e);
      errors.push(`${hostnameOf(first)}: ${e.message}`);
    }
  }

  // Kalan sağlıklı adaylardan en fazla 2 tanesini paralel yarıştır (hızlı failover)
  const batch = rest.slice(0, 2);
  const remainingBatch = deadline - Date.now();
  if (batch.length > 0 && remainingBatch >= 500) {
    const perTimeout = Math.min(searchConfig.timeoutMs, 1800, remainingBatch);
    try {
      return await Promise.any(
        batch.map(async (base) => {
          try {
            return await queryInstance(base, p, perTimeout);
          } catch (err) {
            const e = err as UpstreamError;
            markFailed(base, e);
            errors.push(`${hostnameOf(base)}: ${e.message}`);
            throw e;
          }
        }),
      );
    } catch {
      /* tüm paralel adaylar başarısız oldu */
    }
  }

  throw new UpstreamError(`all searxng instances failed → ${errors.join(" | ") || "budget exhausted"}`);
}
