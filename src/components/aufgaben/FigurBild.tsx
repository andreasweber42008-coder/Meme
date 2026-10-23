import type { Figur, Punkt } from "@/aufgaben/figuren";
import { cn } from "@/lib/utils";

const pfad = (p: Punkt[]) => `M${p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")} Z`;

/** Figur aus 5 Teilflächen. Lernen: eine Fläche schwarz. Abruf: Flächen mit A–E beschriftet. */
export function FigurBild({ figur, modus, gewaehlt, richtig, className, onWahl }: {
  figur: Figur;
  modus: "lernen" | "abruf";
  gewaehlt?: number | null;
  /** nach dem Abruf die richtige Fläche zeigen */
  richtig?: boolean;
  className?: string;
  onWahl?: (flaeche: number) => void;
}) {
  return (
    <svg viewBox="0 0 100 100" className={cn("rounded-lg border-2 bg-white text-black", className)} role="img" aria-label={modus === "lernen" ? "Figur einprägen" : "Figur: welche Fläche war schwarz?"}>
      {figur.flaechen.map((f, i) => {
        const schwarz = modus === "lernen" ? i === figur.schwarz : richtig && i === figur.schwarz;
        const markiert = modus === "abruf" && gewaehlt === i;
        return (
          <path
            key={i}
            d={pfad(f)}
            fill={schwarz ? "#111" : markiert ? (richtig && i !== figur.schwarz ? "#fca5a5" : "#bfdbfe") : "white"}
            stroke="#111"
            strokeWidth={0.9}
            onClick={onWahl ? () => onWahl(i) : undefined}
            className={onWahl ? "cursor-pointer" : undefined}
          />
        );
      })}
      <path d={pfad(figur.umriss)} fill="none" stroke="#111" strokeWidth={1.6} />
      {modus === "abruf" &&
        figur.labels.map(([x, y], i) => (
          <text key={i} x={x} y={y + 3} textAnchor="middle" fontSize={9} fontWeight={800} fill={richtig && i === figur.schwarz ? "white" : "#111"} pointerEvents="none">
            {"ABCDE"[i]}
          </text>
        ))}
    </svg>
  );
}
