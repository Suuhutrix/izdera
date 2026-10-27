import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/search/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/gizlilik`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
