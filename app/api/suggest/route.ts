/**
 * GET /api/suggest?q=&lang=
 * OpenSearch Suggestions formatı: ["sorgu", ["öneri1", "öneri2", ...]]
 * Tarayıcı adres çubuğu (opensearch.xml) ve eklenti `suggest_url` tarafından kullanılır.
 * Kaynak: Wikipedia OpenSearch (anahtarsız). 1 gün CDN önbelleği.
 */
import { type NextRequest, NextResponse } from "next/server";
import { searchConfig } from "@/lib/search/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const lang = req.nextUrl.searchParams.get("lang") === "en-US" ? "en" : "tr";
  const headers = { "Content-Type": "application/x-suggestions+json; charset=utf-8" };

  if (q.length < 2) {
    return new NextResponse(JSON.stringify([q, []]), { headers: { ...headers, "Cache-Control": "public, s-maxage=86400" } });
  }

  try {
    const params = new URLSearchParams({ action: "opensearch", format: "json", limit: "8", namespace: "0", search: q });
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": searchConfig.userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 86_400 },
    });
    const data = (await res.json()) as [string, string[]];
    const suggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [];
    return new NextResponse(JSON.stringify([q, suggestions]), {
      headers: { ...headers, "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    // Öneri kritik değil: sessizce boş dön, kısa süre önbellekle.
    return new NextResponse(JSON.stringify([q, []]), { headers: { ...headers, "Cache-Control": "public, s-maxage=60" } });
  }
}
