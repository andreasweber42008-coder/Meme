import type { Aufgabe } from "@/aufgaben/typen";
import { BUCHSTABEN } from "@/aufgaben/typen";
import type { MusterDaten } from "@/aufgaben/muster";
import type { ObjekteDaten } from "@/aufgaben/objekte";
import type { QuantiDaten } from "@/aufgaben/quanti";
import type { DiagrammDaten } from "@/aufgaben/diagramme";
import type { MedNatDaten, TextAufgabeDaten } from "@/aufgaben/bank";
import { MusterAusschnitt, MusterGanz } from "./MusterBild";
import { lazy, Suspense } from "react";

// three.js nur laden, wenn eine Objekte-Aufgabe gezeigt wird
const ObjekteSzene = lazy(() =>
  import("./ObjekteSzene").then((m) => ({ default: m.ObjekteSzene })),
);
const ProbierWuerfel = lazy(() =>
  import("./ObjekteSzene").then((m) => ({ default: m.ProbierWuerfel })),
);
import { DiagrammAnsicht } from "./DiagrammAnsicht";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function Aussagen({ aussagen }: { aussagen?: string[] }) {
  if (!aussagen) return null;
  return (
    <ol className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-3 text-[15px]">
      {aussagen.map((a, i) => (
        <li key={i} className="flex gap-2">
          <span className="w-7 shrink-0 font-extrabold">
            {["I", "II", "III"][i]}.
          </span>
          <span>{a}</span>
        </li>
      ))}
    </ol>
  );
}

/** Der Aufgabenstamm: Bild, Text oder Diagramm */
export function Stimulus({
  aufgabe,
  lernmodus,
  kreuz,
}: {
  aufgabe: Aufgabe;
  lernmodus?: boolean;
  kreuz?: boolean;
}) {
  switch (aufgabe.generator) {
    case "muster": {
      const d = aufgabe.daten as MusterDaten;
      return (
        <MusterGanz
          primitive={d.primitive}
          groesse={d.groesse}
          raster={kreuz}
          className="mx-auto w-full max-w-sm"
        />
      );
    }
    case "objekte": {
      const d = aufgabe.daten as ObjekteDaten;
      return (
        <Suspense
          fallback={
            <div className="aspect-[2/1] w-full animate-pulse rounded-xl bg-muted" />
          }
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <ObjekteSzene objekte={d.objekte} label="Vorher" />
              <ObjekteSzene
                objekte={d.objekte}
                drehung={d.ziel}
                label="Nachher"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              → drehen nach rechts · ← nach links · ↑ kippen nach hinten · ↓
              kippen nach vorne (Blick von vorne)
            </p>
            {lernmodus && <ProbierWuerfel objekte={d.objekte} />}
          </div>
        </Suspense>
      );
    }
    case "quanti": {
      const d = aufgabe.daten as QuantiDaten;
      return (
        <p className="whitespace-pre-line text-[15px] leading-relaxed">
          {d.text}
        </p>
      );
    }
    case "mednat": {
      const d = aufgabe.daten as MedNatDaten;
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed">{d.text}</p>
          <Aussagen aussagen={d.aussagen} />
        </div>
      );
    }
    case "diagramme": {
      const d = aufgabe.daten as DiagrammDaten;
      return (
        <div className="flex flex-col gap-3">
          <DiagrammAnsicht daten={d} />
          <Aussagen aussagen={d.aussagen} />
        </div>
      );
    }
    case "text": {
      const d = aufgabe.daten as TextAufgabeDaten;
      return <Aussagen aussagen={d.aussagen} />;
    }
    default:
      return null;
  }
}

/** Antwortmöglichkeiten A–E. Nach der Antwort: richtig grün, gewählte falsche rot. */
export function Optionen({
  aufgabe,
  gewaehlt,
  aufgedeckt,
  onWahl,
  gesperrt,
}: {
  aufgabe: Aufgabe;
  gewaehlt: number | null;
  aufgedeckt: boolean;
  onWahl: (i: number) => void;
  gesperrt?: boolean;
}) {
  const bild = aufgabe.generator === "muster";
  const d = aufgabe.daten as MusterDaten;
  return (
    <div
      className={cn(bild ? "grid grid-cols-5 gap-1.5" : "flex flex-col gap-2")}
      role="radiogroup"
      aria-label="Antworten"
    >
      {aufgabe.optionen.map((o, i) => {
        const richtig = aufgedeckt && i === aufgabe.loesung;
        const falsch = aufgedeckt && i === gewaehlt && i !== aufgabe.loesung;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={gewaehlt === i}
            disabled={gesperrt || aufgedeckt}
            onClick={() => onWahl(i)}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 bg-card text-left transition-colors",
              bild ? "flex-col p-1" : "p-3",
              !aufgedeckt && gewaehlt === i && "border-primary bg-primary/10",
              !aufgedeckt && !gesperrt && "hover:border-primary/60",
              richtig && "border-richtig bg-richtig/10",
              falsch && "border-falsch bg-falsch/10",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold",
                gewaehlt === i &&
                  !aufgedeckt &&
                  "border-primary bg-primary text-primary-foreground",
              )}
            >
              {BUCHSTABEN[i]}
            </span>
            {bild ? (
              <MusterAusschnitt
                ausschnitt={d.ausschnitte[i]}
                className="w-full"
              />
            ) : (
              <span className="flex-1 text-[15px] leading-snug">{o.text}</span>
            )}
            {richtig && (
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-richtig"
                aria-label="richtig"
              />
            )}
            {falsch && (
              <XCircle
                className="h-5 w-5 shrink-0 text-falsch"
                aria-label="falsch"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Lesetext für Textverständnis mit nummerierten Absätzen; Belegstellen können hervorgehoben werden. */
export function LeseText({
  titel,
  absaetze,
  hervorheben,
}: {
  titel: string;
  absaetze: string[];
  hervorheben?: number[];
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border-2 bg-white p-4 text-black">
      <h2 className="text-lg font-extrabold">{titel}</h2>
      {absaetze.map((a, i) => (
        <p
          key={i}
          className={cn(
            "text-[15px] leading-relaxed",
            hervorheben?.includes(i + 1) &&
              "rounded bg-yellow-100 ring-4 ring-yellow-100",
          )}
        >
          <span className="mr-1.5 select-none text-xs font-bold text-black/50">
            {i + 1}
          </span>
          {a}
        </p>
      ))}
    </article>
  );
}
