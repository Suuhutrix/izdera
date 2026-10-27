"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import { useState } from "react";
import type { Infobox } from "@/lib/types";

/** Türkçe bulunma eki: ünlü uyumu + ünsüz benzeşmesi (Vikipedi'de, Wikipedia'da, Bing'de). */
function locative(word: string): string {
  const lower = word.toLocaleLowerCase("tr-TR");
  const lastVowel = lower.match(/[aeıioöuü](?=[^aeıioöuü]*$)/)?.[0] ?? "e";
  const vowel = "aıou".includes(lastVowel) ? "a" : "e";
  const consonant = /[fstkçşhp]$/.test(lower) ? "t" : "d";
  return `${word}'${consonant}${vowel}`;
}

/**
 * Bilgi Kutusu (Knowledge Panel) — Vikipedi özetini sağ panelde gösterir.
 * Vikipedi içeriği CC BY-SA 4.0 lisanslıdır; atıf zorunlu (altta).
 */
export function KnowledgePanel({ box, newTab }: { box: Infobox; newTab: boolean }) {
  const [imgOk, setImgOk] = useState(Boolean(box.image));

  return (
    <aside
      aria-label={`${box.title} hakkında bilgi`}
      className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
    >
      {imgOk && box.image && (
        <div className="relative aspect-[2/1] overflow-hidden bg-elevated sm:aspect-[16/9]">
          <img
            src={box.image}
            alt={box.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            /* Portrelerde yüz genelde üst üçte birdedir → üst odaklı kırp */
            className="size-full object-cover object-[50%_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>
      )}

      <div className="space-y-3 p-5">
        <header>
          <h2 className="font-display text-3xl leading-tight text-fg">{box.title}</h2>
          {box.description && <p className="mt-0.5 text-sm text-subtle first-letter:uppercase">{box.description}</p>}
        </header>

        <p className="text-[0.925rem] leading-relaxed text-muted">{box.content}</p>

        <a
          href={box.url}
          target={newTab ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-link"
        >
          <BookOpen className="size-4" />
          <span className="link-underline">{locative(box.source)} devamını oku</span>
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <p className="border-t border-line pt-3 text-[0.7rem] text-subtle">
          Kaynak: {box.source} ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line-strong underline-offset-2 hover:text-fg"
          >
            CC BY-SA 4.0
          </a>
        </p>
      </div>
    </aside>
  );
}
