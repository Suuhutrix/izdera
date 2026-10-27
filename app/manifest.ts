import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "İzdera — Gizlilik odaklı arama",
    short_name: "İzdera",
    description: "İzini sür. Takip edilmeden keşfet.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    lang: "tr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
