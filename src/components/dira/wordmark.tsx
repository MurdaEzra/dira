import { cn } from "@/lib/utils";

/** DIRA means "compass" in Swahili — the mark is a compass needle. */
export function CompassMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <g className="needle">
        <path d="M20 5.5l5 14.5h-10z" className="fill-coral" />
        <path d="M20 34.5l-5-14.5h10z" fill="currentColor" />
      </g>
      <circle cx="20" cy="20" r="2.4" className="fill-background" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <CompassMark />
      <span className="font-display text-2xl font-extrabold tracking-[-0.04em]">DIRA</span>
    </span>
  );
}
