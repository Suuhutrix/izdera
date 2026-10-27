/**
 * OpenSearch tanımı → tarayıcılar İzdera'yı "arama motoru olarak ekle" seçeneğiyle tanır.
 * Build sırasında statik üretilir (force-static): her istek CDN'den, fonksiyon çağrısı yok.
 */
import { SITE_URL } from "@/lib/search/config";

export const dynamic = "force-static";

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>İzdera</ShortName>
  <Description>İzini sür. Takip edilmeden keşfet.</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Language>tr-TR</Language>
  <Image width="16" height="16" type="image/svg+xml">${SITE_URL}/icon.svg</Image>
  <Image width="192" height="192" type="image/png">${SITE_URL}/icon-192.png</Image>
  <Url type="text/html" method="get" template="${SITE_URL}/search?q={searchTerms}"/>
  <Url type="application/x-suggestions+json" method="get" template="${SITE_URL}/api/suggest?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${SITE_URL}/opensearch.xml"/>
  <moz:SearchForm>${SITE_URL}/</moz:SearchForm>
</OpenSearchDescription>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
