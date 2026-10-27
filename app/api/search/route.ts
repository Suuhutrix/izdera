/**
 * GET /api/search?q=&p=&category=&lang=&safe=&time=
 *
 * Vercel Hobby (0 TL) koruması — iki katmanlı önbellek + hafif hız sınırı:
 *  1) CDN: `Cache-Control: s-maxage=600` → aynı URL 10 dk boyunca fonksiyon
 *     ÇALIŞTIRILMADAN Vercel Edge'den döner (CPU = 0).
 *  2) Data Cache: upstream fetch'ler `next.revalidate = 600` ile saklanır
 *     (CDN'i ıskalayan bölgesel isteklerde bile upstream'e gidilmez).
 *  3) Hız sınırı (Rate Limit): Ham IP saklamadan (FNV-1a hash ile) dakikada
 *     60 isteği aşan botları 429 ile durdurur.
 *
 * Gizlilik: istemcinin IP/çerez/User-Agent bilgisi upstream'e İLETİLMEZ;
 * tüm istekler sunucudan, İzdera kimliğiyle yapılır.
 */
import { type NextRequest, NextResponse } from "next/server";
import { type SearchParams, runSearch } from "@/lib/search";
import { fnv1a } from "@/lib/search/http";
import {
  CATEGORIES,
  LANGUAGES,
  TIME_RANGES,
  type Category,
  type Lang,
  type SearchErrorBody,
  type TimeRange,
} from "@/lib/types";

export const runtime = "nodejs";
// SearXNG bütçesi + yedek + pay. Hobby planında izin verilen aralıkta.
export const maxDuration = 15;

const MAX_QUERY_LENGTH = 256;
const MAX_PAGE = 20;

/* ---------- Gizlilik koruyucu bellek-içi hız sınırlayıcı (Rate Limiter) ---------- */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const rateBuckets = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const daySalt = Math.floor(Date.now() / 86_400_000);
  // Ham IP adresi bellekte bile tutulmaz; yalnızca tek yönlü hash anahtarı
  const key = fnv1a(`${daySalt}:${forwarded}`);
  const now = Date.now();

  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  entry.count += 1;
  return entry.count <= RATE_MAX_REQUESTS;
}

function parseParams(sp: URLSearchParams): SearchParams | null {
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return null;

  const pageRaw = Number.parseInt(sp.get("p") ?? "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.min(MAX_PAGE, Math.max(1, pageRaw)) : 1;

  const catRaw = sp.get("category") ?? "general";
  const category: Category = (CATEGORIES as readonly string[]).includes(catRaw) ? (catRaw as Category) : "general";

  const langRaw = sp.get("lang") ?? "tr-TR";
  const lang: Lang = (LANGUAGES as readonly string[]).includes(langRaw) ? (langRaw as Lang) : "tr-TR";

  const safeRaw = Number.parseInt(sp.get("safe") ?? "1", 10);
  const safe = (safeRaw === 0 || safeRaw === 2 ? safeRaw : 1) as 0 | 1 | 2;

  const timeRaw = sp.get("time") ?? "all";
  const timeRange: TimeRange = (TIME_RANGES as readonly string[]).includes(timeRaw)
    ? (timeRaw as TimeRange)
    : "all";

  return { q, page, category, lang, safe, timeRange };
}

function errorResponse(status: number, body: SearchErrorBody, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function GET(req: NextRequest) {
  if (!checkRateLimit(req)) {
    return errorResponse(
      429,
      {
        error: "Çok fazla arama isteği gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.",
        code: "RATE_LIMITED",
      },
      { "Retry-After": "15" },
    );
  }

  const params = parseParams(req.nextUrl.searchParams);
  if (!params) {
    return errorResponse(400, { error: "Arama sorgusu (q) gerekli.", code: "BAD_REQUEST" });
  }

  try {
    const { degraded, ...data } = await runSearch(params);

    // Yedek kaynaktan gelen yanıt daha kısa önbelleklenir → SearXNG düzelince hızla geri dönülür.
    const cdnTtl = degraded ? 180 : 600;
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, max-age=60, s-maxage=${cdnTtl}, stale-while-revalidate=${cdnTtl * 6}`,
        "X-Izdera-Provider": data.provider,
      },
    });
  } catch (err) {
    console.error("[izdera] search failed:", (err as Error).message);
    return errorResponse(503, {
      error: "Arama kaynaklarına şu an ulaşılamıyor. Lütfen birazdan tekrar deneyin.",
      code: "UPSTREAM_UNAVAILABLE",
    });
  }
}
