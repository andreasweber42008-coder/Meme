import { Munggi } from "@/components/maskottchen/Munggi";
import { cn } from "@/lib/utils";

/** App-Logo: Munggi im grünen Kreis (wie das App-Icon) */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary", className)} role="img" aria-label="Munggi">
      <Munggi variante="a" zustand="freut" className="h-[82%] w-[82%]" titel="" animiert={false} />
    </span>
  );
}
