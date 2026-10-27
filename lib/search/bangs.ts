/**
 * !bang kısayolları — hem istemcide (SearchBar anında yönlendirme + otomatik tamamlama)
 * hem de sunucuda kullanılabilir.
 */

export interface BangDef {
  /** Kısayol kodu ("!" hariç, örn. "yt") */
  trigger: string;
  /** Alternatif tetikleyiciler */
  aliases?: string[];
  /** Kullanıcıya gösterilen isim */
  name: string;
  /** Açıklama */
  category: string;
  /** Hedef arama şablonu ({q} sorgu ile değiştirilir) */
  template: string;
}

export const BANGS: readonly BangDef[] = [
  {
    trigger: "w",
    aliases: ["viki", "wiki"],
    name: "Vikipedi",
    category: "Ansiklopedi",
    template: "https://tr.wikipedia.org/w/index.php?search={q}",
  },
  {
    trigger: "wen",
    name: "Wikipedia (EN)",
    category: "Ansiklopedi",
    template: "https://en.wikipedia.org/w/index.php?search={q}",
  },
  {
    trigger: "yt",
    aliases: ["youtube"],
    name: "YouTube",
    category: "Video",
    template: "https://www.youtube.com/results?search_query={q}",
  },
  {
    trigger: "gh",
    aliases: ["github"],
    name: "GitHub",
    category: "Geliştirici",
    template: "https://github.com/search?q={q}",
  },
  {
    trigger: "so",
    aliases: ["stackoverflow"],
    name: "Stack Overflow",
    category: "Geliştirici",
    template: "https://stackoverflow.com/search?q={q}",
  },
  {
    trigger: "npm",
    name: "npm",
    category: "Geliştirici",
    template: "https://www.npmjs.com/search?q={q}",
  },
  {
    trigger: "mdn",
    name: "MDN Web Docs",
    category: "Geliştirici",
    template: "https://developer.mozilla.org/en-US/search?q={q}",
  },
  {
    trigger: "eksi",
    aliases: ["ekşi"],
    name: "Ekşi Sözlük",
    category: "Sözlük",
    template: "https://eksisozluk.com/?q={q}",
  },
  {
    trigger: "tdk",
    name: "TDK Güncel Türkçe Sözlük",
    category: "Sözlük",
    template: "https://sozluk.gov.tr/?kelime={q}",
  },
  {
    trigger: "ceviri",
    aliases: ["tr", "translate"],
    name: "Google Çeviri",
    category: "Araç",
    template: "https://translate.google.com/?sl=auto&tl=tr&text={q}&op=translate",
  },
  {
    trigger: "harita",
    aliases: ["maps", "osm"],
    name: "OpenStreetMap",
    category: "Harita",
    template: "https://www.openstreetmap.org/search?query={q}",
  },
  {
    trigger: "g",
    aliases: ["google"],
    name: "Google",
    category: "Arama",
    template: "https://www.google.com/search?q={q}",
  },
  {
    trigger: "ddg",
    name: "DuckDuckGo",
    category: "Arama",
    template: "https://duckduckgo.com/?q={q}",
  },
  {
    trigger: "b",
    aliases: ["brave"],
    name: "Brave Search",
    category: "Arama",
    template: "https://search.brave.com/search?q={q}",
  },
  {
    trigger: "reddit",
    aliases: ["r"],
    name: "Reddit",
    category: "Topluluk",
    template: "https://www.reddit.com/search/?q={q}",
  },
  {
    trigger: "scholar",
    aliases: ["akademik"],
    name: "Google Akademik",
    category: "Akademik",
    template: "https://scholar.google.com/scholar?q={q}",
  },
  {
    trigger: "imdb",
    name: "IMDb",
    category: "Sinema",
    template: "https://www.imdb.com/find/?q={q}",
  },
] as const;

const BANG_MAP = new Map<string, BangDef>();
for (const b of BANGS) {
  BANG_MAP.set(b.trigger, b);
  for (const alias of b.aliases ?? []) BANG_MAP.set(alias, b);
}

/**
 * Sorguda "!yt nextjs" veya "nextjs !yt" varsa hedef URL'yi döner.
 * Yalnızca "!yt" yazılırsa ilgili sitenin ana sayfasına yönlendirir.
 */
export function resolveBang(rawQuery: string): { url: string; bang: BangDef; term: string } | null {
  const trimmed = rawQuery.trim();
  if (!trimmed.includes("!")) return null;

  const tokens = trimmed.split(/\s+/);
  let matchedBang: BangDef | undefined;
  let bangIndex = -1;

  // Başta veya sonda "!kod" kontrolü
  for (const idx of [0, tokens.length - 1]) {
    const tok = tokens[idx];
    if (tok && tok.startsWith("!") && tok.length > 1) {
      const key = tok.slice(1).toLocaleLowerCase("tr-TR");
      const found = BANG_MAP.get(key);
      if (found) {
        matchedBang = found;
        bangIndex = idx;
        break;
      }
    }
  }

  if (!matchedBang) return null;

  const rest = tokens.filter((_, i) => i !== bangIndex).join(" ").trim();
  if (!rest) {
    try {
      const u = new URL(matchedBang.template.replace("{q}", ""));
      return { url: u.origin, bang: matchedBang, term: "" };
    } catch {
      return null;
    }
  }

  return {
    url: matchedBang.template.replace("{q}", encodeURIComponent(rest)),
    bang: matchedBang,
    term: rest,
  };
}

/** Kullanıcı "!" ile başlayan bir metin yazarken eşleşen bang önerilerini döner. */
export function filterBangs(input: string, limit = 6): BangDef[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("!")) return [];
  const firstToken = trimmed.split(/\s+/)[0]!.slice(1).toLocaleLowerCase("tr-TR");
  if (!firstToken) return BANGS.slice(0, limit);

  return BANGS.filter(
    (b) =>
      b.trigger.startsWith(firstToken) ||
      b.aliases?.some((a) => a.startsWith(firstToken)) ||
      b.name.toLocaleLowerCase("tr-TR").includes(firstToken),
  ).slice(0, limit);
}

