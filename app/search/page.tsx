import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";
import { ResultSkeleton } from "@/components/Skeletons";

/**
 * Sonuç sayfası kabuğu STATİK üretilir (searchParams sunucuda okunmaz):
 * sayfa CDN'den anında gelir, veri istemcide CDN-önbellekli /api/search'ten çekilir.
 * → Her arama için sunucu tarafı render maliyeti yok.
 */
export const metadata: Metadata = {
  title: "Arama",
  robots: { index: false, follow: false }, // sonuç sayfaları dizine eklenmez
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 pt-32 sm:px-6 lg:pl-[13rem]">
          <div className="max-w-[680px]">
            <ResultSkeleton />
          </div>
        </div>
      }
    >
      <SearchView />
    </Suspense>
  );
}
