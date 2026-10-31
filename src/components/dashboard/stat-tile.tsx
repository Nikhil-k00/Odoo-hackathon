import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reference-style stat tile: icon chip + label, big number with a pill, and a 10-block segmented meter.
 * `tone="accent"` renders the lime highlighted variant.
 */
export function StatTile({
  icon,
  label,
  value,
  pill,
  sub,
  ratio,
  tone = "default",
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  pill?: string;
  sub?: string;
  ratio?: number; // 0..1 fills the meter
  tone?: "default" | "accent";
  className?: string;
}) {
  const filled = ratio === undefined ? null : Math.round(Math.max(0, Math.min(1, ratio)) * 10);
  return (
    <div className={cn("flex flex-col gap-5 rounded-[1.25rem] p-5", tone === "accent" ? "bg-accent text-accent-foreground" : "bg-card", className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-foreground [&_svg]:size-4">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="font-heading text-4xl font-semibold leading-none tracking-tight tabular-nums sm:text-[2.6rem]">{value}</span>
        {pill && (
          <span className={cn("mb-1 inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold", tone === "accent" ? "bg-white text-foreground" : "bg-accent text-accent-foreground")}>
            {pill}
          </span>
        )}
        {sub && <span className="mb-1 text-xs text-muted-foreground">{sub}</span>}
      </div>
      {filled !== null && (
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-9 flex-1 rounded-full",
                i < filled ? "bg-foreground" : tone === "accent" ? "border border-dashed border-foreground/30" : "border border-dashed border-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
