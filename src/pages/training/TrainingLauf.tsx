import { useCallback, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, Flame, Settings2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { GRUPPEN, type AufgabenGruppe, type Fehlerursache, type Meldung } from "@/daten/modelle";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { usePlanStand } from "@/daten/hooks";
import { einheitenFuer, type Einheit } from "@/lernpfad/einheiten";
import { fehlerEintragen, versuchSpeichern } from "@/lernpfad/protokoll";
import { EINZEL_GENERATOREN, gesperrteSchluessel, istEinzel } from "@/aufgaben/register";
import { TEXT_BANK, textAufgaben, type TextEintrag } from "@/aufgaben/bank";
import { erzeugeFigurenSet, figurenDenkfehler } from "@/aufgaben/figuren";
import { erzeugeFaktenSet, fallText } from "@/aufgaben/fakten";
import { erzeugeBlatt, KONZ_REGELN, konzRegel } from "@/aufgaben/konz";
import { BUCHSTABEN, type Aufgabe, type SchrittDrill } from "@/aufgaben/typen";
import { naechsteKonzRegel } from "@/plan/plan";
import { UNTERTESTS } from "@/content/untertests";
import { GRUPPEN_ICON } from "@/components/gruppenIcons";
import { LeseText, Optionen, Stimulus } from "@/components/aufgaben/AufgabeAnsicht";
import { AufgabeMelden } from "@/components/aufgaben/AufgabeMelden";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { KonzBlattAnsicht } from "@/components/aufgaben/KonzBlattAnsicht";
import { DrillKarte } from "@/lektion/EinzelLektion";
import { FehlerAnalyse, Uhr, useCountdown } from "@/lektion/gemeinsam";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { MODI, naechsteSchwierigkeit, type SchwierigkeitsModus } from "@/training/schwierigkeit";
import { Button } from "@/components/ui/button";
import { heute } from "@/lib/datum";
import { neuerSeed, Zufall } from "@/lib/zufall";
import { ton } from "@/lib/ton";
import { XP } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Sitzung */

interface Sitzung {
  richtig: number;
  gesamt: number;
  inFolge: number;
  besteFolge: number;
}

type Melden = (richtig: boolean) => void;

const LOB = ["Richtig!", "Stark!", "Genau so!", "Sauber!", "Treffer!", "Super!"];

function Chip({ an, onClick, children }: { an: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={an} onClick={onClick} className={cn("shrink-0 rounded-full border-2 px-3 py-1 text-sm font-semibold", an && "border-primary bg-primary/10 text-primary")}>
      {children}
    </button>
  );
}

/** Rückmeldung nach einer Antwort: Munggi, Denkfehler, Methodenschritt, Lösungsweg */
function Rueckmeldung({ a, wahl, einheit, ursache, onUrsache, folge }: {
  a: Aufgabe;
  wahl: number | null;
  einheit: Einheit;
  ursache: Fehlerursache;
  onUrsache: (u: Fehlerursache) => void;
  folge: number;
}) {
  const [drill, setDrill] = useState<SchrittDrill | null>(null);
  const opt = wahl !== null ? a.optionen[wahl] : undefined;
  const richtig = wahl === a.loesung;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MeinMunggi zustand={richtig ? (folge >= 5 ? "feiert" : "freut") : "ermutigt"} className="h-14 w-14 shrink-0" />
        {richtig ? (
          <p className="flex items-center gap-2 font-bold text-richtig">
            <CheckCircle2 className="h-5 w-5" /> {LOB[folge % LOB.length]}
            {folge >= 3 && <span className="text-flamme">{folge} in Folge</span>}
          </p>
        ) : (
          <p className="flex items-center gap-2 font-bold text-falsch">
            <XCircle className="h-5 w-5" /> {wahl === null ? "Zeit um." : ""} Richtig wäre {BUCHSTABEN[a.loesung]}.
          </p>
        )}
      </div>
      {!richtig && (
        <FehlerAnalyse
          option={opt}
          methode={einheit.methode}
          ursache={ursache}
          onUrsache={onUrsache}
          onDrill={() => setDrill(a.drills.find((d) => d.schritt === opt?.schritt) ?? a.drills[0] ?? null)}
        />
      )}
      {drill && <DrillKarte drill={drill} methodeName={einheit.methode.name} onFertig={() => setDrill(null)} />}
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
  );
}

/* ------------------------------------------------------------------ Einzelaufgaben und Text */

function useAntwortSpeichern(einheit: Einheit) {
  const store = useSpeicher();
  return useCallback(
    async (a: Aufgabe, wahl: number | null, dauerMs: number): Promise<string | undefined> => {
      const richtig = wahl === a.loesung;
      const opt = wahl !== null ? a.optionen[wahl] : undefined;
      await versuchSpeichern(store, {
        gruppe: einheit.gruppe,
        quelle: "training",
        methodeId: einheit.methodeId,
        generator: a.generator,
        seed: a.seed,
        schwierigkeit: a.schwierigkeit,
        antwort: wahl,
        loesung: a.loesung,
        richtig,
        dauerMs,
        zielMs: a.zielSekunden * 1000,
        schrittFehler: !richtig && opt?.schritt ? [opt.schritt] : [],
        denkfehler: opt?.denkfehler,
      });
      if (richtig) return undefined;
      return fehlerEintragen(store, {
        gruppe: einheit.gruppe,
        methodeId: einheit.methodeId,
        schritt: opt?.schritt,
        ursache: wahl === null ? "zeitnot" : opt?.schritt ? "methodenschritt" : "denkfehler",
        denkfehler: opt?.denkfehler,
        ref: { art: "generator", generator: a.generator, seed: a.seed, schwierigkeit: a.schwierigkeit },
      });
    },
    [store, einheit],
  );
}

function AufgabenTraining({ einheit, melden, folge, modus, tempo }: { einheit: Einheit; melden: Melden; folge: number; modus: SchwierigkeitsModus; tempo: boolean }) {
  const store = useSpeicher();
  const meldungen = useSammlung<Meldung>("meldungen");
  const gesperrt = useMemo(() => gesperrteSchluessel(meldungen), [meldungen]);
  const speichern = useAntwortSpeichern(einheit);
  const text = einheit.format === "text";
  const basis = useRef(neuerSeed());
  const [nr, setNr] = useState(0);
  const [stufe, setStufe] = useState(modus === "auto" ? 3 : naechsteSchwierigkeit(modus, 3, 0, false));
  const [textId, setTextId] = useState<string | null>(null);

  // Nächste Aufgabe erzeugen
  const { aufgabe, lesetext } = useMemo(() => {
    if (text) {
      const z = new Zufall(`${basis.current}:${Math.floor(nr / 6)}`);
      const andere = TEXT_BANK.filter((t) => t.id !== textId);
      const t: TextEintrag | undefined = textId && nr % 6 !== 0 ? TEXT_BANK.find((x) => x.id === textId) : z.waehle(andere.length ? andere : TEXT_BANK);
      if (!t) return { aufgabe: undefined, lesetext: undefined };
      const liste = textAufgaben(t, t.id, einheit.methodeId).filter((a) => !gesperrt.has(a.quelle ?? ""));
      return { aufgabe: liste[nr % 6] ?? liste[0], lesetext: t };
    }
    if (!istEinzel(einheit.generator)) return { aufgabe: undefined, lesetext: undefined };
    const g = EINZEL_GENERATOREN[einheit.generator];
    for (let v = 0; v < 25; v++) {
      try {
        const a = g.erzeugen(`${basis.current}-${nr}-${v}`, stufe, einheit.methodeId);
        if (g.pruefen(a).length || gesperrt.has(a.quelle ?? "") || gesperrt.has(`${a.generator}:${a.seed}`)) continue;
        return { aufgabe: a, lesetext: undefined };
      } catch {
        /* nächster Versuch */
      }
    }
    return { aufgabe: undefined, lesetext: undefined };
    // gesperrt absichtlich nicht als Abhängigkeit: eine Meldung soll die aktuelle Aufgabe nicht austauschen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nr, stufe, einheit, text]);

  const [wahl, setWahl] = useState<number | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [fehler, setFehler] = useState<{ id?: string; ursache: Fehlerursache }>({ ursache: "methodenschritt" });
  const start = useRef(Date.now());
  const rest = useCountdown(aufgabe?.zielSekunden ?? 60, tempo && !aufgedeckt, () => void pruefen());

  async function pruefen() {
    if (!aufgabe || aufgedeckt) return;
    const w = wahl;
    const richtig = w === aufgabe.loesung;
    if (richtig) ton.richtig();
    else ton.falsch();
    setAufgedeckt(true);
    melden(richtig);
    const id = await speichern(aufgabe, w, Date.now() - start.current);
    const opt = w !== null ? aufgabe.optionen[w] : undefined;
    setFehler({ id, ursache: w === null ? "zeitnot" : opt?.schritt ? "methodenschritt" : "denkfehler" });
    if (!text) setStufe((s) => naechsteSchwierigkeit(modus, s, richtig ? folge + 1 : 0, !richtig));
  }

  function weiter() {
    // aktueller Text bleibt für 6 Fragen; danach wird ein anderer gewählt
    if (text && lesetext) setTextId(lesetext.id);
    setNr((n) => n + 1);
    setWahl(null);
    setAufgedeckt(false);
    start.current = Date.now();
  }

  if (!aufgabe) return <p className="rounded-xl border-2 p-4 text-sm">Gerade keine passende Aufgabe – tippe «Weiter».</p>;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{text ? `Text «${lesetext?.titel}» · Frage ${(nr % 6) + 1} von 6` : `Aufgabe ${nr + 1} · Schwierigkeit ${aufgabe.schwierigkeit}/5`}</span>
        {tempo && !aufgedeckt && <Uhr sekunden={rest} warnung={10} />}
      </div>
      {text && lesetext && <LeseText titel={lesetext.titel} absaetze={lesetext.absaetze} />}
      <Stimulus aufgabe={aufgabe} lernmodus={!tempo} kreuz={einheit.methodeId === "kreuzblick"} />
      <p className="font-bold">{aufgabe.frage}</p>
      <Optionen aufgabe={aufgabe} gewaehlt={wahl} aufgedeckt={aufgedeckt} onWahl={setWahl} />
      {aufgedeckt && (
        <Rueckmeldung
          a={aufgabe}
          wahl={wahl}
          einheit={einheit}
          ursache={fehler.ursache}
          folge={folge}
          onUrsache={(u) => {
            setFehler((f) => ({ ...f, ursache: u }));
            if (fehler.id) void store.aendern("fehlerheft", fehler.id, { ursache: u });
          }}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {aufgedeckt ? (
            <Button size="lg" className="w-full" onClick={weiter}>
              Nächste Aufgabe <ChevronRight />
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled={wahl === null} onClick={() => void pruefen()}>
              Prüfen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Figuren und Fakten */

function GedaechtnisTraining({ einheit, melden }: { einheit: Einheit; melden: Melden }) {
  const store = useSpeicher();
  const figuren = einheit.generator === "figuren";
  const groessen = figuren ? [6, 12, 18] : [1, 2, 3, 5];
  const [groesse, setGroesse] = useState(figuren ? 6 : 2);
  const [mitZeit, setMitZeit] = useState(true);
  const [seed, setSeed] = useState(() => neuerSeed());
  const [phase, setPhase] = useState<"start" | "einpraegen" | "abruf" | "fertig">("start");
  const [i, setI] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [runde, setRunde] = useState({ richtig: 0, gesamt: 0 });
  const figSet = useMemo(() => (figuren ? erzeugeFigurenSet(seed, groesse, groesse >= 12 ? 4 : 3) : null), [figuren, seed, groesse]);
  const fakSet = useMemo(() => (!figuren ? erzeugeFaktenSet(seed, groesse, Math.min(18, groesse * 3 + 1)) : null), [figuren, seed, groesse]);
  // Zeit wie im EMS: Figuren ~13 s pro Figur, Fakten ~24 s pro Fall
  const sekunden = figuren ? groesse * 13 : groesse * 3 * 24;
  const rest = useCountdown(sekunden, phase === "einpraegen" && mitZeit, () => setPhase("abruf"));

  const fragen = figSet
    ? figSet.abfrage.map((idx) => ({ text: "Welche Fläche war schwarz?", optionen: ["A", "B", "C", "D", "E"], loesung: figSet.figuren[idx].schwarz, figur: figSet.figuren[idx], denk: (w: number) => figurenDenkfehler(figSet, idx, w) }))
    : (fakSet?.fragen ?? []).map((q) => ({ text: q.frage, optionen: q.optionen, loesung: q.loesung, figur: undefined, denk: (w: number) => q.denkfehler[w] ?? undefined }));
  const f = fragen[i];

  async function pruefen() {
    if (!f || wahl === null) return;
    const ok = wahl === f.loesung;
    if (ok) ton.richtig();
    else ton.falsch();
    setAufgedeckt(true);
    melden(ok);
    setRunde((r) => ({ richtig: r.richtig + (ok ? 1 : 0), gesamt: r.gesamt + 1 }));
    const df = ok ? undefined : f.denk(wahl);
    await versuchSpeichern(store, {
      gruppe: einheit.gruppe,
      quelle: "training",
      methodeId: einheit.methodeId,
      generator: einheit.generator,
      seed: `${seed}:${i}`,
      schwierigkeit: groesse >= 12 ? 4 : 3,
      antwort: wahl,
      loesung: f.loesung,
      richtig: ok,
      dauerMs: 0,
      schrittFehler: df ? [df.schritt] : [],
      denkfehler: df?.text,
    });
  }

  if (phase === "start")
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-2xl border-2 p-4">
          <p className="font-bold">Wie viel willst du dir merken?</p>
          <div className="flex flex-wrap gap-1.5">
            {groessen.map((g) => (
              <Chip key={g} an={groesse === g} onClick={() => setGroesse(g)}>
                {figuren ? `${g} Figuren` : `${g * 3} Fälle`}
              </Chip>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={mitZeit} onChange={(e) => setMitZeit(e.target.checked)} />
            EMS-Zeit zum Einprägen ({Math.round(sekunden / 6) / 10} min)
          </label>
        </div>
        <Button size="lg" onClick={() => setPhase("einpraegen")}>
          Einprägen starten
        </Button>
      </div>
    );

  if (phase === "einpraegen")
    return (
      <div className="flex flex-col gap-4 pb-24">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Einprägen – keine Notizen</p>
          {mitZeit && <Uhr sekunden={rest} warnung={15} />}
        </div>
        {figSet && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {figSet.figuren.map((x) => (
              <FigurBild key={x.id} figur={x} modus="lernen" className="w-full" />
            ))}
          </div>
        )}
        {fakSet && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: groesse }, (_, g) => (
              <div key={g} className="flex flex-col gap-1 rounded-xl border-2 p-3">
                {fakSet.faelle
                  .filter((x) => x.gruppe === g)
                  .map((x) => (
                    <p key={x.id} className="text-[15px]">
                      {fallText(x)}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        )}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <Button size="lg" className="mx-auto flex w-full max-w-3xl" onClick={() => setPhase("abruf")}>
            Fertig – Abfrage starten
          </Button>
        </div>
      </div>
    );

  if (phase === "fertig" || !f)
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <MeinMunggi zustand={runde.richtig / Math.max(1, runde.gesamt) >= 0.8 ? "feiert" : "ermutigt"} className="h-28 w-28" />
        <p className="text-2xl font-extrabold">
          {runde.richtig} von {runde.gesamt} richtig
        </p>
        <Button
          size="lg"
          onClick={() => {
            setSeed(neuerSeed());
            setI(0);
            setRunde({ richtig: 0, gesamt: 0 });
            setPhase("start");
          }}
        >
          Neue Runde
        </Button>
      </div>
    );

  const df = aufgedeckt && wahl !== null && wahl !== f.loesung ? f.denk(wahl) : undefined;
  return (
    <div className="flex flex-col gap-4 pb-24">
      <p className="text-xs text-muted-foreground">
        Frage {i + 1} von {fragen.length}
      </p>
      {f.figur && <FigurBild figur={f.figur} modus="abruf" gewaehlt={wahl} richtig={aufgedeckt} onWahl={aufgedeckt ? undefined : setWahl} className="mx-auto w-full max-w-xs" />}
      <p className="font-bold">{f.text}</p>
      <div className={cn(figuren ? "grid grid-cols-5 gap-2" : "flex flex-col gap-2")}>
        {f.optionen.map((o, k) => (
          <button
            key={k}
            type="button"
            disabled={aufgedeckt}
            onClick={() => setWahl(k)}
            className={cn(
              "rounded-xl border-2 bg-card p-3 text-left font-semibold",
              figuren && "text-center text-lg",
              !aufgedeckt && wahl === k && "border-primary bg-primary/10",
              aufgedeckt && k === f.loesung && "border-richtig bg-richtig/10",
              aufgedeckt && k === wahl && k !== f.loesung && "border-falsch bg-falsch/10",
            )}
          >
            {!figuren && <span className="mr-2 font-extrabold">{"ABCDE"[k]}</span>}
            {o}
          </button>
        ))}
      </div>
      {aufgedeckt && (
        <div className="flex items-center gap-2">
          <MeinMunggi zustand={wahl === f.loesung ? "freut" : "ermutigt"} className="h-12 w-12 shrink-0" />
          <p className={cn("text-sm font-bold", wahl === f.loesung ? "text-richtig" : "text-falsch")}>
            {wahl === f.loesung ? "Richtig!" : `Richtig wäre ${figuren ? "ABCDE"[f.loesung] : f.optionen[f.loesung]}.`} {df && <span className="font-normal text-foreground">{df.text}</span>}
          </p>
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {aufgedeckt ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setWahl(null);
                setAufgedeckt(false);
                if (i + 1 < fragen.length) setI(i + 1);
                else setPhase("fertig");
              }}
            >
              Weiter <ChevronRight />
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled={wahl === null} onClick={() => void pruefen()}>
              Prüfen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Konz */

function KonzTraining({ einheit, melden }: { einheit: Einheit; melden: Melden }) {
  const store = useSpeicher();
  const stand = usePlanStand();
  const [regelId, setRegelId] = useState(() => naechsteKonzRegel(stand, heute()));
  const [seed, setSeed] = useState(() => neuerSeed());
  const blatt = useMemo(() => erzeugeBlatt(regelId, seed, 40, 40), [regelId, seed]);
  const [markiert, setMarkiert] = useState<boolean[][]>([]);
  const [geprueft, setGeprueft] = useState(0);
  const [summe, setSumme] = useState({ richtig: 0, falsch: 0, uebersehen: 0 });
  const regel = konzRegel(regelId);

  function neu(r = regelId) {
    setRegelId(r);
    setSeed(neuerSeed());
    setMarkiert([]);
    setGeprueft(0);
  }

  async function zeilePruefen() {
    const r = geprueft;
    // Beim Üben zählt die ganze Zeile (nicht nur bis zur letzten Markierung)
    const zeile = markiert[r] ?? [];
    let richtig = 0;
    let falsch = 0;
    let uebersehen = 0;
    blatt.ziele[r].forEach((ziel, c) => {
      const m = !!zeile[c];
      if (m && ziel) richtig++;
      else if (m && !ziel) falsch++;
      else if (!m && ziel) uebersehen++;
    });
    const ok = falsch === 0 && uebersehen === 0;
    if (ok) ton.richtig();
    else ton.falsch();
    melden(ok);
    setSumme((s) => ({ richtig: s.richtig + richtig, falsch: s.falsch + falsch, uebersehen: s.uebersehen + uebersehen }));
    setGeprueft(r + 1);
    await versuchSpeichern(store, {
      gruppe: "konz",
      quelle: "training",
      methodeId: einheit.methodeId,
      generator: "konz",
      seed: `${regelId}:${seed}:${r}`,
      antwort: richtig,
      loesung: richtig + uebersehen,
      richtig: ok,
      dauerMs: 0,
    });
    if (r + 1 >= blatt.zeilen.length) {
      toast("Blatt fertig – hier kommt ein neues mit derselben Regel.");
      neu();
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-gold/50 bg-gold/10 p-3">
        <label className="flex flex-col gap-1 text-xs font-extrabold uppercase text-muted-foreground">
          Regel
          <select value={regelId} onChange={(e) => neu(e.target.value)} className="h-10 rounded-xl border-2 bg-background px-2 text-sm font-semibold normal-case text-foreground">
            {KONZ_REGELN.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}: {r.titel}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm font-semibold">{regel.anweisung}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Bisher: {summe.richtig} richtig · {summe.falsch} falsch markiert · {summe.uebersehen} übersehen. Grün richtig, rot falsch, gelb übersehen.
      </p>
      <KonzBlattAnsicht
        blatt={blatt}
        markiert={markiert}
        zeilen={Math.min(blatt.zeilen.length, geprueft + 1)}
        aufgedecktBis={geprueft}
        onToggle={(r, c) => {
          if (r < geprueft) return;
          setMarkiert((alt) => {
            const n = alt.map((z) => [...z]);
            while (n.length <= r) n.push([]);
            n[r][c] = !n[r][c];
            return n;
          });
        }}
      />
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <Button size="lg" className="mx-auto flex w-full max-w-3xl" onClick={() => void zeilePruefen()}>
          Zeile {geprueft + 1} prüfen
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Seite */

export default function TrainingLauf() {
  const { gruppe = "" } = useParams();
  const gueltig = (GRUPPEN as string[]).includes(gruppe);
  const einheiten = gueltig ? einheitenFuer(gruppe as AufgabenGruppe) : [];
  const [methodeId, setMethodeId] = useState(einheiten[0]?.methodeId);
  const [modus, setModus] = useState<SchwierigkeitsModus>("auto");
  const [tempo, setTempo] = useState(false);
  const [optionenOffen, setOptionenOffen] = useState(false);
  const [sitzung, setSitzung] = useState<Sitzung>({ richtig: 0, gesamt: 0, inFolge: 0, besteFolge: 0 });
  const [ende, setEnde] = useState(false);
  const [lauf, setLauf] = useState(0);

  const melden = useCallback<Melden>((richtig) => {
    setSitzung((s) => {
      const inFolge = richtig ? s.inFolge + 1 : 0;
      return { richtig: s.richtig + (richtig ? 1 : 0), gesamt: s.gesamt + 1, inFolge, besteFolge: Math.max(s.besteFolge, inFolge) };
    });
  }, []);

  if (!gueltig) return <Navigate to="/ueben" replace />;
  const einheit = einheiten.find((e) => e.methodeId === methodeId) ?? einheiten[0];
  const u = UNTERTESTS.find((x) => x.id === gruppe)!;
  const Icon = GRUPPEN_ICON[gruppe as AufgabenGruppe];
  const einzel = einheit.format === "einzel" || einheit.format === "text";
  const quote = sitzung.gesamt ? Math.round((sitzung.richtig / sitzung.gesamt) * 100) : 0;

  if (ende)
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <MeinMunggi zustand={quote >= 75 ? "feiert" : "ermutigt"} className="h-32 w-32" />
        <h1 className="text-2xl font-extrabold">Training {u.kurzname}</h1>
        <div className="grid w-full max-w-sm grid-cols-3 gap-2">
          <div className="rounded-xl border-2 p-3">
            <p className="text-2xl font-extrabold tabular-nums">{sitzung.gesamt}</p>
            <p className="text-[11px] text-muted-foreground">geübt</p>
          </div>
          <div className="rounded-xl border-2 p-3">
            <p className="text-2xl font-extrabold tabular-nums">{quote} %</p>
            <p className="text-[11px] text-muted-foreground">richtig</p>
          </div>
          <div className="rounded-xl border-2 p-3">
            <p className="text-2xl font-extrabold tabular-nums text-flamme">{sitzung.besteFolge}</p>
            <p className="text-[11px] text-muted-foreground">beste Serie</p>
          </div>
        </div>
        <p className="font-bold text-gold">+{sitzung.richtig * XP.richtig} XP</p>
        <p className="max-w-sm text-sm text-muted-foreground">Falsche Aufgaben liegen im Fehlerheft und kommen zur Wiederholung.</p>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              setEnde(false);
              setSitzung({ richtig: 0, gesamt: 0, inFolge: 0, besteFolge: 0 });
              setLauf((l) => l + 1);
            }}
          >
            Weiter üben
          </Button>
          <Link to="/ueben" className="py-2 text-sm font-semibold text-muted-foreground">
            Anderen Aufgabentyp wählen
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b-2 bg-background/95 px-4 py-2 backdrop-blur">
        <Link to="/ueben" aria-label="Training verlassen" className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
          <X className="h-6 w-6" />
        </Link>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <h1 className="min-w-0 flex-1 truncate font-extrabold">{u.kurzname}</h1>
        <span className="text-sm font-bold tabular-nums" aria-label="richtig von geübt">
          {sitzung.richtig}/{sitzung.gesamt}
        </span>
        {sitzung.inFolge >= 2 && (
          <span className="flex items-center gap-0.5 text-sm font-extrabold text-flamme" aria-label={`${sitzung.inFolge} richtig in Folge`}>
            <Flame className="h-4 w-4" /> {sitzung.inFolge}
          </span>
        )}
        {(einzel || einheiten.length > 1) && (
          <button type="button" onClick={() => setOptionenOffen((o) => !o)} aria-expanded={optionenOffen} aria-label="Einstellungen" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <Settings2 className="h-5 w-5" />
          </button>
        )}
        <Button size="sm" variant="outline" onClick={() => setEnde(true)}>
          Beenden
        </Button>
      </div>

      {optionenOffen && (
        <div className="flex flex-col gap-2 rounded-2xl border-2 p-3">
          {einheiten.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {einheiten.map((e) => (
                <Chip key={e.methodeId} an={einheit.methodeId === e.methodeId} onClick={() => setMethodeId(e.methodeId)}>
                  {e.methode.name.split(":")[0]}
                </Chip>
              ))}
            </div>
          )}
          {einzel && einheit.format === "einzel" && (
            <div className="flex gap-1.5 overflow-x-auto">
              {MODI.map((m) => (
                <Chip key={m.id} an={modus === m.id} onClick={() => setModus(m.id)}>
                  {m.name}
                </Chip>
              ))}
            </div>
          )}
          {einzel && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={tempo} onChange={(e) => setTempo(e.target.checked)} /> Mit EMS-Zeit pro Aufgabe
            </label>
          )}
        </div>
      )}

      {einzel ? (
        <AufgabenTraining key={`${einheit.methodeId}:${modus}:${lauf}`} einheit={einheit} melden={melden} folge={sitzung.inFolge} modus={modus} tempo={tempo} />
      ) : einheit.format === "gedaechtnis" ? (
        <GedaechtnisTraining key={`${einheit.methodeId}:${lauf}`} einheit={einheit} melden={melden} />
      ) : (
        <KonzTraining key={`${lauf}`} einheit={einheit} melden={melden} />
      )}
    </div>
  );
}
