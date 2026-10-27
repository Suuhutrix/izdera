/**
 * Sunucu tarafı yapılandırma — tüm değerler ortam değişkenlerinden okunur,
 * eksikse güvenli varsayılanlara düşer. Bu dosya istemci paketine girmez.
 */

const DEFAULT_SEARXNG_POOL = [
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:8080"] : []),
  "https://priv.au",
  "https://baresearch.org",
  "https://searx.be",
];

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function parsePool(raw: string | undefined): string[] {
  if (!raw?.trim()) return DEFAULT_SEARXNG_POOL;
  const list = raw
    .split(/[,\s]+/)
    .map((s) => s.trim().replace(/\/+$/, ""))
    // Hem https:// sunuculara hem de yerel/Docker http:// (localhost, 127.0.0.1, searxng) adreslerine izin ver
    .filter((s) => /^https?:\/\/[^/]+/i.test(s));
  return list.length ? Array.from(new Set(list)) : DEFAULT_SEARXNG_POOL;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdera.com").replace(/\/+$/, "");

export const searchConfig = {
  /** Sırayla/paralel denenecek SearXNG instance'ları (JSON formatı açık olmalı). */
  searxngPool: parsePool(process.env.SEARXNG_INSTANCES),
  /** Özel SearXNG sunucunuz için opsiyonel gizli erişim anahtarı. */
  searxngSecret: process.env.SEARXNG_SECRET?.trim() || "",
  /** Tek bir upstream isteği için zaman aşımı (ms). */
  timeoutMs: intFromEnv("SEARXNG_TIMEOUT_MS", 2500, 500, 8000),
  /** SearXNG fazı için toplam bütçe (ms). */
  budgetMs: intFromEnv("SEARCH_BUDGET_MS", 4500, 1000, 12000),
  /** Başarısız instance'ın soğuma süresi (ms) — sıcak lambda içinde geçerli. */
  cooldownMs: intFromEnv("SEARXNG_COOLDOWN_MS", 300_000, 0, 3_600_000),
  /** Next.js Data Cache süresi (sn). */
  revalidate: intFromEnv("SEARCH_REVALIDATE_SECONDS", 600, 0, 86_400),
  /** Marginalia API anahtarı ("public" ortak ve sık limitli; ücretsiz kişisel anahtar önerilir). */
  marginaliaKey: process.env.MARGINALIA_API_KEY?.trim() || "public",
  /** Opsiyonel Brave Search API anahtarı. */
  braveApiKey: process.env.BRAVE_API_KEY?.trim() || "",
  /** Upstream'lere kendimizi dürüstçe tanıtan User-Agent (Wikimedia politikası gereği). */
  userAgent: `Mozilla/5.0 (compatible; Izdera/1.0; +${SITE_URL})`,
  /** HTML yedek katmanı için standart tarayıcı User-Agent başlığı. */
  browserUserAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
} as const;
