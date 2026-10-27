/**
 * Sıfır sunucu maliyetli Anlık Yanıt (Instant Answer) motoru.
 * Hesap makinesi, yüzde/KDV hesabı, birim dönüştürücü, renk kodu (HEX/RGB/HSL),
 * tarih/saat/timestamp ve UUID üretimi işlemlerini dış API'ye gitmeden çözer.
 */
import type { InstantAnswer } from "@/lib/types";

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1e8) / 1e8;
  return rounded.toLocaleString("tr-TR", { maximumFractionDigits: 6 });
}

/* ==================== 1) Yüzde ve KDV Hesaplayıcı ==================== */
function tryPercentage(q: string): InstantAnswer | null {
  const s = q.toLocaleLowerCase("tr-TR").trim();

  // Örn: "5000 kdv %20" veya "%20 kdv 5000"
  const kdvMatch =
    s.match(/^(\d+(?:[.,]\d+)?)\s*(?:tl\s*)?kdv\s*%?\s*(\d+(?:[.,]\d+)?)$/) ??
    s.match(/^%?\s*(\d+(?:[.,]\d+)?)\s*kdv\s*(\d+(?:[.,]\d+)?)(?:\s*tl)?$/);
  if (kdvMatch) {
    const isFirstRate = s.startsWith("%") || s.indexOf("kdv") < s.lastIndexOf(kdvMatch[2]!);
    const amount = Number.parseFloat((isFirstRate ? kdvMatch[2]! : kdvMatch[1]!).replace(",", "."));
    const rate = Number.parseFloat((isFirstRate ? kdvMatch[1]! : kdvMatch[2]!).replace(",", "."));
    if (Number.isFinite(amount) && Number.isFinite(rate) && rate > 0 && rate <= 100) {
      const tax = (amount * rate) / 100;
      const total = amount + tax;
      return {
        type: "calculator",
        title: `%${fmtNum(rate)} KDV Hesaplaması`,
        value: `${fmtNum(total)} TL`,
        subtitle: `Ana tutar: ${fmtNum(amount)} TL · KDV tutarı: +${fmtNum(tax)} TL`,
        meta: {
          "KDV Hariç": `${fmtNum(amount)} TL`,
          "KDV Tutarı": `${fmtNum(tax)} TL`,
          "KDV Dahil": `${fmtNum(total)} TL`,
        },
      };
    }
  }

  // Örn: "2400'ün %15'i" veya "15% of 2400"
  const trPct = s.match(/^(\d+(?:[.,]\d+)?)(?:['’]?[uüıin]+)?\s*%\s*(\d+(?:[.,]\d+)?)(?:['’]?[iıuü])?$/);
  const enPct = s.match(/^(\d+(?:[.,]\d+)?)\s*%\s*(?:of)\s*(\d+(?:[.,]\d+)?)$/);
  if (trPct || enPct) {
    const base = Number.parseFloat((trPct ? trPct[1]! : enPct![2]!).replace(",", "."));
    const pct = Number.parseFloat((trPct ? trPct[2]! : enPct![1]!).replace(",", "."));
    if (Number.isFinite(base) && Number.isFinite(pct)) {
      const res = (base * pct) / 100;
      return {
        type: "calculator",
        title: `${fmtNum(base)} sayısının %${fmtNum(pct)} oranı`,
        value: fmtNum(res),
        subtitle: `${fmtNum(base)} × (${fmtNum(pct)} / 100)`,
      };
    }
  }

  return null;
}

/* ==================== 2) Güvenli Matematik İfade Çözücü ==================== */
/**
 * Yalnızca matematiksel token'lardan oluşan ifadeleri recursive-descent ile çözer (`eval` KULLANILMAZ).
 */
function safeMathEval(expr: string): number | null {
  const normalized = expr
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\bpi\b|π/g, String(Math.PI))
    .replace(/\bsqrt\s*\(([^()]+)\)/g, (_, inner: string) => {
      const v = safeMathEval(inner);
      return v !== null && v >= 0 ? String(Math.sqrt(v)) : "NaN";
    });

  // Yalnızca rakam, nokta, boşluk ve operatörlere izin ver
  if (!/^[0-9.+\-*/^()%e\s]+$/.test(normalized)) return null;
  // En az bir operatör içermeli (tek başına "2026" yılı hesaplama sayılmasın)
  if (!/[+\-*/^%]/.test(normalized.replace(/^[+-]/, ""))) return null;

  const tokens = normalized.match(/\d+(?:\.\d+)?(?:e[+-]?\d+)?|[+\-*/^()%]/g);
  if (!tokens || tokens.length < 3) return null;

  let pos = 0;

  function parseExpression(): number {
    let val = parseTerm();
    while (pos < tokens!.length && (tokens![pos] === "+" || tokens![pos] === "-")) {
      const op = tokens![pos++];
      const right = parseTerm();
      val = op === "+" ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (pos < tokens!.length && (tokens![pos] === "*" || tokens![pos] === "/" || tokens![pos] === "%")) {
      const op = tokens![pos++];
      const right = parsePower();
      if (op === "*") val *= right;
      else if (op === "/") val = right === 0 ? Number.NaN : val / right;
      else val = right === 0 ? Number.NaN : val % right;
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (pos < tokens!.length && tokens![pos] === "^") {
      pos++;
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (tokens![pos] === "+") {
      pos++;
      return parseUnary();
    }
    if (tokens![pos] === "-") {
      pos++;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = tokens![pos++];
    if (tok === "(") {
      const val = parseExpression();
      if (tokens![pos] !== ")") return Number.NaN;
      pos++;
      return val;
    }
    const num = Number(tok);
    return Number.isFinite(num) ? num : Number.NaN;
  }

  const result = parseExpression();
  if (pos !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}

function tryCalculator(q: string): InstantAnswer | null {
  const cleaned = q.replace(/\s*=\s*\??$/, "").trim();
  // Telefon numarası veya tarih formatlarını ("2026-10-27") ele
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned) || /^0?\d{3}[\s-]\d{3}/.test(cleaned)) return null;

  const val = safeMathEval(cleaned);
  if (val === null) return null;
  return {
    type: "calculator",
    title: `${cleaned} =`,
    value: fmtNum(val),
    subtitle: "Anlık hesap makinesi",
  };
}

/* ==================== 3) Birim Dönüştürücü ==================== */
interface UnitRule {
  from: string[];
  to: string[];
  labelFrom: string;
  labelTo: string;
  convert: (v: number) => number;
}

const UNIT_RULES: UnitRule[] = [
  { from: ["km", "kilometre"], to: ["mil", "mile", "miles", "mi"], labelFrom: "km", labelTo: "mil", convert: (v) => v * 0.621371 },
  { from: ["mil", "mile", "miles", "mi"], to: ["km", "kilometre"], labelFrom: "mil", labelTo: "km", convert: (v) => v * 1.609344 },
  { from: ["kg", "kilo", "kilogram"], to: ["lb", "lbs", "pound", "libre"], labelFrom: "kg", labelTo: "lb", convert: (v) => v * 2.20462262 },
  { from: ["lb", "lbs", "pound", "libre"], to: ["kg", "kilo", "kilogram"], labelFrom: "lb", labelTo: "kg", convert: (v) => v / 2.20462262 },
  { from: ["cm", "santim", "santimetre"], to: ["in", "inch", "inç", "inc"], labelFrom: "cm", labelTo: "inç", convert: (v) => v / 2.54 },
  { from: ["in", "inch", "inç", "inc"], to: ["cm", "santim", "santimetre"], labelFrom: "inç", labelTo: "cm", convert: (v) => v * 2.54 },
  { from: ["m", "metre"], to: ["ft", "feet", "foot", "fit"], labelFrom: "m", labelTo: "ft", convert: (v) => v * 3.28084 },
  { from: ["ft", "feet", "foot", "fit"], to: ["m", "metre"], labelFrom: "ft", labelTo: "m", convert: (v) => v / 3.28084 },
  { from: ["c", "celsius", "santigrat", "derece"], to: ["f", "fahrenheit", "fahrenhayt"], labelFrom: "°C", labelTo: "°F", convert: (v) => (v * 9) / 5 + 32 },
  { from: ["f", "fahrenheit", "fahrenhayt"], to: ["c", "celsius", "santigrat", "derece"], labelFrom: "°F", labelTo: "°C", convert: (v) => ((v - 32) * 5) / 9 },
  { from: ["gb", "gigabayt"], to: ["mb", "megabayt"], labelFrom: "GB", labelTo: "MB", convert: (v) => v * 1024 },
  { from: ["mb", "megabayt"], to: ["gb", "gigabayt"], labelFrom: "MB", labelTo: "GB", convert: (v) => v / 1024 },
  { from: ["tb", "terabayt"], to: ["gb", "gigabayt"], labelFrom: "TB", labelTo: "GB", convert: (v) => v * 1024 },
];

function tryUnitConversion(q: string): InstantAnswer | null {
  const s = q.toLocaleLowerCase("tr-TR").trim().replace(/\?+$/, "");
  // Örn: "100 km kaç mil", "50 kg to lb", "30 c in f"
  const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*°?\s*([a-zçğıöşü]+)\s+(?:kaç|kac|to|in|=)\s+°?\s*([a-zçğıöşü]+)$/);
  if (!m) return null;

  const val = Number.parseFloat(m[1]!.replace(",", "."));
  const fromUnit = m[2]!;
  const toUnit = m[3]!;
  if (!Number.isFinite(val)) return null;

  const rule = UNIT_RULES.find((r) => r.from.includes(fromUnit) && r.to.includes(toUnit));
  if (!rule) return null;

  const out = rule.convert(val);
  return {
    type: "unit",
    title: `${fmtNum(val)} ${rule.labelFrom} =`,
    value: `${fmtNum(out)} ${rule.labelTo}`,
    subtitle: "Birim dönüştürücü",
  };
}

/* ==================== 4) Renk Kodu (HEX / RGB -> HSL) ==================== */
function rgbToHsl(r: number, g: number, b: number): string {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function tryColor(q: string): InstantAnswer | null {
  const s = q.trim();
  const hexMatch = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const raw = hexMatch[1]!;
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    const hex = `#${full.toUpperCase()}`;
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const hsl = rgbToHsl(r, g, b);
    return {
      type: "color",
      title: "Renk Kodu",
      value: hex,
      subtitle: `${rgb} · ${hsl}`,
      meta: { HEX: hex, RGB: rgb, HSL: hsl },
    };
  }

  const rgbMatch = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
      const rgb = `rgb(${r}, ${g}, ${b})`;
      const hsl = rgbToHsl(r, g, b);
      return {
        type: "color",
        title: "Renk Kodu",
        value: hex,
        subtitle: `${rgb} · ${hsl}`,
        meta: { HEX: hex, RGB: rgb, HSL: hsl },
      };
    }
  }
  return null;
}

/* ==================== 5) Tarih / Saat / UUID / Timestamp ==================== */
function tryUtility(q: string): InstantAnswer | null {
  const s = q.toLocaleLowerCase("tr-TR").trim().replace(/\?+$/, "");

  if (s === "uuid" || s === "uuid v4" || s === "guid") {
    return {
      type: "uuid",
      title: "Rastgele UUID v4",
      value: crypto.randomUUID(),
      subtitle: "Kopyalamak için sağdaki düğmeyi kullanın",
    };
  }

  if (s === "timestamp" || s === "unix timestamp" || s === "epoch") {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      type: "datetime",
      title: "Unix Zaman Damgası (Epoch)",
      value: String(nowSec),
      subtitle: new Date(nowSec * 1000).toISOString(),
    };
  }

  if (
    s === "saat kaç" ||
    s === "saat kac" ||
    s === "bugün günlerden ne" ||
    s === "bugünün tarihi" ||
    s === "tarih"
  ) {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
    const dateStr = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    return {
      type: "datetime",
      title: "Türkiye Saati (TRT · UTC+3)",
      value: `${timeStr} — ${dateStr}`,
      subtitle: `ISO: ${now.toISOString().slice(0, 10)}`,
    };
  }

  return null;
}

export function evaluateInstantAnswer(query: string): InstantAnswer | null {
  return (
    tryUtility(query) ??
    tryColor(query) ??
    tryPercentage(query) ??
    tryUnitConversion(query) ??
    tryCalculator(query)
  );
}

