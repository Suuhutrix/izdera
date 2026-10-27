"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { SearchErrorBody, SearchResponse } from "@/lib/types";

/**
 * İstemci bellek önbelleği (oturum boyu): geri/ileri gezinmede ve sekmeler
 * arası geçişte API'ye hiç gidilmez. LRU benzeri basit sınır.
 */
const memoryCache = new Map<string, SearchResponse>();
const MAX_ENTRIES = 40;

function remember(key: string, value: SearchResponse) {
  memoryCache.delete(key);
  memoryCache.set(key, value);
  if (memoryCache.size > MAX_ENTRIES) memoryCache.delete(memoryCache.keys().next().value!);
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SearchResponse }
  | { status: "error"; error: string };

const noopSubscribe = () => () => {};
/** Hidrasyon tamamlandı mı? (localStorage ayarları ancak sonra güvenilir) */
export const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** `/api/search` istemcisi: iptal edilebilir (AbortController), önbellekli, yeniden denenebilir. */
export function useSearch(url: string | null) {
  const [state, setState] = useState<State>(() => {
    const hit = url ? memoryCache.get(url) : undefined;
    return hit ? { status: "success", data: hit } : { status: url ? "loading" : "idle" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ status: "idle" });
      return;
    }
    const hit = memoryCache.get(url);
    if (hit) {
      setState({ status: "success", data: hit });
      return;
    }

    const ctrl = new AbortController();
    setState({ status: "loading" });

    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as SearchResponse | SearchErrorBody | null;
        if (!res.ok || !body || "error" in body) {
          throw new Error((body as SearchErrorBody | null)?.error ?? `Beklenmeyen yanıt (HTTP ${res.status}).`);
        }
        return body;
      })
      .then((data) => {
        remember(url, data);
        setState({ status: "success", data });
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return; // yeni arama başladı: eski hatayı gösterme
        setState({
          status: "error",
          error: err.message === "Failed to fetch" ? "İnternet bağlantınızı kontrol edin." : err.message,
        });
      });

    return () => ctrl.abort();
  }, [url, attempt]);

  const retry = useCallback(() => {
    if (url) memoryCache.delete(url);
    setAttempt((n) => n + 1);
  }, [url]);

  return { state, retry };
}
