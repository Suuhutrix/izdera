import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shadcn/UI deseni: koşullu sınıfları birleştir, Tailwind çakışmalarını çöz. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL'den güvenli şekilde hostname çıkarır ("www." önekini atar). */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Okunabilir breadcrumb: "tr.wikipedia.org › wiki › İstanbul"
 * Yüzde-kodlu parçaları çözer, çok uzun yolları kısaltır.
 */
export function breadcrumbOf(url: string): { host: string; path: string[] } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 3)
      .map((seg) => {
        let s = seg;
        try {
          s = decodeURIComponent(seg);
        } catch {
          /* bozuk kodlama: ham bırak */
        }
        s = s.replace(/[_-]+/g, " ").replace(/\.(html?|php|aspx?)$/i, "");
        return s.length > 32 ? `${s.slice(0, 30)}…` : s;
      });
    return { host, path };
  } catch {
    return { host: url, path: [] };
  }
}

/** Basit HTML etiketlerini ve varlıklarını düz metne çevirir (sunucu tarafı). */
export function stripHtml(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Metni kelime sınırında kısaltır. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/** Türkçe duyarlı küçük harf (İ→i, I→ı). Uzunluk korunur. */
export const trLower = (s: string) => s.toLocaleLowerCase("tr-TR");

/**
 * Karşılaştırma için katlama: küçük harf + ı→i + aksan temizleme.
 * "Istanbul", "istanbul", "İSTANBUL" ve "Ístanbul" aynı anahtara iner.
 */
export const foldText = (s: string) =>
  trLower(s)
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

/** Göreli tarih: "3 saat önce", "2 gün önce". */
export function timeAgo(iso: string | undefined, locale = "tr-TR"): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = date.getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "minute");
}
