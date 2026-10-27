"use client";

import { Settings2, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { clearRecentSearches, type Settings, updateSettings, useSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

const LANG_OPTIONS: { value: Settings["lang"]; label: string }[] = [
  { value: "tr-TR", label: "Türkçe" },
  { value: "en-US", label: "English" },
  { value: "all", label: "Tüm diller" },
];

const SAFE_OPTIONS: { value: Settings["safe"]; label: string }[] = [
  { value: 0, label: "Kapalı" },
  { value: 1, label: "Orta" },
  { value: 2, label: "Sıkı" },
];

/** Segment kontrol (Shadcn ToggleGroup deseni) */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-subtle">{label}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg bg-elevated p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer text-sm text-fg">
        {label}
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

/** Ayarlar açılır paneli — tüm tercihler yalnızca localStorage'da. */
export function SettingsMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Dışarı tıklama + Esc ile kapat
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id="settings-toggle"
        aria-label="Ayarlar"
        title="Ayarlar"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid size-9 place-items-center rounded-full text-muted transition-all hover:bg-elevated hover:text-fg active:scale-95",
          open && "bg-elevated text-fg",
        )}
      >
        <Settings2 className={cn("size-[18px] transition-transform duration-300", open && "rotate-90")} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Arama ayarları"
          className="animate-fade-up absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-card"
        >
          <Segmented label="Sonuç dili" value={settings.lang} options={LANG_OPTIONS} onChange={(lang) => updateSettings({ lang })} />
          <Segmented label="Güvenli arama" value={settings.safe} options={SAFE_OPTIONS} onChange={(safe) => updateSettings({ safe })} />
          <div className="space-y-3 border-t border-line pt-4">
            <Toggle label="Bağlantıları yeni sekmede aç" checked={settings.newTab} onChange={(newTab) => updateSettings({ newTab })} />
            <Toggle
              label="Son aramaları hatırla"
              hint="Yalnızca bu tarayıcıda saklanır"
              checked={settings.saveHistory}
              onChange={(saveHistory) => {
                updateSettings({ saveHistory });
                if (!saveHistory) clearRecentSearches();
              }}
            />
          </div>
          <button
            type="button"
            onClick={clearRecentSearches}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <Trash2 className="size-3.5" />
            Arama geçmişini temizle
          </button>
        </div>
      )}
    </div>
  );
}
