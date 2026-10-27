"use client";

import { Calculator, CalendarClock, Check, Copy, Fingerprint, Palette, Ruler } from "lucide-react";
import { useState } from "react";
import type { InstantAnswer } from "@/lib/types";

const ICONS: Record<InstantAnswer["type"], typeof Calculator> = {
  calculator: Calculator,
  unit: Ruler,
  color: Palette,
  datetime: CalendarClock,
  uuid: Fingerprint,
};

/**
 * Sıfır maliyetli Anlık Yanıt Kartı (Hesap makinesi, KDV, birim çevirici, renk kodu, saat/UUID).
 */
export function InstantAnswerCard({ answer }: { answer: InstantAnswer }) {
  const [copied, setCopied] = useState(false);
  const Icon = ICONS[answer.type] ?? Calculator;

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(answer.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yoksa yoksay */
    }
  };

  return (
    <aside
      aria-label="Anlık yanıt"
      className="animate-fade-up mb-4 overflow-hidden rounded-2xl border border-accent/35 bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          {answer.type === "color" ? (
            <span
              aria-hidden="true"
              className="mt-0.5 size-11 shrink-0 rounded-xl border border-line-strong shadow-inner"
              style={{ backgroundColor: answer.value }}
            />
          ) : (
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon className="size-5" />
            </span>
          )}

          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-subtle uppercase">{answer.title}</p>
            <p className="mt-0.5 break-all font-display text-3xl leading-tight text-fg sm:text-4xl">{answer.value}</p>
            {answer.subtitle && <p className="mt-1 text-xs text-muted">{answer.subtitle}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={copyValue}
          aria-label="Sonucu kopyala"
          title="Sonucu kopyala"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg active:scale-95"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-accent" />
              <span>Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>

      {answer.meta && Object.keys(answer.meta).length > 0 && (
        <dl className="mt-3.5 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-3">
          {Object.entries(answer.meta).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-elevated px-3 py-2">
              <dt className="text-[0.7rem] text-subtle uppercase">{k}</dt>
              <dd className="mt-0.5 truncate font-mono text-xs font-medium text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}

