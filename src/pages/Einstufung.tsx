import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { aufgabenErzeugen, type EinzelGeneratorId } from "@/aufgaben/register";
import { TEXT_BANK, textAufgaben } from "@/aufgaben/bank";
import { erzeugeFigurenSet } from "@/aufgaben/figuren";
import { erzeugeFaktenSet, fallText } from "@/aufgaben/fakten";
import { bewerten, erzeugeBlatt, KONZ_REGELN } from "@/aufgaben/konz";
import type { Aufgabe } from "@/aufgaben/typen";
import type { AufgabenGruppe } from "@/daten/modelle";
import { useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { versuchSpeichern, xpGeben } from "@/lernpfad/protokoll";
import { UNTERTESTS } from "@/content/untertests";
import { Button } from "@/components/ui/button";
import { LeseText, Optionen, Stimulus } from "@/components/aufgaben/AufgabeAnsicht";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { KonzBlattAnsicht } from "@/components/aufgaben/KonzBlattAnsicht";
import { LektionsRahmen, Uhr, useCountdown } from "@/lektion/gemeinsam";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { neuerSeed, Zufall } from "@/lib/zufall";
import { cn } from "@/lib/utils";

/** Einstufung: aus jeder Gruppe ein kurzer Block, zusammen ca. 20 Minuten. Keine Rückmeldung während des Tests. */
type Block =
  | { art: "einzel"; gruppe: AufgabenGruppe; aufgaben: Aufgabe[]; sekunden: number; lesetext?: { titel: string; absaetze: string[] } }
  | { art: "figuren"; gruppe: AufgabenGruppe; sekunden: number }
  | { art: "fakten"; gruppe: AufgabenGruppe; sekunden: number }
  | { art: "konz"; gruppe: AufgabenGruppe; sekunden: number };

const EINZEL: Array<[EinzelGeneratorId, AufgabenGruppe, number]> = [
  ["muster", "muster-zuordnen", 3],
  ["mednat", "med-nat", 2],
  ["objekte", "objekte-im-raum", 3],
  ["quanti", "quanti", 2],
  ["diagramme", "diagramme-tabellen", 2],
];

export default function Einstufung() {
  const store = useSpeicher();
  const [, speichern] = useEinstellungen();
  const navigate = useNavigate();
  const [seed] = useState(() => neuerSeed());
  const bloecke: Block[] = useMemo(() => {
    const b: Block[] = [];
    const figuren: Block = { art: "figuren", gruppe: "figuren-lernen", sekunden: 75 };
    b.push(figuren);
    for (const [gen, gruppe, n] of EINZEL) {
      const aufgaben = aufgabenErzeugen(gen, n, 3, undefined, `${seed}:${gen}`);
      b.push({ art: "einzel", gruppe, aufgaben, sekunden: aufgaben.reduce((s, a) => s + a.zielSekunden, 0) });
      if (gen === "mednat") b.push({ art: "fakten", gruppe: "fakten-lernen", sekunden: 75 });
    }
    if (TEXT_BANK.length) {
      const t = new Zufall(seed).waehle(TEXT_BANK);
      const fr = textAufgaben(t, t.id).slice(0, 2);
      b.push({ art: "einzel", gruppe: "textverstaendnis", aufgaben: fr, sekunden: 6 * 60, lesetext: t });
    }
    b.push({ art: "konz", gruppe: "konz", sekunden: 90 });
    return b;
  }, [seed]);

  const [bi, setBi] = useState(-1);
  const [ergebnis, setErgebnis] = useState<Partial<Record<AufgabenGruppe, { richtig: number; gesamt: number }>>>({});
  const block = bi >= 0 ? bloecke[bi] : undefined;

  function blockFertig(gruppe: AufgabenGruppe, richtig: number, gesamt: number) {
    // Gedächtnis- und Konz-Blöcke: pro Item ein Versuch, damit der Plan die Schwäche kennt
    if (block && block.art !== "einzel")
      for (let k = 0; k < gesamt; k++)
        void versuchSpeichern(store, { gruppe, quelle: "einstufung", generator: block.art, antwort: null, loesung: 0, richtig: k < richtig, dauerMs: 0 });
    setErgebnis((e) => ({ ...e, [gruppe]: { richtig, gesamt } }));
    setBi((x) => x + 1);
  }

  if (bi === -1)
    return (
      <LektionsRahmen titel="Einstufungstest" untertitel="Ca. 20 Minuten · ein kurzer Block pro Aufgabengruppe" fortschritt={0} zurueck="/">
        <div className="flex flex-col items-center gap-3 text-center">
          <MeinMunggi zustand="fokussiert" className="h-28 w-28" />
          <p className="text-sm">Keine Sorge, hier gibt es kein «schlecht». Ich will nur wissen, wo du startest – damit dein Plan die richtigen Schwerpunkte setzt. Rückmeldung gibt es am Schluss.</p>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {bloecke.map((b, k) => (
            <li key={k} className="flex justify-between rounded-lg bg-muted/50 px-3 py-1.5">
              <span>{UNTERTESTS.find((u) => u.id === b.gruppe)!.name}</span>
              <span className="text-muted-foreground">{Math.round(b.sekunden / 60) || 1} min</span>
            </li>
          ))}
        </ul>
        <Button size="lg" onClick={() => setBi(0)}>
          Starten
        </Button>
      </LektionsRahmen>
    );

  if (!block) {
    const gruppen = Object.entries(ergebnis) as Array<[AufgabenGruppe, { richtig: number; gesamt: number }]>;
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MeinMunggi zustand="feiert" className="h-28 w-28" animiert />
        <h1 className="text-2xl font-extrabold">Einstufung fertig!</h1>
        <ul className="flex w-full max-w-md flex-col gap-1.5 text-left text-sm">
          {gruppen.map(([g, r]) => {
            const q = r.gesamt ? r.richtig / r.gesamt : 0;
            return (
              <li key={g} className="flex items-center gap-2 rounded-xl border-2 p-2">
                <span className="flex-1 font-semibold">{UNTERTESTS.find((u) => u.id === g)!.kurzname}</span>
                <span className={cn("font-bold tabular-nums", q >= 0.75 ? "text-richtig" : q >= 0.4 ? "text-gold" : "text-falsch")}>
                  {r.richtig}/{r.gesamt}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="max-w-md text-sm text-muted-foreground">Dein Plan legt jetzt mehr Gewicht auf die schwächeren Gruppen. Die Methoden lernst du trotzdem alle ab Stufe 1 – wer schon gut ist, steigt schneller auf.</p>
        <Button
          size="lg"
          onClick={async () => {
            await speichern({ einstufungFertig: true });
            await xpGeben(store, 20);
            navigate("/", { replace: true });
          }}
        >
          Zu meinem Plan
        </Button>
      </div>
    );
  }

  const fortschritt = bi / bloecke.length;
  if (block.art === "einzel") return <EinzelBlock key={bi} block={block} fortschritt={fortschritt} onFertig={blockFertig} />;
  if (block.art === "figuren") return <FigurenBlock key={bi} seed={seed} fortschritt={fortschritt} onFertig={blockFertig} />;
  if (block.art === "fakten") return <FaktenBlock key={bi} seed={seed} fortschritt={fortschritt} onFertig={blockFertig} />;
  return <KonzBlock key={bi} seed={seed} sekunden={block.sekunden} fortschritt={fortschritt} onFertig={blockFertig} />;
}

type Fertig = (gruppe: AufgabenGruppe, richtig: number, gesamt: number) => void;

function EinzelBlock({ block, fortschritt, onFertig }: { block: Extract<Block, { art: "einzel" }>; fortschritt: number; onFertig: Fertig }) {
  const store = useSpeicher();
  const [i, setI] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const richtig = useRef(0);
  const start = useRef(Date.now());
  const rest = useCountdown(block.sekunden, true, () => void weiter(true));
  const a = block.aufgaben[i];

  async function weiter(zeitAus = false) {
    if (!a) return;
    const ok = wahl === a.loesung;
    if (ok) richtig.current++;
    await versuchSpeichern(store, {
      gruppe: block.gruppe,
      quelle: "einstufung",
      generator: a.generator,
      seed: a.seed,
      schwierigkeit: a.schwierigkeit,
      antwort: wahl,
      loesung: a.loesung,
      richtig: ok,
      dauerMs: Date.now() - start.current,
      zielMs: a.zielSekunden * 1000,
    });
    start.current = Date.now();
    setWahl(null);
    if (zeitAus || i + 1 >= block.aufgaben.length) onFertig(block.gruppe, richtig.current, block.aufgaben.length);
    else setI(i + 1);
  }

  if (!a) return null;
  const u = UNTERTESTS.find((x) => x.id === block.gruppe)!;
  return (
    <LektionsRahmen
      titel={u.name}
      untertitel={`Aufgabe ${i + 1} von ${block.aufgaben.length}`}
      fortschritt={fortschritt}
      rechts={<Uhr sekunden={rest} warnung={20} />}
      zurueck="/"
      fuss={
        <Button size="lg" className="w-full" onClick={() => void weiter()}>
          {wahl === null ? "Überspringen" : "Weiter"} <ChevronRight />
        </Button>
      }
    >
      {block.lesetext && <LeseText titel={block.lesetext.titel} absaetze={block.lesetext.absaetze} />}
      <Stimulus aufgabe={a} />
      <p className="font-bold">{a.frage}</p>
      <Optionen aufgabe={a} gewaehlt={wahl} aufgedeckt={false} onWahl={setWahl} />
    </LektionsRahmen>
  );
}

function FigurenBlock({ seed, fortschritt, onFertig }: { seed: string; fortschritt: number; onFertig: Fertig }) {
  const set = useMemo(() => erzeugeFigurenSet(`${seed}:fig`, 6, 3), [seed]);
  const [phase, setPhase] = useState<"lernen" | "abruf">("lernen");
  const [i, setI] = useState(0);
  const richtig = useRef(0);
  const rest = useCountdown(60, phase === "lernen", () => setPhase("abruf"));
  if (phase === "lernen")
    return (
      <LektionsRahmen titel="Figuren lernen" untertitel="Präg dir ein, welche Fläche schwarz ist." fortschritt={fortschritt} rechts={<Uhr sekunden={rest} warnung={15} />} zurueck="/"
        fuss={<Button size="lg" className="w-full" onClick={() => setPhase("abruf")}>Fertig</Button>}>
        <div className="grid grid-cols-3 gap-2">
          {set.figuren.map((f) => (
            <FigurBild key={f.id} figur={f} modus="lernen" className="w-full" />
          ))}
        </div>
      </LektionsRahmen>
    );
  const f = set.figuren[set.abfrage[i]];
  return (
    <LektionsRahmen titel="Figuren: Abruf" untertitel="Welche Fläche war schwarz?" fortschritt={fortschritt} zurueck="/">
      <FigurBild figur={f} modus="abruf" className="mx-auto w-full max-w-xs" />
      <div className="grid grid-cols-5 gap-2">
        {"ABCDE".split("").map((b, k) => (
          <Button
            key={b}
            variant="outline"
            size="lg"
            onClick={() => {
              if (k === f.schwarz) richtig.current++;
              if (i + 1 >= set.abfrage.length) onFertig("figuren-lernen", richtig.current, set.abfrage.length);
              else setI(i + 1);
            }}
          >
            {b}
          </Button>
        ))}
      </div>
    </LektionsRahmen>
  );
}

function FaktenBlock({ seed, fortschritt, onFertig }: { seed: string; fortschritt: number; onFertig: Fertig }) {
  const set = useMemo(() => erzeugeFaktenSet(`${seed}:fak`, 2, 4), [seed]);
  const [phase, setPhase] = useState<"lernen" | "abruf">("lernen");
  const [i, setI] = useState(0);
  const richtig = useRef(0);
  const rest = useCountdown(75, phase === "lernen", () => setPhase("abruf"));
  if (phase === "lernen")
    return (
      <LektionsRahmen titel="Fakten lernen" untertitel="Präg dir die Fälle ein." fortschritt={fortschritt} rechts={<Uhr sekunden={rest} warnung={15} />} zurueck="/"
        fuss={<Button size="lg" className="w-full" onClick={() => setPhase("abruf")}>Fertig</Button>}>
        <ul className="flex flex-col gap-1.5">
          {set.faelle.map((f) => (
            <li key={f.id} className="rounded-lg border-2 p-2 text-[15px]">
              {fallText(f)}
            </li>
          ))}
        </ul>
      </LektionsRahmen>
    );
  const q = set.fragen[i];
  return (
    <LektionsRahmen titel="Fakten: Abruf" untertitel={`Frage ${i + 1} von ${set.fragen.length}`} fortschritt={fortschritt} zurueck="/">
      <p className="font-bold">{q.frage}</p>
      <div className="flex flex-col gap-2">
        {q.optionen.map((o, k) => (
          <Button
            key={k}
            variant="outline"
            className="h-auto justify-start whitespace-normal py-3 text-left"
            onClick={() => {
              if (k === q.loesung) richtig.current++;
              if (i + 1 >= set.fragen.length) onFertig("fakten-lernen", richtig.current, set.fragen.length);
              else setI(i + 1);
            }}
          >
            <b className="mr-2">{"ABCDE"[k]}</b> {o}
          </Button>
        ))}
      </div>
    </LektionsRahmen>
  );
}

function KonzBlock({ seed, sekunden, fortschritt, onFertig }: { seed: string; sekunden: number; fortschritt: number; onFertig: Fertig }) {
  const regel = KONZ_REGELN[0];
  const blatt = useMemo(() => erzeugeBlatt(regel.id, `${seed}:konz`, 6, 20), [seed, regel.id]);
  const [markiert, setMarkiert] = useState<boolean[][]>([]);
  const [laeuft, setLaeuft] = useState(false);
  const fertig = () => {
    const w = bewerten(blatt, markiert);
    onFertig("konz", w.richtig, Math.max(1, w.richtig + w.falsch + w.uebersehen));
  };
  const rest = useCountdown(sekunden, laeuft, fertig);
  return (
    <LektionsRahmen titel="Konz" untertitel={regel.anweisung} fortschritt={fortschritt} rechts={laeuft ? <Uhr sekunden={rest} warnung={20} /> : undefined} zurueck="/"
      fuss={laeuft ? <Button size="lg" className="w-full" onClick={fertig}>Fertig</Button> : <Button size="lg" className="w-full" onClick={() => setLaeuft(true)}>Los</Button>}>
      {laeuft ? (
        <KonzBlattAnsicht
          blatt={blatt}
          markiert={markiert}
          onToggle={(r, c) =>
            setMarkiert((alt) => {
              const n = alt.map((z) => [...z]);
              while (n.length <= r) n.push([]);
              n[r][c] = !n[r][c];
              return n;
            })
          }
        />
      ) : (
        <p className="text-sm">Antippen = durchstreichen. Zeilenweise arbeiten.</p>
      )}
      <Link to="/" className="sr-only">
        Abbrechen
      </Link>
    </LektionsRahmen>
  );
}
