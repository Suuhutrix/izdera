import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * İzdera logo işareti: küçükten büyüğe üç "iz" noktası ve
 * bulunan hedefi simgeleyen bir halka → "izin ardına düşmek".
 * Geometri scripts/generate-icons.mjs ile birebir aynıdır.
 */
export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  const dot = animated ? "animate-trail" : undefined;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("text-accent", className)} fill="currentColor">
      <circle cx="12" cy="52" r="2.4" opacity="0.4" className={dot} style={animated ? { animationDelay: "0s" } : undefined} />
      <circle cx="19" cy="46" r="2.9" opacity="0.65" className={dot} style={animated ? { animationDelay: "0.3s" } : undefined} />
      <circle cx="26.5" cy="40.5" r="3.4" opacity="0.9" className={dot} style={animated ? { animationDelay: "0.6s" } : undefined} />
      <circle cx="40" cy="27" r="10.5" fill="none" stroke="currentColor" strokeWidth="4.6" />
    </svg>
  );
}

/**
 * Kelime logosu: "izdera" — i harfinin noktası yerine amber bir "iz" noktası.
 * Noktasız ı + konumlandırılmış nokta, her font boyutunda em tabanlı ölçeklenir.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display tracking-tight text-fg select-none", className)}>
      <span className="relative inline-block">
        ı
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[0.2em] size-[max(0.17em,5px)] -translate-x-1/2 rounded-full bg-accent"
        />
      </span>
      zdera
    </span>
  );
}

/** Başlık ve ana sayfada kullanılan birleşik logo (ana sayfaya bağlantı). */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="İzdera ana sayfa"
      className={cn("group inline-flex items-center gap-2 rounded-lg outline-offset-4", className)}
    >
      <LogoMark className={cn("transition-transform duration-300 group-hover:-rotate-6", compact ? "size-7" : "size-10")} />
      <Wordmark className={compact ? "text-[1.7rem] leading-none" : "text-4xl leading-none"} />
    </Link>
  );
}
