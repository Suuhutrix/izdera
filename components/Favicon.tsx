"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Favicon: /fav/:host rewrite'ı üzerinden (bkz. next.config.ts) yüklenir —
 * kullanıcının IP'si favicon servisine sızmaz. Yüklenemezse baş harf rozeti.
 */
export function Favicon({ host, className }: { host: string; className?: string }) {
  const [failed, setFailed] = useState(!host);

  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-elevated",
        className,
      )}
    >
      {failed ? (
        <span className="text-[0.7rem] font-semibold text-muted uppercase">{host.charAt(0) || "?"}</span>
      ) : (
        <img
          src={`/fav/${encodeURIComponent(host)}`}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-4"
        />
      )}
    </span>
  );
}
