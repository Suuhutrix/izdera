import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/search/config";

export default function robots(): MetadataRoute.Robots {
  return {
    // Sonuç sayfaları ve API taranmaz (gereksiz fonksiyon çağrısı + yinelenen içerik).
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search", "/api/", "/fav/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
