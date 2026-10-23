import { memo } from "react";
import type { AufgabenGruppe } from "@/daten/modelle";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { antwortSchluessel } from "@/simulation/ablauf";
import { cn } from "@/lib/utils";

export interface BogenGruppe {
  gruppe: AufgabenGruppe;
  titel: string;
  anzahl: number;
  /** aktiv: frei änderbar · nurLeer: nur leere Felder (in leerSet) dürfen noch geraten werden · gesperrt */
  modus: "aktiv" | "nurLeer" | "gesperrt";
  leerSet?: Set<string>;
}

type Antworten = Record<string, number | null | undefined>;

const Zeile = memo(function Zeile({ gruppe, i, wert, editierbar, aktuell, onAntwort, onWaehle, gross }: {
  gruppe: AufgabenGruppe;
  i: number;
  wert: number | null | undefined;
  editierbar: boolean;
  aktuell?: boolean;
  onAntwort: (schluessel: string, wert: number | null) => void;
  onWaehle?: () => void;
  gross?: boolean;
}) {
  const key = antwortSchluessel(gruppe, i);
  return (
    <div className={cn("flex items-center gap-1.5 rounded-lg px-1 py-0.5", aktuell && "bg-primary/10 ring-2 ring-primary/40")}>
      <button
        type="button"
        onClick={onWaehle}
        disabled={!onWaehle}
        className={cn("w-7 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground", onWaehle && "hover:text-primary")}
        aria-label={`Aufgabe ${i + 1} anzeigen`}
      >
        {i + 1}
      </button>
      <div className="flex gap-1" role="radiogroup" aria-label={`Antwort Aufgabe ${i + 1}`}>
        {BUCHSTABEN.map((b, k) => {
          const an = wert === k;
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={an}
              disabled={!editierbar}
              onClick={() => onAntwort(key, an ? null : k)}
              className={cn(
                "flex items-center justify-center rounded-full border-2 font-bold transition-colors",
                gross ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]",
                an ? "border-foreground bg-foreground text-background" : "border-muted-foreground/40 text-muted-foreground",
                editierbar && !an && "hover:border-primary hover:text-primary",
                !editierbar && "opacity-60",
              )}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function editierbarIn(g: BogenGruppe, key: string): boolean {
  if (g.modus === "aktiv") return true;
  if (g.modus === "nurLeer") return !!g.leerSet?.has(key);
  return false;
}

/** Separater Antwortbogen: pro Aufgabe Kreise A–E. Nochmals tippen = sauber ausradieren. */
export function AntwortbogenSim({ gruppen, antworten, onAntwort, aktuell, onWaehle, className }: {
  gruppen: BogenGruppe[];
  antworten: Antworten;
  onAntwort: (schluessel: string, wert: number | null) => void;
  aktuell?: { gruppe: AufgabenGruppe; i: number };
  onWaehle?: (gruppe: AufgabenGruppe, i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {gruppen.map((g) => {
        const beantwortet = Array.from({ length: g.anzahl }, (_, i) => antworten[antwortSchluessel(g.gruppe, i)]).filter((x) => x !== null && x !== undefined).length;
        return (
          <section key={g.gruppe} aria-label={`Antwortbogen ${g.titel}`}>
            <header className="mb-1 flex items-baseline justify-between gap-2">
              <h3 className="truncate text-sm font-extrabold">{g.titel}</h3>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {beantwortet}/{g.anzahl}
              </span>
            </header>
            {g.modus === "nurLeer" && <p className="mb-1 text-[11px] text-muted-foreground">Nur leere Felder dürfen noch geraten werden.</p>}
            {g.modus === "gesperrt" && <p className="mb-1 text-[11px] text-muted-foreground">Gesperrt.</p>}
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: g.anzahl }, (_, i) => {
                const key = antwortSchluessel(g.gruppe, i);
                return (
                  <Zeile
                    key={i}
                    gruppe={g.gruppe}
                    i={i}
                    wert={antworten[key]}
                    editierbar={editierbarIn(g, key)}
                    aktuell={aktuell?.gruppe === g.gruppe && aktuell.i === i}
                    onAntwort={onAntwort}
                    onWaehle={onWaehle && g.modus === "aktiv" ? () => onWaehle(g.gruppe, i) : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Eine Zeile des Antwortbogens in gross – für die Leiste am unteren Rand auf dem Handy. */
export function AntwortZeile({ gruppe, i, antworten, onAntwort, gesperrt }: {
  gruppe: AufgabenGruppe;
  i: number;
  antworten: Antworten;
  onAntwort: (schluessel: string, wert: number | null) => void;
  gesperrt?: boolean;
}) {
  return <Zeile gruppe={gruppe} i={i} wert={antworten[antwortSchluessel(gruppe, i)]} editierbar={!gesperrt} onAntwort={onAntwort} gross />;
}

/** Druckbarer Antwortbogen (schwarz auf weiss, A4): Kreise zum Ausmalen mit Bleistift. */
export function AntwortbogenDruck({ gruppen, titel = "Antwortbogen" }: { gruppen: Array<{ gruppe: AufgabenGruppe; titel: string; anzahl: number; teil: string }>; titel?: string }) {
  return (
    <section className="seitenumbruch bg-white p-4 text-black">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black pb-2">
        <h2 className="text-lg font-bold">{titel}</h2>
        <span className="text-xs">Name: ______________________ · Datum: ____________</span>
      </header>
      <p className="mb-3 text-[11px]">
        Sofort hier markieren – Markierungen im Testheft lassen sich nach Ablauf der Zeit nicht mehr übertragen. Kreis vollständig ausmalen. Falsche Markierungen sauber ausradieren, nicht
        durchstreichen. Mehrere Markierungen bei einer Aufgabe = 0 Punkte.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {gruppen.map((g) => (
          <div key={g.gruppe} className="break-inside-avoid">
            <h3 className="mb-1 text-xs font-bold">
              Teil {g.teil} · {g.titel}
            </h3>
            {Array.from({ length: g.anzahl }, (_, i) => (
              <div key={i} className="flex items-center gap-1 py-[1px]">
                <span className="w-5 text-right text-[10px] tabular-nums">{i + 1}</span>
                {BUCHSTABEN.map((b) => (
                  <span key={b} className="flex h-[15px] w-[15px] items-center justify-center rounded-full border border-black text-[8px]">
                    {b}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
