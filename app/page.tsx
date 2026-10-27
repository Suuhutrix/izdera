import { Puzzle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/icons";
import { LogoMark, Wordmark } from "@/components/Logo";
import { RecentSearches } from "@/components/RecentSearches";
import { SearchBar } from "@/components/SearchBar";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Ana sayfa — tamamen statik (build'de üretilir, CDN'den sunulur, fonksiyon maliyeti 0).
 * Etkileşimli parçalar (arama kutusu, son aramalar, tema) küçük istemci adacıklarıdır.
 */
export default function HomePage() {
  return (
    <div className="trail-backdrop flex min-h-dvh flex-col">
      {/* Üst bar: yalnızca tema + ayarlar */}
      <header className="flex justify-end gap-1 p-4 sm:p-5">
        <ThemeToggle />
        <SettingsMenu />
      </header>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 pb-24">
        <div className="flex w-full max-w-[640px] flex-col items-center">
          {/* Logo */}
          <div className="animate-fade-up mb-3 flex items-center gap-3">
            <LogoMark animated className="size-12 sm:size-14" />
            <h1>
              <Wordmark className="text-6xl leading-none sm:text-7xl" />
              <span className="sr-only">İzdera — gizlilik odaklı arama motoru</span>
            </h1>
          </div>
          <p
            className="animate-fade-up mb-9 text-center text-[0.95rem] text-muted"
            style={{ animationDelay: "60ms" }}
          >
            İzini sür. <span className="text-fg">Takip edilmeden keşfet.</span>
          </p>

          {/* Arama */}
          <div className="animate-fade-up w-full" style={{ animationDelay: "120ms" }}>
            <SearchBar size="lg" autoFocus />
          </div>

          {/* Gizlilik vaatleri */}
          <ul
            className="animate-fade-up mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-subtle"
            style={{ animationDelay: "180ms" }}
          >
            {["Çerez yok", "Profil yok", "Sunucuda geçmiş yok"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-10 w-full">
            <RecentSearches />
          </div>
        </div>
      </main>

      {/* İmza + bağlantılar */}
      <footer className="flex flex-col items-center justify-between gap-3 border-t border-line/60 px-5 py-5 text-xs text-subtle sm:flex-row sm:px-8">
        <p className="font-display text-base text-muted italic">
          “İz sürmek, izlenmek değildir.”
        </p>
        <nav aria-label="Alt bağlantılar" className="flex items-center gap-5">
          <Link href="/gizlilik" className="flex items-center gap-1.5 transition-colors hover:text-fg">
            <ShieldCheck className="size-3.5" /> Gizlilik
          </Link>
          <Link href="/gizlilik#eklenti" className="flex items-center gap-1.5 transition-colors hover:text-fg">
            <Puzzle className="size-3.5" /> Eklenti
          </Link>
          <a
            href="https://github.com/Suuhutrix/izdera"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-fg"
          >
            <GithubIcon className="size-3.5" /> GitHub
          </a>
        </nav>
      </footer>
    </div>
  );
}
