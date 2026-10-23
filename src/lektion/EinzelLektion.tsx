import { useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Eye, Flag, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Aufgabe, SchrittDrill } from "@/aufgaben/typen";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { aufgabenErzeugen, gesperrteSchluessel, istEinzel } from "@/aufgaben/register";
import { TEXT_BANK, textAufgaben, type TextAufgabeDaten } from "@/aufgaben/bank";
import type { Einheit } from "@/lernpfad/einheiten";
import type { Fehlerursache, Meldung, StufenErgebnis } from "@/daten/modelle";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { fehlerEintragen, lektionAbschliessen, versuchSpeichern, type StufenBewertung } from "@/lernpfad/protokoll";
import { STUFEN } from "@/content/stufen";
import { Button } from "@/components/ui/button";
import { LeseText, Optionen, Stimulus } from "@/components/aufgaben/AufgabeAnsicht";
import { AufgabeMelden } from "@/components/aufgaben/AufgabeMelden";
import { FehlerAnalyse, LektionsRahmen, SchrittSelbstcheck, StufenErgebnisAnzeige, Uhr, useCountdown } from "./gemeinsam";
import { neuerSeed, Zufall } from "@/lib/zufall";
import { ton } from "@/lib/ton";
import { XP } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const ANZAHL: Record<"klein" | "gross", number[]> = {
  //       1  2  3   4  5  6  7   8
  klein: [0, 2, 10, 4, 5, 8, 10, 10],
  gross: [0, 1, 8, 3, 4, 5, 6, 9],
};

function schwierigkeitFuer(stufe: number): number {
  return stufe <= 3 ? 2 : stufe <= 6 ? 3 : 4;
}

/* ------------------------------------------------------------------ Drill */

function DrillKarte({ drill, methodeName, onFertig, schrittTitel }: { drill: SchrittDrill; methodeName: string; schrittTitel?: string; onFertig: (richtig: boolean) => void }) {
  const [wahl, setWahl] = useState<number | null>(null);
  const aufgedeckt = wahl !== null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-info/40 bg-info/5 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-info">
        {methodeName} · Schritt {drill.schritt}
        {schrittTitel ? ` «${schrittTitel}»` : ""}
      </p>
      <p className="font-bold">{drill.frage}</p>
      <div className="flex flex-col gap-1.5">
        {drill.optionen.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={aufgedeckt}
            onClick={() => {
              setWahl(i);
              if (i === drill.loesung) ton.richtig();
              else ton.falsch();
            }}
            className={cn(
              "rounded-lg border-2 bg-card p-2.5 text-left text-sm",
              aufgedeckt && i === drill.loesung && "border-richtig bg-richtig/10",
              aufgedeckt && i === wahl && i !== drill.loesung && "border-falsch bg-falsch/10",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {aufgedeckt && (
        <>
          <p className="text-sm">
            {wahl === drill.loesung ? <CheckCircle2 className="mr-1 inline h-4 w-4 text-richtig" /> : <XCircle className="mr-1 inline h-4 w-4 text-falsch" />}
            {drill.erklaerung}
          </p>
          <Button onClick={() => onFertig(wahl === drill.loesung)} className="self-end">
            Weiter <ChevronRight />
          </Button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Lektion */

interface Props {
  einheit: Einheit;
  stufe: number;
  planId?: string;
}

interface Antwort {
  wahl: number | null;
  dauerMs: number;
  schritteOk: boolean;
  schrittFehler: number[];
  fehlerId?: string;
  ursache: Fehlerursache;
}

export function EinzelLektion({ einheit, stufe, planId }: Props) {
  const store = useSpeicher();
  const methode = einheit.methode;
  const [runde, setRunde] = useState(() => neuerSeed());
  const text = einheit.format === "text";
  const meldungen = useSammlung<Meldung>("meldungen");
  // nur beim Start einer Runde lesen, damit eine Meldung die laufende Lektion nicht umwirft
  const gesperrt = useMemo(() => gesperrteSchluessel(meldungen), [runde]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aufgaben einmal pro Runde erzeugen
  const { aufgaben, lesetext } = useMemo(() => {
    if (text) {
      const z = new Zufall(runde);
      const t = TEXT_BANK.length ? z.waehle(TEXT_BANK) : undefined;
      const alle = t ? textAufgaben(t, `${t.id}`, methode.id) : [];
      return { aufgaben: stufe === 2 ? alle.slice(0, 2) : alle, lesetext: t };
    }
    if (!istEinzel(einheit.generator)) return { aufgaben: [], lesetext: undefined };
    const anzahl = ANZAHL[einheit.art === "klein" ? "klein" : "gross"][stufe - 1] || 4;
    const n = stufe === 3 ? Math.ceil(anzahl / 2) : anzahl;
    return { aufgaben: aufgabenErzeugen(einheit.generator, n, schwierigkeitFuer(stufe), methode.id, runde, gesperrt), lesetext: undefined };
  }, [runde, einheit, stufe, methode.id, text, gesperrt]);

  // Stufe 3: Drills über mehrere Aufgaben
  const drills = useMemo(() => {
    if (stufe !== 3) return [];
    const z = new Zufall(`${runde}:drills`);
    const ziel = ANZAHL[einheit.art === "klein" ? "klein" : "gross"][2];
    return z.mischen(aufgaben.flatMap((a) => a.drills.map((d) => ({ a, d })))).slice(0, ziel);
  }, [aufgaben, stufe, runde, einheit.art]);

  const ernstfall = stufe === 8;
  const gesamtSekunden = ernstfall ? (text ? 15 * 60 : aufgaben.reduce((s, a) => s + a.zielSekunden, 0)) : 0;

  const [i, setI] = useState(0);
  const [antworten, setAntworten] = useState<Record<number, Antwort>>({});
  const [wahl, setWahl] = useState<number | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillFehler, setDrillFehler] = useState<number[]>([]);
  const [hilfe, setHilfe] = useState(false);
  const [vormachSchritt, setVormachSchritt] = useState(0);
  const [extraDrill, setExtraDrill] = useState<SchrittDrill | null>(null);
  const [phase, setPhase] = useState<"laufen" | "selbstcheck" | "ergebnis">("laufen");
  const [ergebnis, setErgebnis] = useState<(StufenBewertung & { aufgestiegen: boolean; xp: number }) | null>(null);
  const [ernstWahl, setErnstWahl] = useState<Record<number, number | null>>({});
  const ernstZeiten = useRef<Record<number, number>>({});
  const start = useRef(Date.now());
  const lektionStart = useRef(Date.now());

  const restGesamt = useCountdown(gesamtSekunden, ernstfall && phase === "laufen", () => {
    toast("Zeit ist um!");
    ton.zeit();
    void ernstfallAbgeben();
  });
  const a: Aufgabe | undefined = aufgaben[i];
  const tempo = stufe === 7;
  const restAufgabe = useCountdown(a?.zielSekunden ?? 0, tempo && !aufgedeckt && phase === "laufen");

  if (aufgaben.length === 0)
    return <p className="rounded-xl border-2 p-4 text-sm">Für diese Einheit sind gerade keine Aufgaben verfügbar.</p>;

  // Geführte Schritte: Stufe 4 alle Drills, Stufe 5 ausblendend
  const gefuehrteDrills = !a ? [] : stufe === 4 ? a.drills : stufe === 5 ? a.drills.slice(0, Math.max(0, a.drills.length - i)) : [];
  const inSchritten = (stufe === 4 || stufe === 5) && drillIndex < gefuehrteDrills.length;

  function neuStarten() {
    setRunde(neuerSeed());
    setI(0);
    setAntworten({});
    setWahl(null);
    setAufgedeckt(false);
    setDrillIndex(0);
    setDrillFehler([]);
    setVormachSchritt(0);
    setPhase("laufen");
    setErgebnis(null);
    setErnstWahl({});
    ernstZeiten.current = {};
    start.current = Date.now();
    lektionStart.current = Date.now();
  }

  async function antwortSpeichern(idx: number, w: number | null, extra: Partial<Antwort> = {}) {
    const auf = aufgaben[idx];
    const dauerMs = Date.now() - start.current;
    const richtig = w === auf.loesung;
    const opt = w !== null ? auf.optionen[w] : undefined;
    const schrittFehler = [...(extra.schrittFehler ?? []), ...(!richtig && opt?.schritt ? [opt.schritt] : [])];
    const ursache: Fehlerursache = w === null ? "zeitnot" : opt?.schritt ? "methodenschritt" : "denkfehler";
    const eintrag: Antwort = { wahl: w, dauerMs, schritteOk: extra.schritteOk ?? true, schrittFehler, ursache };
    await versuchSpeichern(store, {
      gruppe: einheit.gruppe,
      quelle: "lektion",
      methodeId: methode.id,
      stufe,
      generator: auf.generator,
      seed: auf.seed,
      schwierigkeit: auf.schwierigkeit,
      antwort: w,
      loesung: auf.loesung,
      richtig,
      dauerMs,
      zielMs: auf.zielSekunden * 1000,
      schrittFehler,
      denkfehler: opt?.denkfehler,
    });
    if (!richtig && stufe >= 3) {
      eintrag.fehlerId = await fehlerEintragen(store, {
        gruppe: einheit.gruppe,
        methodeId: methode.id,
        schritt: opt?.schritt,
        ursache,
        denkfehler: opt?.denkfehler,
        ref: { art: "generator", generator: auf.generator, seed: auf.seed, schwierigkeit: auf.schwierigkeit },
      });
    }
    setAntworten((alt) => ({ ...alt, [idx]: eintrag }));
    return eintrag;
  }

  async function ursacheAendern(idx: number, u: Fehlerursache) {
    const e = antworten[idx];
    if (!e) return;
    setAntworten((alt) => ({ ...alt, [idx]: { ...e, ursache: u } }));
    if (e.fehlerId) await store.aendern("fehlerheft", e.fehlerId, { ursache: u });
  }

  async function pruefen() {
    if (!a) return;
    const richtig = wahl === a.loesung;
    if (richtig) ton.richtig();
    else ton.falsch();
    setAufgedeckt(true);
    await antwortSpeichern(i, wahl, {
      schritteOk: drillFehler.length === 0 && !hilfe,
      schrittFehler: drillFehler,
    });
  }

  function naechste() {
    setWahl(null);
    setAufgedeckt(false);
    setDrillIndex(0);
    setDrillFehler([]);
    setHilfe(false);
    setVormachSchritt(0);
    setExtraDrill(null);
    start.current = Date.now();
    if (i + 1 < aufgaben.length) setI(i + 1);
    else if (stufe >= 6) setPhase("selbstcheck");
    else void abschliessen();
  }

  async function abschliessen(schrittAnteil?: number, liste = antworten) {
    const ergebnisse: StufenErgebnis[] =
      stufe === 3
        ? Object.values(liste).map((e) => ({ zeit: Date.now(), richtig: e.wahl === 1, schritteOk: e.wahl === 1 }))
        : aufgaben.map((auf, k) => {
            const e = liste[k];
            return {
              zeit: Date.now(),
              richtig: e?.wahl === auf.loesung,
              schritteOk: schrittAnteil !== undefined ? schrittAnteil >= 0.8 : (e?.schritteOk ?? false),
              imTempo: e ? e.dauerMs <= auf.zielSekunden * 1000 * 1.1 : false,
            };
          });
    const alleSchritte = Object.values(liste).flatMap((e) => e.schrittFehler);
    const minuten = Math.max(1, Math.round((Date.now() - lektionStart.current) / 60000));
    const r = await lektionAbschliessen(store, methode.id, stufe, ergebnisse, alleSchritte, minuten, planId);
    const richtigAnzahl = ergebnisse.filter((x) => x.richtig).length;
    setErgebnis({ ...r, xp: XP.lektion + (r.aufgestiegen ? XP.stufe : 0) + (stufe === 3 ? 0 : richtigAnzahl * XP.richtig) });
    setPhase("ergebnis");
    ton.fertig();
  }

  // Ernstfall: Antworten wurden oben gesammelt, hier auswerten
  async function ernstfallAbgeben() {
    if (phase !== "laufen") return;
    const liste: Record<number, Antwort> = {};
    for (let k = 0; k < aufgaben.length; k++) {
      start.current = Date.now() - (ernstZeiten.current[k] ?? 0);
      liste[k] = await antwortSpeichern(k, ernstWahl[k] ?? null);
    }
    setAntworten(liste);
    setPhase("selbstcheck");
  }

  /* ---------------- Ergebnis */
  if (phase === "ergebnis" && ergebnis) {
    const falsche = aufgaben.map((auf, k) => ({ auf, k, e: antworten[k] })).filter(({ auf, e }) => e && e.wahl !== auf.loesung);
    return (
      <div className="flex flex-col gap-4">
        <StufenErgebnisAnzeige {...ergebnis} stufe={stufe} methodeId={methode.id} xp={ergebnis.xp} onNochmals={neuStarten} />
        {ernstfall && falsche.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-extrabold">Fehleranalyse</h3>
            {falsche.map(({ auf, k, e }) => (
              <div key={k} className="flex flex-col gap-2 rounded-xl border-2 p-3">
                <p className="text-sm font-bold">
                  Aufgabe {k + 1}: {e!.wahl === null ? "leer" : BUCHSTABEN[e!.wahl]} statt {BUCHSTABEN[auf.loesung]}
                </p>
                <FehlerAnalyse option={e!.wahl !== null ? auf.optionen[e!.wahl] : undefined} methode={methode} ursache={e!.ursache} onUrsache={(u) => void ursacheAendern(k, u)} />
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">Lösungsweg</summary>
                  <ol className="mt-1 list-decimal pl-5">
                    {auf.loesungsweg.map((s, j) => (
                      <li key={j}>{s.text}</li>
                    ))}
                  </ol>
                </details>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  /* ---------------- Selbstcheck */
  if (phase === "selbstcheck")
    return (
      <LektionsRahmen titel={`${methode.name} · Stufe ${stufe} «${STUFEN[stufe - 1].name}»`} fortschritt={1}>
        <SchrittSelbstcheck methode={methode} onFertig={(anteil) => void abschliessen(anteil)} />
      </LektionsRahmen>
    );

  const titel = `${methode.name} · Stufe ${stufe} «${STUFEN[stufe - 1].name}»`;

  /* ---------------- Stufe 3: Einzelschritte */
  if (stufe === 3) {
    const aktuell = drills[i];
    if (!aktuell) return null;
    const schritt = methode.schritte.find((s) => s.nr === aktuell.d.schritt);
    return (
      <LektionsRahmen titel={titel} untertitel={STUFEN[2].beschreibung} fortschritt={i / drills.length}>
        {text && lesetext ? <LeseText titel={lesetext.titel} absaetze={lesetext.absaetze} /> : <Stimulus aufgabe={aktuell.a} lernmodus />}
        {text && <p className="font-bold">{aktuell.a.frage}</p>}
        <DrillKarte
          key={i}
          drill={aktuell.d}
          methodeName={methode.name}
          schrittTitel={schritt?.titel}
          onFertig={(ok) => {
            const neu = { ...antworten, [i]: { wahl: ok ? 1 : 0, dauerMs: 0, schritteOk: ok, schrittFehler: ok ? [] : [aktuell.d.schritt], ursache: "methodenschritt" as const } };
            setAntworten(neu);
            if (i + 1 < drills.length) setI(i + 1);
            else void abschliessen(undefined, neu);
          }}
        />
      </LektionsRahmen>
    );
  }

  if (!a) return null;

  /* ---------------- Stufe 8: Ernstfall */
  if (ernstfall) {
    return (
      <LektionsRahmen
        titel={titel}
        untertitel="Testbedingungen: Originalzeit, keine Hilfen, Auswertung erst am Schluss."
        fortschritt={i / aufgaben.length}
        rechts={<Uhr sekunden={restGesamt} />}
        fuss={
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Aufgabe {i + 1} von {aufgaben.length}
            </span>
            {i + 1 < aufgaben.length ? (
              <Button
                onClick={() => {
                  ernstZeiten.current[i] = (ernstZeiten.current[i] ?? 0) + (Date.now() - start.current);
                  start.current = Date.now();
                  setI(i + 1);
                }}
              >
                Nächste <ChevronRight />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  ernstZeiten.current[i] = (ernstZeiten.current[i] ?? 0) + (Date.now() - start.current);
                  void ernstfallAbgeben();
                }}
              >
                <Flag /> Abgeben
              </Button>
            )}
          </div>
        }
      >
        {text && lesetext && <LeseText titel={lesetext.titel} absaetze={lesetext.absaetze} />}
        <Stimulus aufgabe={a} />
        <p className="font-bold">{a.frage}</p>
        <Optionen aufgabe={a} gewaehlt={ernstWahl[i] ?? null} aufgedeckt={false} onWahl={(w) => setErnstWahl((x) => ({ ...x, [i]: w }))} />
        {einheit.art === "klein" && <p className="text-xs text-muted-foreground">Zurückblättern gibt es nicht – im Zweifel ankreuzen und weiter.</p>}
      </LektionsRahmen>
    );
  }

  /* ---------------- Stufe 2: Vormachen */
  if (stufe === 2) {
    const weg = a.loesungsweg;
    const fertig = vormachSchritt >= weg.length;
    const hervor = text ? (a.daten as TextAufgabeDaten).absatz : undefined;
    return (
      <LektionsRahmen
        titel={titel}
        untertitel="Munggi löst vor – Schritt für Schritt."
        fortschritt={(i + vormachSchritt / Math.max(1, weg.length + 1)) / aufgaben.length}
        fuss={
          fertig ? (
            <Button size="lg" className="w-full" onClick={naechste}>
              {i + 1 < aufgaben.length ? "Nächstes Beispiel" : "Abschliessen"}
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={() => setVormachSchritt((s) => s + 1)}>
              <Eye /> Nächster Schritt
            </Button>
          )
        }
      >
        {text && lesetext && <LeseText titel={lesetext.titel} absaetze={lesetext.absaetze} hervorheben={fertig ? hervor : undefined} />}
        <Stimulus aufgabe={a} lernmodus />
        <p className="font-bold">{a.frage}</p>
        <ol className="flex flex-col gap-2">
          {weg.slice(0, vormachSchritt).map((s, k) => {
            const ms = methode.schritte.find((x) => x.nr === s.schritt);
            return (
              <li key={k} className="rounded-xl border-2 border-info/40 bg-info/5 p-3 text-sm">
                <p className="text-xs font-extrabold uppercase text-info">
                  Schritt {s.schritt}
                  {ms ? ` «${ms.titel}»` : ""}
                </p>
                {s.text}
              </li>
            );
          })}
        </ol>
        {fertig && <Optionen aufgabe={a} gewaehlt={a.loesung} aufgedeckt onWahl={() => {}} />}
      </LektionsRahmen>
    );
  }

  /* ---------------- Stufen 4–7 */
  const gewaehltOption = wahl !== null ? a.optionen[wahl] : undefined;
  const antwortEintrag = antworten[i];
  const zeigeMethode = stufe <= 5 || (aufgedeckt && wahl !== a.loesung);
  return (
    <LektionsRahmen
      titel={titel}
      untertitel={STUFEN[stufe - 1].beschreibung}
      fortschritt={i / aufgaben.length}
      rechts={tempo ? <Uhr sekunden={restAufgabe} warnung={10} /> : undefined}
      fuss={
        inSchritten ? undefined : aufgedeckt ? (
          <Button size="lg" className="w-full" onClick={naechste}>
            Weiter <ChevronRight />
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={wahl === null} onClick={() => void pruefen()}>
            Prüfen
          </Button>
        )
      }
    >
      {text && lesetext && <LeseText titel={lesetext.titel} absaetze={lesetext.absaetze} hervorheben={aufgedeckt ? (a.daten as TextAufgabeDaten).absatz : undefined} />}
      <Stimulus aufgabe={a} lernmodus={stufe <= 5} kreuz={methode.id === "kreuzblick" && stufe <= 5} />
      <p className="font-bold">{a.frage}</p>

      {inSchritten ? (
        <DrillKarte
          key={`${i}:${drillIndex}`}
          drill={gefuehrteDrills[drillIndex]}
          methodeName={methode.name}
          schrittTitel={methode.schritte.find((s) => s.nr === gefuehrteDrills[drillIndex].schritt)?.titel}
          onFertig={(ok) => {
            if (!ok) setDrillFehler((f) => [...f, gefuehrteDrills[drillIndex].schritt]);
            setDrillIndex((d) => d + 1);
          }}
        />
      ) : (
        <>
          <Optionen aufgabe={a} gewaehlt={wahl} aufgedeckt={aufgedeckt} onWahl={setWahl} />
          {stufe === 5 && !aufgedeckt && !hilfe && (
            <button type="button" onClick={() => setHilfe(true)} className="self-start text-sm font-semibold text-info underline-offset-2 hover:underline">
              Methode einblenden
            </button>
          )}
          {stufe === 5 && hilfe && !aufgedeckt && (
            <ol className="list-decimal rounded-xl bg-muted p-3 pl-7 text-sm">
              {methode.schritte.map((s) => (
                <li key={s.nr}>
                  <b>{s.titel}:</b> {s.tun}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {aufgedeckt && (
        <div className="flex flex-col gap-3">
          {wahl === a.loesung ? (
            <p className="flex items-center gap-2 font-bold text-richtig">
              <CheckCircle2 className="h-5 w-5" /> Richtig{tempo && antwortEintrag && antwortEintrag.dauerMs > a.zielSekunden * 1000 ? " – aber zu langsam" : "!"}
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-bold text-falsch">
                <XCircle className="h-5 w-5" /> Richtig wäre {BUCHSTABEN[a.loesung]}.
              </p>
              {zeigeMethode && antwortEintrag && (
                <FehlerAnalyse
                  option={gewaehltOption}
                  methode={methode}
                  ursache={antwortEintrag.ursache}
                  onUrsache={(u) => void ursacheAendern(i, u)}
                  onDrill={() => setExtraDrill(a.drills.find((d) => d.schritt === gewaehltOption?.schritt) ?? a.drills[0] ?? null)}
                />
              )}
              {extraDrill && <DrillKarte drill={extraDrill} methodeName={methode.name} onFertig={() => setExtraDrill(null)} />}
            </>
          )}
          <details className="rounded-xl border-2 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Lösungsweg</summary>
            <ol className="mt-2 flex flex-col gap-1">
              {a.loesungsweg.map((s, k) => (
                <li key={k}>
                  <b>Schritt {s.schritt}:</b> {s.text}
                </li>
              ))}
            </ol>
          </details>
          <AufgabeMelden aufgabe={a} />
        </div>
      )}
    </LektionsRahmen>
  );
}
