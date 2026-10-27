import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: ["**/.next/**", "**/node_modules/**", "extension/**", "scripts/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Görseller bilinçli olarak <img> ile yükleniyor: Vercel Hobby'nin
      // Image Optimization kotasını tüketmemek için (bkz. next.config.ts).
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
