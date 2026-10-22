import { cn } from "@/lib/utils";

/** Platzhalter-Logo (Berg mit Stirnlampen-Licht). Das Maskottchen folgt in Phase 3. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label="Munggi">
      <circle cx="32" cy="32" r="30" fill="hsl(var(--primary))" />
      <path d="M8 46 L24 24 L32 34 L40 22 L56 46 Z" fill="hsl(var(--primary-foreground))" opacity="0.95" />
      <path d="M40 22 L44 28 L36 28 Z" fill="hsl(var(--primary))" opacity="0.35" />
      <circle cx="46" cy="14" r="4" fill="hsl(var(--accent))" />
      <path d="M46 14 L60 8 L60 20 Z" fill="hsl(var(--accent))" opacity="0.45" />
    </svg>
  );
}
