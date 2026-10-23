import { memo } from "react";
import { Check, Lock, X } from "lucide-react";
import { BUCHSTABEN, type Buchstabe } from "@/aufgaben/typen";
import { cn } from "@/lib/utils";

export interface AntwortbogenProps {
  anzahl: number;
  ersteNr?: number;
  /** Aufgaben-Nr. (als String) → Index 0–4 (A–E) oder null */
  antworten: Record<string, number | null | undefined>;
  onChange: (nr: number, antwort: number | null) => void;
  gesperrt?: boolean;
  /** Schlüssel ab ersteNr (Index 0 = ersteNr); zeigt richtig/falsch */
  zeigeLoesung?: ReadonlyArray<Buchstabe | null>;
  /** hervorgehobene Aufgabe */
  aktiveNr?: number;
  /** Tippen auf die Nummer (z. B. zur Seite der Aufgabe springen) */
  onNrWaehlen?: (nr: number) => void;
  /** Hinweis bei gesperrtem Bogen */
  sperrHinweis?: string;
  className?: string;
}

/**
 * Separater Antwortbogen wie im EMS: pro Aufgabe A–E, genau eine Markierung.
 * Nochmals tippen radiert die Markierung aus.
 */
export function Antwortbogen({
  anzahl,
  ersteNr = 1,
  antworten,
  onChange,
  gesperrt = false,
  zeigeLoesung,
  aktiveNr,
  onNrWaehlen,
  sperrHinweis = "Antwortbogen gesperrt",
  className,
}: AntwortbogenProps) {
  const ausgefuellt = Array.from({ length: anzahl }, (_, i) => antworten[String(ersteNr + i)]).filter((a) => typeof a === "number").length;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span className="tabular">
          {ausgefuellt}/{anzahl} markiert
        </span>
        {gesperrt && (
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" aria-hidden /> {sperrHinweis}
          </span>
        )}
      </div>
      <ol className="flex flex-col gap-1" aria-label="Antwortbogen">
        {Array.from({ length: anzahl }, (_, i) => {
          const nr = ersteNr + i;
          return (
            <Zeile
              key={nr}
              nr={nr}
              wert={antworten[String(nr)] ?? null}
              loesung={zeigeLoesung ? (zeigeLoesung[i] ?? null) : undefined}
              aktiv={aktiveNr === nr}
              gesperrt={gesperrt}
              onChange={onChange}
              onNrWaehlen={onNrWaehlen}
            />
          );
        })}
      </ol>
    </div>
  );
}

interface ZeileProps {
  nr: number;
  wert: number | null;
  /** undefined = keine Lösung zeigen; null = kein Schlüssel */
  loesung: Buchstabe | null | undefined;
  aktiv: boolean;
  gesperrt: boolean;
  onChange: (nr: number, antwort: number | null) => void;
  onNrWaehlen?: (nr: number) => void;
}

const Zeile = memo(function Zeile({ nr, wert, loesung, aktiv, gesperrt, onChange, onNrWaehlen }: ZeileProps) {
  const zeige = loesung !== undefined;
  const loesungIndex = loesung ? BUCHSTABEN.indexOf(loesung) : -1;
  const richtig = zeige && loesungIndex >= 0 && wert === loesungIndex;
  const falsch = zeige && loesungIndex >= 0 && !richtig;
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-1 py-0.5",
        aktiv && "bg-primary/10",
        richtig && "bg-richtig/10",
        falsch && "bg-falsch/10",
      )}
    >
      {onNrWaehlen ? (
        <button
          type="button"
          onClick={() => onNrWaehlen(nr)}
          className="w-9 shrink-0 rounded-md py-1 text-right text-sm font-bold tabular text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          aria-label={`Zu Aufgabe ${nr}`}
        >
          {nr}
        </button>
      ) : (
        <span className="w-9 shrink-0 text-right text-sm font-bold tabular text-muted-foreground">{nr}</span>
      )}
      <div role="radiogroup" aria-label={`Aufgabe ${nr}`} className="flex gap-1">
        {BUCHSTABEN.map((b, i) => {
          const gewaehlt = wert === i;
          const istLoesung = zeige && i === loesungIndex;
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={gewaehlt}
              aria-label={`${b}${istLoesung ? " (Lösung)" : ""}`}
              disabled={gesperrt}
              onClick={() => onChange(nr, gewaehlt ? null : i)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors disabled:cursor-not-allowed",
                gewaehlt ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted",
                gesperrt && !gewaehlt && "opacity-60",
                zeige && gewaehlt && istLoesung && "border-richtig bg-richtig text-white",
                zeige && gewaehlt && !istLoesung && loesungIndex >= 0 && "border-falsch bg-falsch text-white",
                zeige && !gewaehlt && istLoesung && "border-richtig text-richtig ring-2 ring-richtig/40",
              )}
            >
              {b}
            </button>
          );
        })}
      </div>
      {zeige && (
        <span className="ml-auto w-5 shrink-0" aria-hidden>
          {richtig ? <Check className="h-5 w-5 text-richtig" /> : falsch ? <X className="h-5 w-5 text-falsch" /> : null}
        </span>
      )}
    </li>
  );
});
