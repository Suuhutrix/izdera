const DEFAULTS = { baseUrl: "https://izdera.com", newtabMode: "local" };

const baseInput = document.getElementById("baseUrl");
const status = document.getElementById("status");

chrome.storage.sync.get(DEFAULTS, ({ baseUrl, newtabMode }) => {
  baseInput.value = baseUrl;
  const radio = document.querySelector(`input[name="newtabMode"][value="${newtabMode}"]`);
  if (radio) radio.checked = true;
});

document.getElementById("save").addEventListener("click", () => {
  let baseUrl = baseInput.value.trim() || DEFAULTS.baseUrl;
  try {
    const u = new URL(baseUrl);
    if (!/^https?:$/.test(u.protocol)) throw new Error("protocol");
    baseUrl = u.origin;
  } catch {
    status.textContent = "Geçersiz adres.";
    return;
  }
  const newtabMode = document.querySelector('input[name="newtabMode"]:checked')?.value ?? DEFAULTS.newtabMode;
  chrome.storage.sync.set({ baseUrl, newtabMode }, () => {
    status.textContent = "Kaydedildi ✓";
    setTimeout(() => (status.textContent = ""), 1800);
  });
});
