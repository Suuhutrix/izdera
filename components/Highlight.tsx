import { Fragment, type ReactNode } from "react";
import { foldText } from "@/lib/utils";

/**
 * Snippet içinde aranan kelimeleri <mark> ile vurgular.
 * Türkçe duyarlı ve aksan-toleranslı: "istanbul" araması "İstanbul"u da yakalar.
 * Eşleşme katlanmış (folded) metinde yapılır, vurgu ORİJİNAL metne uygulanır.
 */
export function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  if (!text) return null;

  const terms = Array.from(new Set(foldText(query).split(/\s+/).filter((t) => t.length >= 2)))
    .sort((a, b) => b.length - a.length) // uzun terim önce → "istanbul" "is"ten önce eşleşsin
    .slice(0, 8);
  if (!terms.length) return text;

  // Karakter karakter katla ki indeksler orijinal metinle hizalı kalsın.
  const chars = Array.from(text);
  const folded = chars.map((c) => foldText(c).charAt(0) || c).join("");
  if (folded.length !== chars.length) return text; // emniyet: hizalama bozulursa vurgulama yapma

  const marks = new Array<boolean>(chars.length).fill(false);
  for (const term of terms) {
    let from = 0;
    while ((from = folded.indexOf(term, from)) !== -1) {
      for (let i = from; i < from + term.length; i++) marks[i] = true;
      from += term.length;
    }
  }

  // Ardışık işaretli/işaretsiz karakterleri parçalara birleştir.
  const parts: ReactNode[] = [];
  let buf = "";
  let state = marks[0] ?? false;
  chars.forEach((c, i) => {
    if (marks[i] !== state) {
      parts.push(state ? <mark key={i} className="hl">{buf}</mark> : <Fragment key={i}>{buf}</Fragment>);
      buf = "";
      state = marks[i]!;
    }
    buf += c;
  });
  parts.push(state ? <mark key="end" className="hl">{buf}</mark> : <Fragment key="end">{buf}</Fragment>);
  return parts;
}
