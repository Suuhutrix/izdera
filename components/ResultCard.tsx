"use client";

import { Clock } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { breadcrumbOf, cn, timeAgo } from "@/lib/utils";
import { Favicon } from "./Favicon";
import { Highlight } from "./Highlight";

interface ResultCardProps {
  result: SearchResult;
  query: string;
  newTab: boolean;
  index: number;
}

/** Tek bir web/haber sonucu. Kademeli fade-up ile sıçramasız görünür. */
export function ResultCard({ result, query, newTab, index }: ResultCardProps) {
  const { host, path } = breadcrumbOf(result.url);
  const published = timeAgo(result.publishedDate);

  return (
    <article
      className="group animate-fade-up relative -mx-3 rounded-2xl px-3 py-3.5 transition-colors duration-200 hover:bg-surface sm:-mx-4 sm:px-4"
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
    >
      {/* Site kimliği + breadcrumb */}
      <div className="mb-1.5 flex items-center gap-2.5">
        <Favicon host={host} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-fg">{host}</p>
          <p className="truncate text-xs text-crumb">
            {host}
            {path.map((seg, i) => (
              <span key={i} className="text-subtle">
                {" "}
                › <span className="text-crumb/90">{seg}</span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Başlık: hover'da soldan akan alt çizgi + renk geçişi */}
      <h3 className="text-[1.15rem] leading-snug font-medium text-pretty">
        <a
          href={result.url}
          target={newTab ? "_blank" : undefined}
          rel="noopener noreferrer nofollow"
          className="link-underline text-link visited:text-visited hover:brightness-110"
        >
          {result.title}
        </a>
      </h3>

      {/* Snippet: aranan kelimeler vurgulanır */}
      {(result.content || published) && (
        <p className="mt-1 line-clamp-3 text-[0.925rem] leading-relaxed text-muted">
          {published && (
            <span className="mr-1.5 inline-flex items-center gap-1 text-subtle">
              <Clock className="size-3" />
              {published} —
            </span>
          )}
          <Highlight text={result.content} query={query} />
        </p>
      )}

      {/* Sağ altta silik kaynak etiketi */}
      <div className="mt-1.5 flex justify-end">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.65rem] tracking-wider text-subtle/70 uppercase",
            "transition-colors group-hover:bg-elevated group-hover:text-subtle",
          )}
        >
          {result.engine}
        </span>
      </div>
    </article>
  );
}
