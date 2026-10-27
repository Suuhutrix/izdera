import { searchConfig } from "./config";

/** Upstream hatası: hangi sağlayıcının neden düştüğünü taşır. */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export interface FetchOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
  /** Next.js Data Cache süresi (sn). Varsayılan: searchConfig.revalidate */
  revalidate?: number;
  acceptLanguage?: string;
}

/**
 * Zaman aşımı korumalı + Next.js Data Cache'li JSON fetch.
 * - AbortSignal.timeout: yavaş upstream lambda süresini yemesin.
 * - next.revalidate: aynı URL 10 dk boyunca yeniden çekilmez (CPU/ağ tasarrufu).
 * - Content-Type kontrolü: JSON'u kapatıp HTML/captcha dönen instance'ları ayıklar.
 */
export async function fetchJson<T>(url: string, opts: FetchOptions): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": searchConfig.userAgent,
        Accept: "application/json",
        "Accept-Language": opts.acceptLanguage ?? "tr-TR,tr;q=0.9,en;q=0.7",
        ...opts.headers,
      },
      signal: AbortSignal.timeout(opts.timeoutMs),
      next: { revalidate: opts.revalidate ?? searchConfig.revalidate },
    });
  } catch (err) {
    const name = (err as Error)?.name;
    throw new UpstreamError(name === "TimeoutError" ? "timeout" : `network: ${(err as Error)?.message ?? err}`);
  }

  if (!res.ok) throw new UpstreamError(`HTTP ${res.status}`, res.status);

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) {
    throw new UpstreamError(`non-json response (${type.split(";")[0] || "unknown"})`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new UpstreamError("invalid json", res.status);
  }
}

/**
 * Zaman aşımı korumalı + Next.js Data Cache'li HTML/Text fetch (DuckDuckGo HTML yedek sağlayıcısı için).
 */
export async function fetchText(url: string, opts: FetchOptions): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": searchConfig.browserUserAgent,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": opts.acceptLanguage ?? "tr-TR,tr;q=0.9,en;q=0.7",
        ...opts.headers,
      },
      signal: AbortSignal.timeout(opts.timeoutMs),
      next: { revalidate: opts.revalidate ?? searchConfig.revalidate },
    });
  } catch (err) {
    const name = (err as Error)?.name;
    throw new UpstreamError(name === "TimeoutError" ? "timeout" : `network: ${(err as Error)?.message ?? err}`);
  }

  if (!res.ok) throw new UpstreamError(`HTTP ${res.status}`, res.status);
  return res.text();
}

/** Ardışık denemelerde deterministik sıra için hızlı FNV-1a hash. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
