# İzdera

> İzini sür. Takip edilmeden keşfet.

Gizlilik odaklı, sıfır sunucu maliyetli meta arama motoru. Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Lucide · Vercel Hobby.

## Hızlı başlangıç

```bash
npm install
cp .env.example .env.local   # opsiyonel — varsayılanlar çalışır
npm run dev                  # http://localhost:3000
```

| Komut | Açıklama |
| --- | --- |
| `npm run build` | Üretim derlemesi (lint + tip kontrolü dahil) |
| `npm run typecheck` | Yalnızca TypeScript kontrolü |
| `npm run icons` | PNG ikonlarını `LogoMark` geometrisinden yeniden üretir |
| `docker compose up -d` | Yerelde kendi SearXNG sunucunuzu (`http://localhost:8080`) başlatır |

## Mimari

```
Tarayıcı ──► /search (statik kabuk, CDN)
        └──► /api/search?q&p&category&lang&safe&time   (Cache-Control: s-maxage=600)
                 │
                 ├─ Anlık Yanıt (0 ms): Hesap makinesi, KDV/yüzde, birim, renk (HEX/RGB), saat/UUID
                 ├─ Bilgi kutusu: Wikipedia (paralel)
                 ├─ 1) SearXNG havuzu  → özel instance + paralel yarış, devre kesici
                 └─ 2) Gerçek Web Yedeği (SearXNG düşerse veya kurulmadıysa)
                        general → DuckDuckGo Web + Wikipedia + Marginalia (+ opsiyonel Brave API)
                        images  → Wikimedia Commons (Lightbox önizlemeli)
                        news    → GDELT + Wikinews + DuckDuckGo Güncel
```

- **Önbellek:** upstream `fetch` çağrıları `next: { revalidate: 600 }`; API yanıtı CDN'de 10 dk (yedek modda 3 dk).
- **Gizlilik:** çerez, analitik, sunucu tarafı geçmiş yok. Son aramalar ve ayarlar yalnızca `localStorage`'da. Favicon'lar `/fav/:host` rewrite'ı ile proxy'lenir, `Referrer-Policy: no-referrer`.
- **Hız Sınırı (Rate Limit):** Ham IP kaydetmeden (günlük tuzlu FNV-1a hash ile) dakikada 60 isteği aşan botları `429` ile durdurur.
- **`!bang` Kısayolları:** `!yt`, `!w`, `!gh`, `!so`, `!npm`, `!mdn`, `!eksi`, `!tdk`, `!ceviri`, `!harita`, `!g`, `!ddg`, `!b`, `!reddit`, `!scholar`, `!imdb`.

---

## Ücretsiz (0 TL) Kendi SearXNG Sunucunuzu Kurma Rehberi

Projede hazır [`docker-compose.yml`](./docker-compose.yml), [`searxng/Dockerfile`](./searxng/Dockerfile), [`searxng/settings.yml`](./searxng/settings.yml) ve [`render.yaml`](./render.yaml) dosyaları bulunur (`formats: [html, json]` açık, `limiter: false`).

### Seçenek 1: Render.com ile Ücretsiz Kurulum (En Kolay — Kredi Kartı Gerekmez)
1. Bu depoyu GitHub hesabınıza gönderin.
2. [Render.com](https://dashboard.render.com) üzerinde **New → Blueprint** seçeneğine tıklayın ve deponuzu seçin (veya **New → Web Service** → Runtime: `Docker`, Root Directory: `searxng`).
3. Render otomatik olarak `searxng/Dockerfile` dosyasını derleyip size `https://izdera-searxng-xxxx.onrender.com` gibi bir adres verir.
4. Bu adresi Vercel'de **`SEARXNG_INSTANCES`** ortam değişkeninin en başına yazın:
   ```env
   SEARXNG_INSTANCES=https://izdera-searxng-xxxx.onrender.com
   ```

### Seçenek 2: Koyeb Free Tier ile Ücretsiz Kurulum
1. [Koyeb](https://app.koyeb.com) üzerinde **Create Web Service → GitHub** seçin.
2. Builder olarak **Dockerfile** seçip Dockerfile konumuna `searxng/Dockerfile`, Workdir alanına `searxng` ve Port alanına `8080` girin.
3. Instance tipi olarak **Free** seçip yayınlayın; aldığınız `https://....koyeb.app` adresini `SEARXNG_INSTANCES` olarak tanımlayın.

### Seçenek 3: Yerel Bilgisayarda veya Ücretsiz VPS'te (Oracle Cloud Free Tier) Docker ile
```bash
docker compose up -d
```
Konteyner `http://localhost:8080` üzerinde ayağa kalkar. `.env.local` dosyasında `SEARXNG_INSTANCES=http://localhost:8080` hazır tanımlıdır.

---

## Vercel'e deploy

1. Depoyu GitHub'a gönderin → Vercel'de **Import Project**.
2. **Settings → Environment Variables**: `.env.example`'daki değerleri girin (`NEXT_PUBLIC_SITE_URL` ve kurduysanız `SEARXNG_INSTANCES`).
3. Bölge `vercel.json` içinde `fra1` (Türkiye'ye en yakın) olarak sabitlenmiştir.

## Tarayıcı eklentisi (`/extension`)

1. `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş öğe yükle** → `extension/` klasörü.
2. Chrome, varsayılan arama motorunun değişmesi için onay ister.
3. Yeni sekme davranışı ve site adresi eklentinin **Seçenekler** sayfasından değiştirilebilir. Adres çubuğunda `iz` + boşluk ile doğrudan İzdera'da arayabilirsiniz.

## Lisans notları

Bilgi kutusu içeriği Vikipedi'den gelir ve **CC BY-SA 4.0** lisanslıdır; atıf panelde gösterilir.
