import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSammlung } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { useFortschritt } from "@/lernpfad/fortschritt";
import type { Versuch } from "@/daten/modelle";
import { UNTERTESTS } from "@/content/untertests";
import { gruppenStand, type Ampel } from "@/statistik/kennzahlen";
import { heute } from "@/lib/datum";
import { cn } from "@/lib/utils";

export const AMPEL_TEXT: Record<Ampel, string> = { gruen: "bereit", gelb: "auf Kurs", rot: "dranbleiben", grau: "noch keine Daten" };
const PUNKT: Record<Ampel, string> = { gruen: "bg-richtig", gelb: "bg-gold", rot: "bg-falsch", grau: "bg-muted-foreground/30" };

export function AmpelPunkt({ ampel }: { ampel: Ampel }) {
  return <span className={cn("inline-block h-3 w-3 shrink-0 rounded-full", PUNKT[ampel])} aria-label={AMPEL_TEXT[ampel]} />;
}

/** Bereitschafts-Ampel: gemessen an deinen eigenen Zielen – keine Zulassungsprognose. */
export function Bereitschaft({ kompakt }: { kompakt?: boolean }) {
  const versuche = useSammlung<Versuch>("versuche");
  const fortschritt = useFortschritt();
  const [e] = useEinstellungen();
  const stand = useMemo(() => gruppenStand(versuche, fortschritt, e, heute()), [versuche, fortschritt, e]);
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 p-3" aria-labelledby="ampel-titel">
      <div className="flex items-baseline justify-between">
        <h2 id="ampel-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Bereitschaft
        </h2>
        {kompakt && (
          <Link to="/statistik" className="text-xs font-semibold text-primary">
            Statistik →
          </Link>
        )}
      </div>
      <ul className={cn("grid gap-1.5", kompakt ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {stand.map((s) => {
          const u = UNTERTESTS.find((x) => x.id === s.gruppe)!;
          return (
            <li key={s.gruppe} className="flex items-center gap-1.5 text-xs">
              <AmpelPunkt ampel={s.ampel} />
              <span className="truncate font-semibold">{u.kurzname}</span>
              {!kompakt && (
                <span className="ml-auto text-muted-foreground">
                  {s.genauigkeit !== null ? `${Math.round(s.genauigkeit * 100)} %` : "–"} · Ziel {Math.round((e.ziele[s.gruppe]?.genauigkeit ?? 0.75) * 100)} % · Stufe {s.stufe}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">Gemessen an deinen eigenen Zielen der letzten 3 Wochen. Keine Prognose über die Zulassung.</p>
    </section>
  );
}
