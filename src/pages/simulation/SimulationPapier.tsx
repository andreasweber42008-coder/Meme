import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import type { SimulationsErgebnis } from "@/daten/modelle";
import { ablaufAusParametern, useSimInhalt } from "@/simulation/lauf";
import { fuerSpeicher, GRUPPEN_INFO, gruppenIm, loesungenFuer, miniArt, simulationWerten } from "@/simulation/ablauf";
import { AntwortbogenSim, type BogenGruppe } from "@/components/simulation/AntwortbogenSim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { heute } from "@/lib/datum";
import { neueId } from "@/lib/zufall";

/** Resultate einer gedruckten Simulation eintragen: Antwortbogen abtippen, Konz-Zählung aus der Schablone. */
export default function SimulationPapier() {
  const { seed = "" } = useParams();
  const [params] = useSearchParams();
  const [e] = useEinstellungen();
  const store = useSpeicher();
  const navigate = useNavigate();
  const { art, mini, ablauf } = useMemo(() => ablaufAusParametern(params, e.heftwechselMinuten, e.testbeginn), [params, e.heftwechselMinuten, e.testbeginn]);
  const inhalt = useSimInhalt(seed, ablauf);
  const gruppen = gruppenIm(ablauf);
  const [antworten, setAntworten] = useState<Record<string, number | null>>({});
  const [konz, setKonz] = useState({ richtig: "", falsch: "", uebersehen: "" });

  if (!inhalt)
    return (
      <div className="flex justify-center py-20" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const bogen: BogenGruppe[] = gruppen
    .filter((g) => g !== "konz")
    .map((g) => ({ gruppe: g, titel: GRUPPEN_INFO[g].name, anzahl: loesungenFuer(inhalt, g).length, modus: "aktiv" }));

  async function speichern() {
    const zahlen = gruppen.includes("konz") ? { richtig: Number(konz.richtig) || 0, falsch: Number(konz.falsch) || 0, uebersehen: Number(konz.uebersehen) || 0 } : undefined;
    const w = simulationWerten(inhalt!, gruppen, antworten, { zahlen });
    const id = neueId();
    const kw = w.konz?.konz;
    const doc: SimulationsErgebnis = {
      art: art === "mini" ? miniArt(mini ?? []) : art,
      quelle: "papier",
      seed,
      start: Date.now(),
      ende: Date.now(),
      tag: heute(),
      gruppen: fuerSpeicher(w),
      antworten,
      abgeschlossen: true,
      heftwechselMinuten: e.heftwechselMinuten,
      ...(art === "mini" ? { mini } : {}),
      ...(kw && inhalt!.konz ? { konz: { regelId: inhalt!.konz.regelId, richtig: kw.richtig, falsch: kw.falsch, uebersehen: kw.uebersehen, rohwert: kw.rohwert, punktwert: kw.punktwert } } : {}),
    };
    await store.speichern("simulationen", id, doc);
    navigate(`/simulation/ergebnis/${id}`, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Link to="/simulation" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Simulation
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold">Resultate eintragen</h1>
        <p className="text-sm text-muted-foreground">Code {seed}. Übertrage deinen Papier-Antwortbogen – leere Felder leer lassen.</p>
      </header>
      <AntwortbogenSim gruppen={bogen} antworten={antworten} onAntwort={(k, v) => setAntworten((a) => ({ ...a, [k]: v }))} />
      {gruppen.includes("konz") && inhalt.konz && (
        <section className="flex flex-col gap-2 rounded-2xl border-2 p-4">
          <h2 className="font-extrabold">Konz (mit der Auswerte-Schablone gezählt)</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["richtig", "falsch", "uebersehen"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1">
                <Label htmlFor={`konz-${k}`}>{k === "uebersehen" ? "übersehen" : k}</Label>
                <Input id={`konz-${k}`} type="number" min={0} inputMode="numeric" value={konz[k]} onChange={(ev) => setKonz({ ...konz, [k]: ev.target.value })} />
              </div>
            ))}
          </div>
        </section>
      )}
      <Button size="lg" onClick={() => void speichern()}>
        Auswerten
      </Button>
    </div>
  );
}
