/**
 * İzdera eklentisi — arka plan service worker'ı (MV3).
 * "iz" + Boşluk/Tab ile adres çubuğunda doğrudan İzdera araması.
 * (Varsayılan arama motoru değişikliğini kabul etmeyen kullanıcılar için de çalışır.)
 */
const DEFAULT_BASE = "https://izdera.com";

async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE });
  return String(baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: "İzdera'da ara: <match>%s</match>" });
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const url = `${await getBaseUrl()}/search?q=${encodeURIComponent(text.trim())}`;
  if (disposition === "currentTab") {
    chrome.tabs.update({ url });
  } else {
    chrome.tabs.create({ url, active: disposition === "newForegroundTab" });
  }
});
