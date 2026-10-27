import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * İçerik Güvenlik Politikası.
 * - img-src https: → sonuç görselleri/küçük resimler çok sayıda farklı alan adından gelir.
 * - connect-src 'self' → tarayıcı yalnızca kendi API'mizle konuşur; üçüncü taraf izleyici yok.
 * - 'unsafe-inline' script: tema önyükleme betiği + Next.js hidrasyon verisi için gerekli.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Sonuca tıklandığında hedef siteye arama sorgusu (Referer) SIZDIRILMAZ.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Mikrofon yalnızca sesli arama için kendi kökenimize açık; FLoC/Topics kapalı.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), browsing-topics=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Vercel Hobby'nin Image Optimization kotasını harcamamak için kapalı;
  // görseller tarayıcıda lazy-load + no-referrer ile yükleniyor.
  images: { unoptimized: true },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async rewrites() {
    return [
      // Favicon proxy'si: Vercel yönlendirme katmanında çalışır (fonksiyon çağrısı YOK).
      // Kullanıcının IP'si favicon servisine değil, Vercel'e görünür.
      { source: "/fav/:host", destination: "https://icons.duckduckgo.com/ip3/:host.ico" },
    ];
  },
};

export default nextConfig;
