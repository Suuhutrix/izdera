/**
 * Yeni sekme mantığı:
 *  - newtabMode = "local"  → bu hafif yerel sayfa (anında açılır, ağ isteği yok)
 *  - newtabMode = "remote" → tam İzdera arayüzüne yönlendir
 */
const DEFAULT_BASE = "https://izdera.com";

chrome.storage.sync.get({ baseUrl: DEFAULT_BASE, newtabMode: "local" }, ({ baseUrl, newtabMode }) => {
  const base = String(baseUrl || DEFAULT_BASE).replace(/\/+$/, "");

  if (newtabMode === "remote") {
    location.replace(`${base}/`);
    return;
  }

  document.getElementById("search-form").action = `${base}/search`;
  document.body.classList.add("ready");
});

document.getElementById("search-form").addEventListener("submit", (e) => {
  const q = document.getElementById("q").value.trim();
  if (!q) e.preventDefault();
});

document.getElementById("options-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
