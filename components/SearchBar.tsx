"use client";

import { ArrowRight, Clock, Mic, Search, Sparkles, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { type BangDef, filterBangs, resolveBang } from "@/lib/search/bangs";
import { addRecentSearch, useRecentSearches, useSettings } from "@/lib/storage";
import type { Category, TimeRange } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/use-speech";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  initialQuery?: string;
  /** Sonuç sayfasında aktif kategoriyi koru. */
  category?: Category;
  /** Sonuç sayfasında aktif zaman aralığını koru. */
  timeRange?: TimeRange;
  size?: "lg" | "md";
  autoFocus?: boolean;
  className?: string;
}

/** Kullanıcı başka bir alana yazıyorsa "/" kısayolunu çalıştırma. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function buildSearchHref(
  q: string,
  category: Category = "general",
  page = 1,
  timeRange: TimeRange = "all",
) {
  const params = new URLSearchParams({ q });
  if (category !== "general") params.set("category", category);
  if (timeRange !== "all") params.set("time", timeRange);
  if (page > 1) params.set("p", String(page));
  return `/search?${params}`;
}

const suggestCache = new Map<string, string[]>();

type DropdownItem =
  | { kind: "bang"; bang: BangDef; value: string }
  | { kind: "recent"; text: string; value: string }
  | { kind: "suggest"; text: string; value: string };

export function SearchBar({
  initialQuery = "",
  category = "general",
  timeRange = "all",
  size = "md",
  autoFocus,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const settings = useSettings();
  const recent = useRecentSearches();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const lg = size === "lg";

  const submit = useCallback(
    (raw: string) => {
      // Baştaki "/" — input zaten odaklıyken kısayola basılınca metne karışabilir
      const q = raw.replace(/\s+/g, " ").trim().replace(/^\/+\s*/, "");
      if (!q) {
        inputRef.current?.focus();
        return;
      }
      setOpen(false);
      setActiveIndex(-1);

      // !bang kısayolu varsa doğrudan hedef siteye yönlendir
      const bangTarget = resolveBang(q);
      if (bangTarget) {
        if (bangTarget.term) addRecentSearch(q);
        inputRef.current?.blur();
        window.location.assign(bangTarget.url);
        return;
      }

      addRecentSearch(q);
      inputRef.current?.blur(); // mobilde klavyeyi kapat
      router.push(buildSearchHref(q, category, 1, timeRange));
    },
    [router, category, timeRange],
  );

  const speech = useSpeechRecognition({
    lang: settings.lang,
    onInterim: setValue,
    onFinal: (text) => {
      setValue(text);
      submit(text);
    },
  });

  // Klavye kısayolu: "/" → arama çubuğuna odaklan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dışarı tıklayınca öneri menüsünü kapat
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Canlı otomatik tamamlama (/api/suggest) — 160 ms debounce + bellek önbelleği
  useEffect(() => {
    const q = value.trim();
    if (!open || q.length < 2 || q.startsWith("!")) {
      setApiSuggestions([]);
      return;
    }

    const cacheKey = `${settings.lang}:${q.toLocaleLowerCase("tr-TR")}`;
    const cached = suggestCache.get(cacheKey);
    if (cached) {
      setApiSuggestions(cached);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q, lang: settings.lang });
      fetch(`/api/suggest?${params}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<[string, string[]]>)
        .then((data) => {
          const list = Array.isArray(data?.[1]) ? data[1].slice(0, 6) : [];
          suggestCache.set(cacheKey, list);
          setApiSuggestions(list);
        })
        .catch(() => {
          /* iptal veya çevrimdışı */
        });
    }, 160);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, open, settings.lang]);

  // Açılır menü öğelerini oluştur (!bang + eşleşen geçmiş + canlı öneriler)
  const items = useMemo<DropdownItem[]>(() => {
    const q = value.trim();
    const lower = q.toLocaleLowerCase("tr-TR");
    const out: DropdownItem[] = [];

    if (q.startsWith("!")) {
      const restTokens = q.split(/\s+/).slice(1).join(" ");
      for (const b of filterBangs(q, 6)) {
        const nextVal = restTokens ? `!${b.trigger} ${restTokens}` : `!${b.trigger} `;
        out.push({ kind: "bang", bang: b, value: nextVal });
      }
      return out;
    }

    if (!q) return [];

    // Eşleşen son aramalar (en fazla 3)
    const matchedRecent = recent
      .filter((r) => r.toLocaleLowerCase("tr-TR").includes(lower) && r.toLocaleLowerCase("tr-TR") !== lower)
      .slice(0, 3);
    for (const r of matchedRecent) {
      out.push({ kind: "recent", text: r, value: r });
    }

    // Canlı Vikipedi/OpenSearch önerileri (tekrarları çıkar)
    const seen = new Set(out.map((i) => i.value.toLocaleLowerCase("tr-TR")));
    seen.add(lower);
    for (const s of apiSuggestions) {
      const key = s.toLocaleLowerCase("tr-TR");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ kind: "suggest", text: s, value: s });
      }
    }

    return out.slice(0, 7);
  }, [value, recent, apiSuggestions]);

  const showDropdown = open && items.length > 0;

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (showDropdown) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      } else {
        e.currentTarget.blur();
      }
      return;
    }

    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (e.key === "Tab" && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      setValue(items[activeIndex].value);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (showDropdown && activeIndex >= 0 && items[activeIndex]) {
      const picked = items[activeIndex];
      if (picked.kind === "bang" && picked.value.endsWith(" ")) {
        setValue(picked.value);
        setActiveIndex(-1);
        inputRef.current?.focus();
        return;
      }
      setValue(picked.value);
      submit(picked.value);
      return;
    }
    submit(value);
  };

  return (
    <form ref={rootRef} role="search" onSubmit={onSubmit} className={cn("relative w-full", className)} action="/search">
      <div
        className={cn(
          "group relative flex items-center gap-1 rounded-full border border-line bg-surface transition-all duration-300",
          "hover:border-line-strong focus-within:border-accent/60 focus-within:shadow-glow",
          lg ? "h-14 pr-2 pl-5 shadow-card" : "h-11 pr-1.5 pl-4",
          speech.listening && "border-accent/60 shadow-glow",
        )}
      >
        <Search
          aria-hidden="true"
          className={cn("shrink-0 text-subtle transition-colors group-focus-within:text-accent", lg ? "size-5" : "size-4")}
          strokeWidth={2}
        />

        <input
          ref={inputRef}
          id={lg ? "home-search-input" : "header-search-input"}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={speech.listening ? "Dinleniyor…" : "İzini sür… (veya !yt, !w, !gh)"}
          aria-label="Arama sorgusu"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={256}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent px-2 text-fg outline-none placeholder:text-subtle",
            lg ? "text-lg" : "text-[0.95rem]",
          )}
        />

        {/* "/" ipucu: yalnızca masaüstünde, boş ve odaksızken */}
        {!value && (
          <kbd className="pointer-events-none mr-1 hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-xs text-subtle group-focus-within:hidden sm:block">
            /
          </kbd>
        )}

        {value && (
          <button
            type="button"
            id="search-clear"
            aria-label="Aramayı temizle"
            onClick={() => {
              setValue("");
              setApiSuggestions([]);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="grid size-8 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-elevated hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}

        {speech.supported && (
          <button
            type="button"
            id="search-voice"
            aria-label={speech.listening ? "Dinlemeyi durdur" : "Sesli arama"}
            aria-pressed={speech.listening}
            title="Sesli arama — tarayıcınızın konuşma tanıma servisini kullanır"
            onClick={speech.listening ? speech.stop : speech.start}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
              speech.listening ? "animate-listen bg-accent-soft text-accent" : "text-subtle hover:bg-elevated hover:text-fg",
            )}
          >
            <Mic className="size-4" />
          </button>
        )}

        <span aria-hidden="true" className={cn("mx-1 h-5 w-px bg-line", !lg && "hidden")} />

        <button
          type="submit"
          id="search-submit"
          aria-label="Ara"
          className={cn(
            "grid shrink-0 place-items-center rounded-full transition-all active:scale-95",
            lg
              ? "size-10 bg-accent text-bg hover:brightness-110"
              : "size-8 text-muted hover:bg-elevated hover:text-fg",
          )}
        >
          {lg ? <ArrowRight className="size-[18px]" strokeWidth={2.25} /> : <ArrowRight className="size-4" />}
        </button>
      </div>

      {/* Canlı Otomatik Tamamlama ve !Bang Kısayol Menüsü */}
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Arama önerileri"
          className="animate-fade-up absolute right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-card"
        >
          {items.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <li
                key={item.kind === "bang" ? `bang-${item.bang.trigger}` : `${item.kind}-${item.value}`}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  // input blur olmadan seçimi uygula
                  e.preventDefault();
                  if (item.kind === "bang" && item.value.endsWith(" ")) {
                    setValue(item.value);
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                    return;
                  }
                  setValue(item.value);
                  submit(item.value);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors",
                  isSelected ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
                )}
              >
                {item.kind === "bang" ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Zap className="size-4 shrink-0 text-accent" />
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-accent">
                        !{item.bang.trigger}
                      </span>
                      <span className="truncate font-medium text-fg">{item.bang.name}</span>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{item.bang.category}</span>
                  </>
                ) : item.kind === "recent" ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Clock className="size-4 shrink-0 text-subtle" />
                      <span className="truncate text-fg">{item.text}</span>
                    </div>
                    <span className="shrink-0 text-[0.7rem] text-subtle">Son arama</span>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Sparkles className="size-4 shrink-0 text-accent/80" />
                      <span className="truncate text-fg">{item.text}</span>
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 text-subtle opacity-60" />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
