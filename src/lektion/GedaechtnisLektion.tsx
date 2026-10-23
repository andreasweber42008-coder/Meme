import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, Lock, XCircle } from "lucide-react";
import { erzeugeFigurenSet, figurenDenkfehler } from "@/aufgaben/figuren";
import { erzeugeFaktenSet, fallText } from "@/aufgaben/fakten";
import { ABRUF_PAUSE_MIN, type Einheit } from "@/lernpfad/einheiten";
import type { Fehlerursache, StufenErgebnis } from "@/daten/modelle";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { fehlerEintragen, lektionAbschliessen, versuchSpeichern, type StufenBewertung } from "@/lernpfad/protokoll";
import { STUFEN } from "@/content/stufen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { FehlerAnalyse, LektionsRahmen, SchrittSelbstcheck, StufenErgebnisAnzeige, Uhr, useCountdown, zeitText } from "./gemeinsam";
import { neuerSeed } from "@/lib/zufall";
import { ton } from "@/lib/ton";
import { XP } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface Plan {
  anzahl: number; // Figuren bzw. Fakten-Gruppen
  fragen: number;
  einpraegen: number; // Sekunden
  abruf: number; // Sekunden
  notizen: "pflicht" | "optional" | "keine";
  spaeter: boolean; // Abruf erst nach einer Pause (≥ 10 Min.)
}

const PLAENE: Record<"figuren" | "fakten", Plan[]> = {
  figuren: [
    { anzahl: 3, fragen: 3, einpraegen: 0, abruf: 0, notizen: "keine", spaeter: false },
    { anzahl: 3, fragen: 3, einpraegen: 0, abruf: 0, notizen: "keine", spaeter: false }, // 2 Vormachen
    { anzahl: 6, fragen: 6, einpraegen: 90, abruf: 0, notizen: "pflicht", spaeter: false },
    { anzahl: 8, fragen: 8, einpraegen: 120, abruf: 0, notizen: "pflicht", spaeter: false },
    { anzahl: 12, fragen: 12, einpraegen: 180, abruf: 0, notizen: "optional", spaeter: false },
    { anzahl: 18, fragen: 18, einpraegen: 240, abruf: 0, notizen: "keine", spaeter: true },
    { anzahl: 18, fragen: 18, einpraegen: 240, abruf: 300, notizen: "keine", spaeter: true },
    { anzahl: 18, fragen: 18, einpraegen: 240, abruf: 300, notizen: "keine", spaeter: true },
  ],
  fakten: [
    { anzahl: 1, fragen: 3, einpraegen: 0, abruf: 0, notizen: "keine", spaeter: false },
    { anzahl: 1, fragen: 3, einpraegen: 0, abruf: 0, notizen: "keine", spaeter: false },
    { anzahl: 1, fragen: 4, einpraegen: 75, abruf: 0, notizen: "pflicht", spaeter: false },
    { anzahl: 2, fragen: 7, einpraegen: 150, abruf: 0, notizen: "pflicht", spaeter: false },
    { anzahl: 3, fragen: 10, einpraegen: 220, abruf: 0, notizen: "optional", spaeter: false },
    { anzahl: 5, fragen: 18, einpraegen: 360, abruf: 0, notizen: "keine", spaeter: true },
    { anzahl: 5, fragen: 18, einpraegen: 360, abruf: 360, notizen: "keine", spaeter: true },
    { anzahl: 5, fragen: 18, einpraegen: 360, abruf: 360, notizen: "keine", spaeter: true },
  ],
};


interface Offen {
  seed: string;
  stufe: number;
  eingepraegtAm: number;
}

interface Frage {
  text: string;
  optionen: string[];
  loesung: number;
  denkfehler: (wahl: number) => { text: string; schritt: number } | undefined;
}

export function GedaechtnisLektion({ einheit, stufe, planId }: { einheit: Einheit; stufe: number; planId?: string }) {
  const store = useSpeicher();
  const methode = einheit.methode;
  const art = einheit.generator === "figuren" ? "figuren" : "fakten";
  const plan = PLAENE[art][stufe - 1];
  const offenId = `abruf:${methode.id}`;
  const offen = useDokument<Offen>("plan", offenId);
  const [seed, setSeed] = useState(() => (offen && offen.stufe === stufe ? offen.seed : neuerSeed()));
  const [phase, setPhase] = useState<"start" | "einpraegen" | "pause" | "warten" | "abruf" | "selbstcheck" | "ergebnis">(
    offen && offen.stufe === stufe ? "warten" : "start",
  );
  const [notizen, setNotizen] = useState<Record<number, string>>({});
  const [i, setI] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [antworten, setAntworten] = useState<Array<{ richtig: boolean; schritt?: number; fehlerId?: string; ursache: Fehlerursache }>>([]);
  const [ergebnis, setErgebnis] = useState<(StufenBewertung & { aufgestiegen: boolean; xp: number }) | null>(null);
  const start = useRef(Date.now());
  const lektionStart = useRef(Date.now());

  const figSet = useMemo(() => (art === "figuren" ? erzeugeFigurenSet(seed, plan.anzahl, stufe >= 6 ? 4 : 3) : null), [art, seed, plan.anzahl, stufe]);
  const fakSet = useMemo(() => (art === "fakten" ? erzeugeFaktenSet(seed, plan.anzahl, plan.fragen) : null), [art, seed, plan.anzahl, plan.fragen]);

  const fragen: Frage[] = useMemo(() => {
    if (figSet)
      return figSet.abfrage.slice(0, plan.fragen).map((idx) => ({
        text: "Welche Fläche war schwarz?",
        optionen: ["A", "B", "C", "D", "E"],
        loesung: figSet.figuren[idx].schwarz,
        denkfehler: (w: number) => figurenDenkfehler(figSet, idx, w),
      }));
    if (fakSet)
      return fakSet.fragen.map((q) => ({ text: q.frage, optionen: q.optionen, loesung: q.loesung, denkfehler: (w: number) => q.denkfehler[w] ?? undefined }));
    return [];
  }, [figSet, fakSet, plan.fragen]);

  const restEinpraegen = useCountdown(plan.einpraegen, phase === "einpraegen" && plan.einpraegen > 0, () => {
    ton.zeit();
    weiterNachEinpraegen();
  });
  const restAbruf = useCountdown(plan.abruf, phase === "abruf" && plan.abruf > 0, () => {
    ton.zeit();
    void abrufBeenden(true);
  });
  const restPause = useCountdown(30, phase === "pause", () => setPhase("abruf"));
  const wartenBis = (offen?.eingepraegtAm ?? 0) + ABRUF_PAUSE_MIN * 60_000;
  const [, tick] = useState(0);
  useCountdown(60 * ABRUF_PAUSE_MIN, phase === "warten", () => tick((n) => n + 1));

  function weiterNachEinpraegen() {
    if (plan.spaeter) {
      void store.speichern<Offen>("plan", offenId, { seed, stufe, eingepraegtAm: Date.now() });
      setPhase("warten");
    } else if (stufe >= 3) setPhase("pause");
    else setPhase("abruf");
    start.current = Date.now();
  }

  async function antworten_() {
    const f = fragen[i];
    const richtig = wahl === f.loesung;
    if (richtig) ton.richtig();
    else ton.falsch();
    setAufgedeckt(true);
    const df = wahl !== null && !richtig ? f.denkfehler(wahl) : undefined;
    await versuchSpeichern(store, {
      gruppe: einheit.gruppe,
      quelle: "lektion",
      methodeId: methode.id,
      stufe,
      generator: art,
      seed: `${seed}:${i}`,
      schwierigkeit: stufe >= 6 ? 4 : 3,
      antwort: wahl,
      loesung: f.loesung,
      richtig,
      dauerMs: Date.now() - start.current,
      schrittFehler: df ? [df.schritt] : [],
      denkfehler: df?.text,
    });
    let fehlerId: string | undefined;
    if (!richtig && stufe >= 3)
      fehlerId = await fehlerEintragen(store, {
        gruppe: einheit.gruppe,
        methodeId: methode.id,
        schritt: df?.schritt,
        ursache: "methodenschritt",
        denkfehler: df?.text,
        ref: { art: "generator", generator: art, seed: `${seed}:${i}`, schwierigkeit: 3 },
      });
    setAntworten((a) => [...a, { richtig, schritt: df?.schritt, fehlerId, ursache: "methodenschritt" }]);
  }

  async function abrufBeenden(zeitAus = false) {
    if (zeitAus) {
      // nicht beantwortete Fragen zählen falsch
      const fehlend = fragen.length - antworten.length;
      setAntworten((a) => [...a, ...Array.from({ length: fehlend }, () => ({ richtig: false, ursache: "zeitnot" as Fehlerursache }))]);
    }
    await store.loeschen("plan", offenId);
    if (stufe >= 6) setPhase("selbstcheck");
    else void abschliessen();
  }

  async function abschliessen(anteil?: number) {
    const ergebnisse: StufenErgebnis[] = antworten.map((a) => ({ zeit: Date.now(), richtig: a.richtig, schritteOk: anteil !== undefined ? anteil >= 0.8 : notizenOk() }));
    while (ergebnisse.length < fragen.length) ergebnisse.push({ zeit: Date.now(), richtig: false, schritteOk: false });
    const r = await lektionAbschliessen(
      store,
      methode.id,
      stufe,
      ergebnisse,
      antworten.flatMap((a) => (a.schritt ? [a.schritt] : [])),
      Math.max(1, Math.round((Date.now() - lektionStart.current) / 60000)),
      planId,
    );
    setErgebnis({ ...r, xp: XP.lektion + (r.aufgestiegen ? XP.stufe : 0) + ergebnisse.filter((e) => e.richtig).length * XP.richtig });
    setPhase("ergebnis");
    ton.fertig();
  }

  function notizenOk() {
    if (plan.notizen !== "pflicht") return true;
    const n = art === "figuren" ? plan.anzahl : plan.anzahl * 3;
    return Object.values(notizen).filter((t) => t.trim().length >= 2).length >= n * 0.8;
  }

  function neu() {
    setSeed(neuerSeed());
    setPhase("start");
    setNotizen({});
    setI(0);
    setWahl(null);
    setAufgedeckt(false);
    setAntworten([]);
    setErgebnis(null);
    lektionStart.current = Date.now();
  }

  const titel = `${methode.name} · Stufe ${stufe} «${STUFEN[stufe - 1].name}»`;
  const schritt1 = methode.schritte.find((s) => s.nr === (art === "figuren" ? 1 : 5));

  /* ---------------- Ergebnis */
  if (phase === "ergebnis" && ergebnis) return <StufenErgebnisAnzeige {...ergebnis} stufe={stufe} methodeId={methode.id} xp={ergebnis.xp} onNochmals={neu} />;

  if (phase === "selbstcheck")
    return (
      <LektionsRahmen titel={titel} fortschritt={1}>
        <SchrittSelbstcheck methode={methode} onFertig={(a) => void abschliessen(a)} />
      </LektionsRahmen>
    );

  /* ---------------- Start */
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
              setPhase("einpraegen");
              lektionStart.current = Date.now();
            }}
          >
            {stufe === 2 ? "Beispiel ansehen" : "Einprägen starten"}
          </Button>
        }
      >
        <div className="flex flex-col gap-2 rounded-xl border-2 p-4 text-sm">
          <p>
            <b>{art === "figuren" ? `${plan.anzahl} Figuren` : `${plan.anzahl * 3} Fälle in ${plan.anzahl} Dreiergruppen`}</b>
            {plan.einpraegen ? ` · ${zeitText(plan.einpraegen)} Einprägen` : ""}
            {plan.abruf ? ` · ${zeitText(plan.abruf)} Abruf` : ""}
          </p>
          {plan.spaeter && <p>Der Abruf kommt erst nach mindestens {ABRUF_PAUSE_MIN} Minuten – wie im Test, wo dazwischen andere Untertests liegen. Mach in der Pause etwas anderes.</p>}
          {plan.notizen === "pflicht" && <p>Schreib zu jedem {art === "figuren" ? "Bild dein Unikat (ein Merkmal, das nur diese Figur hat)" : "Fall dein Bild im Raum"} – das ist der Methodenschritt, den du übst.</p>}
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-4 w-4" /> Im Test sind Notizen in der Einprägephase verboten – die Zeichenebene ist dann gesperrt.
          </p>
        </div>
        {schritt1 && (
          <p className="rounded-xl bg-muted p-3 text-sm">
            <b>
              Schritt {schritt1.nr} «{schritt1.titel}»:
            </b>{" "}
            {schritt1.tun}
          </p>
        )}
      </LektionsRahmen>
    );

  /* ---------------- Einprägen */
  if (phase === "einpraegen") {
    const notizFeld = (idx: number, ph: string) =>
      plan.notizen !== "keine" && (
        <Input value={notizen[idx] ?? ""} onChange={(e) => setNotizen((n) => ({ ...n, [idx]: e.target.value }))} placeholder={ph} className="h-9 text-sm" aria-label={ph} />
      );
    return (
      <LektionsRahmen
        titel={stufe === 2 ? "So prägst du dir ein" : "Einprägen"}
        untertitel={stufe === 2 ? "Munggi zeigt dir die Methode an einem Beispiel." : "Keine Notizen auf Papier – nur im Kopf."}
        fortschritt={0.2}
        rechts={plan.einpraegen ? <Uhr sekunden={restEinpraegen} warnung={20} /> : undefined}
        fuss={
          <Button size="lg" className="w-full" onClick={weiterNachEinpraegen}>
            {stufe === 2 ? "Jetzt abfragen" : "Fertig eingeprägt"}
          </Button>
        }
      >
        {figSet && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {figSet.figuren.map((f, k) => (
              <div key={k} className="flex flex-col gap-1.5">
                <FigurBild figur={f} modus="lernen" className="w-full" />
                {stufe === 2 && (
                  <p className="text-xs text-muted-foreground">
                    Unikat z. B.: «{["Zipfel oben schwarz", "Bauch links schwarz", "Spitze unten schwarz"][k % 3]}» – kurz benennen, dann zweimal wiederholen.
                  </p>
                )}
                {notizFeld(k, "Dein Unikat")}
              </div>
            ))}
          </div>
        )}
        {fakSet && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: plan.anzahl }, (_, g) => (
              <div key={g} className="flex flex-col gap-1.5 rounded-xl border-2 p-3">
                <p className="text-xs font-extrabold uppercase text-muted-foreground">Gruppe {g + 1}</p>
                {fakSet.faelle
                  .filter((f) => f.gruppe === g)
                  .map((f) => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <p className="text-[15px]">{fallText(f)}</p>
                      {stufe === 2 && (
                        <p className="text-xs text-muted-foreground">
                          Loci: Altersgruppe ca. {f.alter} → dein Raum. Bild: {f.name} als {f.beruf} ({f.merkmal}) mit {f.diagnose} – möglichst bunt und übertrieben.
                        </p>
                      )}
                      {notizFeld(f.id, "Dein Bild im Raum")}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
      </LektionsRahmen>
    );
  }

  /* ---------------- Pause / Warten */
  if (phase === "pause")
    return (
      <LektionsRahmen titel="Kurze Pause" untertitel="Wie im Test: zwischen Einprägen und Abruf liegt etwas anderes." fortschritt={0.4} rechts={<Uhr sekunden={restPause} />}>
        <p className="rounded-xl border-2 p-4 text-sm">Atme ruhig, schau kurz weg vom Bildschirm. Gleich kommt der Abruf in neuer Reihenfolge.</p>
        <Button variant="outline" onClick={() => setPhase("abruf")}>
          Abruf jetzt starten
        </Button>
      </LektionsRahmen>
    );

  if (phase === "warten") {
    const restMs = wartenBis - Date.now();
    const bereit = restMs <= 0 || !offen;
    return (
      <LektionsRahmen titel="Abruf kommt später" untertitel="Im Test liegen andere Untertests dazwischen." fortschritt={0.5}>
        <div className="flex flex-col gap-2 rounded-xl border-2 p-4 text-sm">
          {bereit ? <p className="font-bold">Bereit für den Abruf!</p> : <p>Abruf frühestens in {Math.ceil(restMs / 60000)} Minuten. Erledige inzwischen eine andere Aufgabe von heute – der Abruf erscheint dann auf «Heute».</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={!bereit && stufe >= 7}
            onClick={() => {
              setPhase("abruf");
              start.current = Date.now();
            }}
          >
            {bereit ? "Abruf starten" : stufe >= 7 ? "Noch warten" : "Trotzdem jetzt abrufen"}
          </Button>
          <Link to="/" className="py-2 text-center text-sm font-semibold text-muted-foreground">
            Zu Heute
          </Link>
        </div>
      </LektionsRahmen>
    );
  }

  /* ---------------- Abruf */
  const f = fragen[i];
  if (!f) return null;
  const letzte = antworten[i];
  return (
    <LektionsRahmen
      titel="Abruf"
      untertitel={art === "figuren" ? "Neue Reihenfolge. Welche Fläche war schwarz?" : "Beantworte die Fragen zu den Fällen."}
      fortschritt={0.5 + (i / fragen.length) * 0.5}
      rechts={plan.abruf ? <Uhr sekunden={restAbruf} warnung={30} /> : undefined}
      fuss={
        aufgedeckt ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setWahl(null);
              setAufgedeckt(false);
              start.current = Date.now();
              if (i + 1 < fragen.length) setI(i + 1);
              else void abrufBeenden();
            }}
          >
            Weiter <ChevronRight />
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={wahl === null} onClick={() => void antworten_()}>
            Prüfen
          </Button>
        )
      }
    >
      {figSet && (
        <FigurBild
          figur={figSet.figuren[figSet.abfrage[i]]}
          modus="abruf"
          gewaehlt={wahl}
          richtig={aufgedeckt}
          onWahl={aufgedeckt ? undefined : setWahl}
          className="mx-auto w-full max-w-xs"
        />
      )}
      <p className="font-bold">{f.text}</p>
      <div className={cn(art === "figuren" ? "grid grid-cols-5 gap-2" : "flex flex-col gap-2")}>
        {f.optionen.map((o, k) => (
          <button
            key={k}
            type="button"
            disabled={aufgedeckt}
            onClick={() => setWahl(k)}
            className={cn(
              "rounded-xl border-2 bg-card p-3 text-left font-semibold",
              art === "figuren" && "text-center text-lg",
              !aufgedeckt && wahl === k && "border-primary bg-primary/10",
              aufgedeckt && k === f.loesung && "border-richtig bg-richtig/10",
              aufgedeckt && k === wahl && k !== f.loesung && "border-falsch bg-falsch/10",
            )}
          >
            {art === "fakten" && <span className="mr-2 font-extrabold">{"ABCDE"[k]}</span>}
            {o}
          </button>
        ))}
      </div>
      {aufgedeckt &&
        (wahl === f.loesung ? (
          <p className="flex items-center gap-2 font-bold text-richtig">
            <CheckCircle2 className="h-5 w-5" /> Richtig!
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 font-bold text-falsch">
              <XCircle className="h-5 w-5" /> Richtig wäre {art === "figuren" ? "ABCDE"[f.loesung] : f.optionen[f.loesung]}.
            </p>
            {letzte && (
              <FehlerAnalyse
                option={wahl !== null ? { text: "", denkfehler: f.denkfehler(wahl)?.text, schritt: f.denkfehler(wahl)?.schritt } : undefined}
                methode={methode}
                ursache={letzte.ursache}
                onUrsache={(u) => {
                  setAntworten((a) => a.map((x, k) => (k === i ? { ...x, ursache: u } : x)));
                  if (letzte.fehlerId) void store.aendern("fehlerheft", letzte.fehlerId, { ursache: u });
                }}
              />
            )}
          </>
        ))}
    </LektionsRahmen>
  );
}
