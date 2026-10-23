import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { bewerten, entscheidAufgaben, erzeugeBlatt, konzRegel, type KonzWertung } from "@/aufgaben/konz";
import type { Einheit } from "@/lernpfad/einheiten";
import type { StufenErgebnis } from "@/daten/modelle";
import { useSpeicher } from "@/daten/DatenProvider";
import { usePlanStand } from "@/daten/hooks";
import { naechsteKonzRegel } from "@/plan/plan";
import { fehlerEintragen, lektionAbschliessen, versuchSpeichern, type StufenBewertung } from "@/lernpfad/protokoll";
import { STUFEN } from "@/content/stufen";
import { Button } from "@/components/ui/button";
import { KonzZeichen } from "@/components/aufgaben/KonzZeichen";
import { KonzBlattAnsicht } from "@/components/aufgaben/KonzBlattAnsicht";
import { LektionsRahmen, SchrittSelbstcheck, StufenErgebnisAnzeige, Uhr, useCountdown } from "./gemeinsam";
import { heute } from "@/lib/datum";
import { neuerSeed } from "@/lib/zufall";
import { ton } from "@/lib/ton";
import { XP } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/** Stufen: Zeilen, Zeichen pro Zeile, Sekunden (0 = ohne Zeit), Rückmeldung */
const KONZ_PLAN: Array<{ zeilen: number; spalten: number; sekunden: number; rueckmeldung: "sofort" | "zeile" | "ende" }> = [
  { zeilen: 0, spalten: 0, sekunden: 0, rueckmeldung: "ende" },
  { zeilen: 1, spalten: 20, sekunden: 0, rueckmeldung: "sofort" }, // 2 Vormachen
  { zeilen: 0, spalten: 0, sekunden: 0, rueckmeldung: "sofort" }, // 3 Einzelentscheide
  { zeilen: 3, spalten: 20, sekunden: 0, rueckmeldung: "sofort" },
  { zeilen: 5, spalten: 40, sekunden: 0, rueckmeldung: "zeile" },
  { zeilen: 10, spalten: 40, sekunden: 120, rueckmeldung: "ende" },
  { zeilen: 20, spalten: 40, sekunden: 240, rueckmeldung: "ende" },
  { zeilen: 40, spalten: 40, sekunden: 480, rueckmeldung: "ende" },
];

export function KonzLektion({ einheit, stufe, planId }: { einheit: Einheit; stufe: number; planId?: string }) {
  const store = useSpeicher();
  const stand = usePlanStand();
  const [params] = useSearchParams();
  const methode = einheit.methode;
  const [seed, setSeed] = useState(() => neuerSeed());
  const regelId = useMemo(() => params.get("regel") ?? naechsteKonzRegel(stand, heute()), [params, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const regel = konzRegel(regelId);
  const p = KONZ_PLAN[stufe - 1];
  const blatt = useMemo(() => (p.zeilen ? erzeugeBlatt(regelId, seed, p.zeilen, p.spalten) : null), [regelId, seed, p.zeilen, p.spalten]);
  const entscheide = useMemo(() => (stufe === 3 ? entscheidAufgaben(regelId, seed, 16) : []), [regelId, seed, stufe]);

  const [phase, setPhase] = useState<"start" | "laufen" | "selbstcheck" | "ergebnis">("start");
  const [markiert, setMarkiert] = useState<boolean[][]>([]);
  const [zeileFertig, setZeileFertig] = useState(0);
  const [wertung, setWertung] = useState<KonzWertung | null>(null);
  const [ergebnis, setErgebnis] = useState<(StufenBewertung & { aufgestiegen: boolean; xp: number }) | null>(null);
  const [ent, setEnt] = useState<{ i: number; richtig: number; letzte: boolean | null }>({ i: 0, richtig: 0, letzte: null });
  const lektionStart = useRef(Date.now());

  const rest = useCountdown(p.sekunden, phase === "laufen" && p.sekunden > 0, () => {
    ton.zeit();
    void auswerten();
  });

  function toggle(r: number, c: number) {
    if (p.rueckmeldung === "zeile" && r < zeileFertig) return;
    setMarkiert((alt) => {
      const neu = alt.map((z) => [...z]);
      while (neu.length <= r) neu.push([]);
      neu[r][c] = !neu[r][c];
      return neu;
    });
    if (p.rueckmeldung === "sofort" && blatt) {
      const war = !!markiert[r]?.[c];
      if (!war) {
        if (blatt.ziele[r][c]) ton.tipp();
        else ton.falsch();
      }
    }
  }

  async function auswerten() {
    if (!blatt) return;
    const w = bewerten(blatt, markiert);
    setWertung(w);
    await versuchSpeichern(store, {
      gruppe: "konz",
      quelle: "konz",
      methodeId: methode.id,
      stufe,
      generator: "konz",
      seed: `${regelId}:${seed}`,
      antwort: w.rohwert,
      loesung: blatt.ziele.flat().filter(Boolean).length,
      richtig: w.falsch + w.uebersehen <= Math.max(1, w.richtig * 0.15),
      dauerMs: Date.now() - lektionStart.current,
      zielMs: p.sekunden * 1000,
    });
    if (w.falsch + w.uebersehen > 0 && stufe >= 6)
      await fehlerEintragen(store, {
        gruppe: "konz",
        methodeId: methode.id,
        schritt: w.uebersehen > w.falsch ? 2 : 1,
        ursache: w.uebersehen > w.falsch ? "fluechtigkeit" : "denkfehler",
        denkfehler: `${regel.titel}: ${w.falsch} falsch markiert, ${w.uebersehen} übersehen`,
        ref: { art: "generator", generator: "konz", seed: `${regelId}:${seed}`, schwierigkeit: stufe },
      });
    if (stufe >= 6) setPhase("selbstcheck");
    else void abschliessen(undefined, w);
  }

  async function abschliessen(anteil?: number, w = wertung, entscheidRichtig = ent.richtig) {
    let ergebnisse: StufenErgebnis[];
    if (stufe === 3) {
      ergebnisse = entscheide.map((_, k) => ({ zeit: Date.now(), richtig: k < entscheidRichtig, schritteOk: k < entscheidRichtig }));
    } else if (w) {
      const genau = w.richtig / Math.max(1, w.richtig + w.falsch + w.uebersehen);
      // Tempo: im Test ~10 Zielzeichen pro Zeile in 8 Min. für 40 Zeilen → Anteil bearbeiteter Zeichen
      const sollZeichen = p.sekunden ? (p.zeilen * p.spalten * 0.55) : 0;
      const imTempo = !p.sekunden || w.bearbeitet >= sollZeichen;
      const n = 10;
      ergebnisse = Array.from({ length: n }, (_, k) => ({
        zeit: Date.now(),
        richtig: k < Math.round(genau * n),
        schritteOk: anteil !== undefined ? anteil >= 0.8 : true,
        imTempo,
      }));
    } else ergebnisse = [];
    const r = await lektionAbschliessen(store, methode.id, stufe, ergebnisse, [], Math.max(1, Math.round((Date.now() - lektionStart.current) / 60000)), planId);
    setErgebnis({ ...r, xp: XP.lektion + (r.aufgestiegen ? XP.stufe : 0) });
    setPhase("ergebnis");
    ton.fertig();
  }

  function neu() {
    setSeed(neuerSeed());
    setPhase("start");
    setMarkiert([]);
    setZeileFertig(0);
    setWertung(null);
    setErgebnis(null);
    setEnt({ i: 0, richtig: 0, letzte: null });
  }

  const titel = `${methode.name} · Stufe ${stufe} «${STUFEN[stufe - 1].name}»`;

  if (phase === "ergebnis" && ergebnis)
    return (
      <StufenErgebnisAnzeige
        {...ergebnis}
        stufe={stufe}
        methodeId={methode.id}
        xp={ergebnis.xp}
        onNochmals={neu}
        extra={
          wertung && (
            <div className="w-full max-w-sm rounded-xl border-2 p-3 text-sm">
              <p>
                Rohwert <b>{wertung.rohwert}</b> = {wertung.richtig} richtig − {wertung.falsch} falsch − {wertung.uebersehen} übersehen
              </p>
              {stufe === 8 && (
                <p className="mt-1">
                  Punktwert ca. <b>{wertung.punktwert}</b> von 18 (Näherung mit der offiziellen Beispieltabelle {regel.tabelle})
                </p>
              )}
              <p className="mt-1 text-muted-foreground">{wertung.bearbeitet} Zeichen bearbeitet</p>
            </div>
          )
        }
      />
    );

  if (phase === "selbstcheck")
    return (
      <LektionsRahmen titel={titel} fortschritt={1}>
        {blatt && <KonzBlattAnsicht blatt={blatt} markiert={markiert} gesperrt aufgedeckt zeilen={Math.min(blatt.zeilen.length, (wertung?.letzte?.zeile ?? 0) + 1)} />}
        <SchrittSelbstcheck methode={methode} onFertig={(a) => void abschliessen(a)} />
      </LektionsRahmen>
    );

  const anweisung = (
    <div className="rounded-xl border-2 border-gold/50 bg-gold/10 p-3 text-sm">
      <p className="text-xs font-extrabold uppercase text-muted-foreground">Neue Regel · {regel.titel}</p>
      <p className="font-semibold">{regel.anweisung}</p>
    </div>
  );

  if (phase === "start")
    return (
      <LektionsRahmen
        titel={titel}
        untertitel={STUFEN[stufe - 1].beschreibung}
        fortschritt={0}
        fuss={
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setPhase("laufen");
              lektionStart.current = Date.now();
            }}
          >
            Los
          </Button>
        }
      >
        {anweisung}
        <ul className="list-disc pl-5 text-sm">
          {stufe >= 6 && <li>Zeit: {p.sekunden / 60} Minuten für {p.zeilen} Zeilen. Gewertet wird bis zur letzten Markierung.</li>}
          <li>Zeilenweise arbeiten, nicht springen. Lieber sauber als hastig: Fehler und übersehene Zeichen kosten je einen Punkt.</li>
          <li>Antippen = durchstreichen, nochmals antippen = zurücknehmen.</li>
        </ul>
      </LektionsRahmen>
    );

  /* Stufe 3: Ja/Nein-Entscheide */
  if (stufe === 3) {
    const e = entscheide[ent.i];
    const antwort = (ja: boolean) => {
      const ok = ja === e.ziel;
      if (ok) ton.richtig();
      else ton.falsch();
      const neu = { i: ent.i + 1, richtig: ent.richtig + (ok ? 1 : 0), letzte: ok };
      setEnt(neu);
      if (neu.i >= entscheide.length) void abschliessen(undefined, null, neu.richtig);
    };
    if (!e) return null;
    return (
      <LektionsRahmen titel={titel} untertitel="Ziel oder nicht? Schnell und sicher entscheiden." fortschritt={ent.i / entscheide.length}>
        {anweisung}
        <div className="flex items-center justify-center gap-3 py-4">
          <KonzZeichen zelle={e.zelle} className="h-24 w-24 rounded-lg border-2 border-primary bg-card" />
          {e.naechste && (
            <>
              <span className="text-2xl text-muted-foreground">→</span>
              <KonzZeichen zelle={e.naechste} className="h-24 w-24 rounded-lg border-2 bg-card opacity-80" />
            </>
          )}
        </div>
        {e.naechste && <p className="text-center text-xs text-muted-foreground">Entscheide für das umrandete Zeichen (rechts das folgende).</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="outline" onClick={() => antwort(false)}>
            Nicht markieren
          </Button>
          <Button size="lg" onClick={() => antwort(true)}>
            Markieren
          </Button>
        </div>
        {ent.letzte !== null && (
          <p className={cn("flex items-center justify-center gap-1 text-sm font-bold", ent.letzte ? "text-richtig" : "text-falsch")}>
            {ent.letzte ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {ent.letzte ? "Richtig" : "Daneben"}
          </p>
        )}
      </LektionsRahmen>
    );
  }

  if (!blatt) return null;
  const aufgedeckt = stufe === 2 || p.rueckmeldung === "sofort";
  return (
    <LektionsRahmen
      titel={titel}
      fortschritt={p.rueckmeldung === "zeile" ? zeileFertig / blatt.zeilen.length : 0.5}
      rechts={p.sekunden ? <Uhr sekunden={rest} /> : undefined}
      fuss={
        p.rueckmeldung === "zeile" && zeileFertig < blatt.zeilen.length ? (
          <Button size="lg" className="w-full" onClick={() => setZeileFertig((z) => z + 1)}>
            Zeile {zeileFertig + 1} fertig – prüfen
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => void auswerten()}>
            {stufe === 2 ? "Verstanden" : "Fertig"}
          </Button>
        )
      }
    >
      {anweisung}
      {stufe === 2 && <p className="text-sm">So sieht es aus: Die Ziele sind schon durchgestrichen. Geh Zeichen für Zeichen durch und prüf, warum.</p>}
      <KonzBlattAnsicht
        blatt={blatt}
        markiert={stufe === 2 ? blatt.ziele : markiert}
        onToggle={stufe === 2 ? undefined : toggle}
        gesperrt={stufe === 2}
        aufgedeckt={aufgedeckt && stufe !== 2 ? true : false}
        zeilen={p.rueckmeldung === "zeile" ? Math.min(blatt.zeilen.length, zeileFertig + 1) : undefined}
      />
      {p.rueckmeldung === "zeile" && zeileFertig > 0 && (
        <p className="text-xs text-muted-foreground">Geprüfte Zeilen: grün richtig, rot falsch, gelb übersehen.</p>
      )}
    </LektionsRahmen>
  );
}
