import { memo, useEffect, useState } from "react";
import type { KonzBlatt } from "@/aufgaben/konz";
import { KonzZeichen } from "./KonzZeichen";
import { cn } from "@/lib/utils";

/** Zeichen pro Bildschirmzeile: 40 (Desktop), 20 (Tablet), 10 (Handy) – eine Blattzeile bleibt eine Einheit. */
function useProZeile(): number {
  const messen = () => (typeof window === "undefined" ? 40 : window.innerWidth >= 1100 ? 40 : window.innerWidth >= 600 ? 20 : 10);
  const [n, setN] = useState(messen);
  useEffect(() => {
    const f = () => setN(messen());
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return n;
}

interface Props {
  blatt: KonzBlatt;
  markiert: boolean[][];
  onToggle?: (zeile: number, spalte: number) => void;
  gesperrt?: boolean;
  /** nach der Auswertung: richtig/falsch/übersehen einfärben */
  aufgedeckt?: boolean;
  /** nur die ersten n Zeilen zeigen */
  zeilen?: number;
  /** Zeilen vor dieser Nummer sind geprüft und werden eingefärbt (Zeile für Zeile üben) */
  aufgedecktBis?: number;
}

const Zeichen = memo(function Zeichen({ blatt, r, c, m, aufgedeckt, gesperrt, onToggle, bisLetzte }: {
  blatt: KonzBlatt;
  r: number;
  c: number;
  m: boolean;
  aufgedeckt?: boolean;
  gesperrt?: boolean;
  onToggle?: (zeile: number, spalte: number) => void;
  bisLetzte: boolean;
}) {
  const ziel = blatt.ziele[r][c];
  const farbe = !aufgedeckt
    ? m
      ? "bg-primary/15"
      : ""
    : m && ziel
      ? "bg-richtig/25"
      : m && !ziel
        ? "bg-falsch/30"
        : !m && ziel && bisLetzte
          ? "bg-gold/40"
          : "";
  return (
    <button
      type="button"
      disabled={gesperrt}
      onClick={() => onToggle?.(r, c)}
      aria-pressed={m}
      aria-label={`Zeile ${r + 1}, Zeichen ${c + 1}${m ? ", markiert" : ""}`}
      className={cn("relative flex aspect-square items-center justify-center rounded-sm text-foreground", farbe, !gesperrt && "active:bg-primary/25")}
    >
      <KonzZeichen zelle={blatt.zeilen[r][c]} className="h-full w-full" />
      {m && (
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 text-primary" aria-hidden="true">
          <line x1={3} y1={21} x2={21} y2={3} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
});

export function KonzBlattAnsicht({ blatt, markiert, onToggle, gesperrt, aufgedeckt, zeilen, aufgedecktBis = 0 }: Props) {
  const pro = useProZeile();
  const anzahl = Math.min(zeilen ?? blatt.zeilen.length, blatt.zeilen.length);
  let letzte = -1;
  markiert.forEach((zeile, r) => zeile.forEach((m, c) => m && (letzte = r * 1000 + c)));
  return (
    <div className="flex flex-col gap-2" role="grid" aria-label="Konz-Blatt">
      {blatt.zeilen.slice(0, anzahl).map((zeile, r) => (
        <div key={r} className="flex gap-1.5 border-b border-dashed pb-1.5" role="row">
          <span className="w-6 shrink-0 pt-1 text-right text-[10px] font-bold tabular-nums text-muted-foreground">{r + 1}</span>
          <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(pro, zeile.length)}, minmax(0, 1fr))` }}>
            {zeile.map((_, c) => (
              <Zeichen
                key={c}
                blatt={blatt}
                r={r}
                c={c}
                m={!!markiert[r]?.[c]}
                aufgedeckt={aufgedeckt || r < aufgedecktBis}
                gesperrt={gesperrt || r < aufgedecktBis}
                onToggle={onToggle}
                bisLetzte={r < aufgedecktBis || r * 1000 + c <= letzte}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Druckblatt: 40 Zeichen pro Zeile, Anweisung oben, ohne Interaktion */
export function KonzDruckblatt({ blatt, anweisung, titel, schablone }: { blatt: KonzBlatt; anweisung: string; titel: string; schablone?: boolean }) {
  return (
    <section className="seitenumbruch bg-white p-4 text-black">
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-bold">{titel}</h2>
        <span className="text-xs">{schablone ? "Auswerte-Schablone" : "Bearbeitungszeit 8 Minuten"}</span>
      </header>
      <p className="mb-3 text-xs">{anweisung}</p>
      <div className="flex flex-col gap-[3px]">
        {blatt.zeilen.map((zeile, r) => (
          <div key={r} className="flex items-center gap-1">
            <span className="w-4 text-right text-[7px]">{r + 1}</span>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${zeile.length}, minmax(0, 1fr))` }}>
              {zeile.map((z, c) => (
                <div key={c} className="relative aspect-square">
                  <KonzZeichen zelle={z} className={cn("h-full w-full", schablone && !blatt.ziele[r][c] && "opacity-20")} />
                  {schablone && blatt.ziele[r][c] && <span className="absolute inset-0 rounded-full border-2 border-red-600" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
