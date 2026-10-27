import { cn } from "@/lib/utils";

/**
 * İskelet yükleyiciler — gerçek bileşenlerle AYNI ölçülerde,
 * böylece veri geldiğinde düzen kaymaz (CLS ≈ 0).
 */

export function ResultSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="py-3.5">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="skeleton size-7 rounded-full" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-2.5 w-44" />
            </div>
          </div>
          <div className="skeleton mb-2.5 h-5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
          <div className="space-y-1.5">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5" style={{ width: `${70 + ((i * 23) % 25)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
        <div className="space-y-1.5 pt-1">
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

const IMAGE_HEIGHTS = ["h-40", "h-56", "h-48", "h-64", "h-44", "h-52"];

export function ImageSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("skeleton mb-3 break-inside-avoid rounded-xl", IMAGE_HEIGHTS[i % IMAGE_HEIGHTS.length])} />
      ))}
    </div>
  );
}
