"use client";

/**
 * Sıfır sunucu kayıtlı kalıcılık: tüm kullanıcı tercihleri ve son aramalar
 * YALNIZCA tarayıcının localStorage'ında tutulur.
 *
 * useSyncExternalStore ile:
 *  - SSR'da varsayılan değer döner (hidrasyon uyumsuzluğu yok),
 *  - aynı sekmedeki tüm bileşenler + diğer sekmeler anında senkronlanır.
 */
import { useSyncExternalStore } from "react";
import type { Lang } from "@/lib/types";

function createStore<T>(key: string, fallback: T, merge?: (parsed: unknown) => T) {
  const eventName = `izdera:${key}`;
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return fallback; // Safari gizli mod vb.
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedValue = raw === null ? fallback : merge ? merge(JSON.parse(raw)) : (JSON.parse(raw) as T);
      } catch {
        cachedValue = fallback;
      }
    }
    return cachedValue; // aynı referans → gereksiz render yok
  };

  const write = (value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* kota dolu / erişim yok: sessizce yoksay */
    }
    window.dispatchEvent(new Event(eventName));
  };

  const subscribe = (cb: () => void) => {
    const onStorage = (e: StorageEvent) => e.key === key && cb();
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, cb);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, cb);
    };
  };

  const useValue = () => useSyncExternalStore(subscribe, read, () => fallback);

  return { read, write, useValue };
}

/* ============================== Ayarlar ============================== */

export interface Settings {
  lang: Lang;
  safe: 0 | 1 | 2;
  newTab: boolean;
  saveHistory: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lang: "tr-TR", safe: 1, newTab: false, saveHistory: true };

const settingsStore = createStore<Settings>("izdera:settings", DEFAULT_SETTINGS, (parsed) => ({
  ...DEFAULT_SETTINGS,
  ...(typeof parsed === "object" && parsed ? (parsed as Partial<Settings>) : {}),
}));

export const useSettings = settingsStore.useValue;
export function updateSettings(patch: Partial<Settings>) {
  settingsStore.write({ ...settingsStore.read(), ...patch });
}

/* ============================== Son aramalar ============================== */

const MAX_RECENT = 8;
const recentStore = createStore<string[]>("izdera:recent", [], (parsed) =>
  Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT) : [],
);

export const useRecentSearches = recentStore.useValue;

export function addRecentSearch(query: string) {
  const q = query.trim();
  if (!q || !settingsStore.read().saveHistory) return;
  const lower = q.toLocaleLowerCase("tr-TR");
  const next = [q, ...recentStore.read().filter((s) => s.toLocaleLowerCase("tr-TR") !== lower)].slice(0, MAX_RECENT);
  recentStore.write(next);
}

export function removeRecentSearch(query: string) {
  recentStore.write(recentStore.read().filter((s) => s !== query));
}

export function clearRecentSearches() {
  recentStore.write([]);
}
