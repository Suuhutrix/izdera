import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SITE_URL } from "@/lib/search/config";
import "./globals.css";

/*
 * Fontlar build sırasında indirilip KENDİ alan adımızdan sunulur (next/font) →
 * çalışma zamanında Google Fonts'a tek bir istek bile gitmez (gizlilik + hız).
 */
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "İzdera — İzini sür. Takip edilmeden keşfet.",
    template: "%s — İzdera",
  },
  description:
    "İzdera; seni izlemeyen, reklamsız ve bağımsız bir arama motoru. Çerez yok, profil yok, arama geçmişi sunucuda tutulmaz.",
  applicationName: "İzdera",
  keywords: ["arama motoru", "gizlilik", "izlenmeyen arama", "searxng", "bağımsız arama", "İzdera"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "İzdera",
    title: "İzdera — İzini sür. Takip edilmeden keşfet.",
    description: "Seni izlemeyen, bağımsız ve gizlilik odaklı arama motoru.",
  },
  twitter: { card: "summary", title: "İzdera", description: "İzini sür. Takip edilmeden keşfet." },
  alternates: {
    canonical: "/",
    types: { "application/opensearchdescription+xml": [{ url: "/opensearch.xml", title: "İzdera" }] },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#0f1117",
};

/**
 * Tema önyükleme betiği — ilk boyamadan ÖNCE çalışır (FOUC yok).
 * Varsayılan: koyu (obsidyen). Kullanıcı tercihi localStorage'da.
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('izdera:theme');var d=t?t==='dark':true;var r=document.documentElement;r.classList.toggle('dark',d);if(!d){var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute('content','#fbfaf7')}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`dark ${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-bg"
        >
          İçeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
