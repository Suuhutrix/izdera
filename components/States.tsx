"use client";

import { RotateCw, WifiOff } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { LogoMark } from "./Logo";
import { buildSearchHref } from "./SearchBar";

export function EmptyState({ query, category }: { query: string; category: Category }) {
  if (!query) {
    return (
      <div className="animate-fade-up flex flex-col items-center py-16 text-center">
        <LogoMark animated className="mb-5 size-14" />
        <h2 className="font-display text-3xl text-fg">Bir iz bırakın</h2>
        <p className="mt-2 text-sm text-muted">Aramak istediğiniz kelimeyi yukarıya yazın.</p>
      </div>
    );
  }
  return (
    <div className="animate-fade-up flex flex-col items-center py-16 text-center">
      <LogoMark className="mb-5 size-14 opacity-40" />
      <h2 className="font-display text-3xl text-fg">İz bulunamadı</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        <span className="font-medium text-fg">“{query}”</span> için sonuç yok. Daha genel kelimeler deneyin
        ya da yazımı kontrol edin.
      </p>
      {category !== "general" && (
        <Link
          href={buildSearchHref(query, "general")}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          “Tümü” sekmesinde ara
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="animate-fade-up flex flex-col items-center py-16 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-full bg-elevated text-subtle">
        <WifiOff className="size-6" />
      </div>
      <h2 className="font-display text-3xl text-fg">İz bir an kayboldu</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      <button
        type="button"
        id="search-retry"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-all hover:brightness-110 active:scale-95"
      >
        <RotateCw className="size-4" />
        Tekrar dene
      </button>
    </div>
  );
}
