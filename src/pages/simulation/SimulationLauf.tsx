import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardList, Coffee, Eye, EyeOff, Loader2, Lock, PenLine, Play, Wind, X } from "lucide-react";
import type { AufgabenGruppe, SimulationsErgebnis } from "@/daten/modelle";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { fallText } from "@/aufgaben/fakten";
import { konzRegel } from "@/aufgaben/konz";
import {
  antwortSchluessel,
  fruehereAntwortGruppen,
  fuerSpeicher,
  gesamtMinuten,
  gruppenIm,
  GRUPPEN_INFO,
  KONZ_SPALTEN,
  KONZ_ZEILEN,
  konzMatrix,
  loesungenFuer,
  nachtraeglichRatenErlaubt,
  restSekunden,
  simulationWerten,
  type AblaufBlock,
  type SimInhalt,
} from "@/simulation/ablauf";
import { ablaufFuer, dauerText, minutenText, simArtVon, useSimInhalt } from "@/simulation/lauf";
import { AntwortbogenSim, AntwortZeile, type BogenGruppe } from "@/components/simulation/AntwortbogenSim";
import { LeseText, Optionen, Stimulus } from "@/components/aufgaben/AufgabeAnsicht";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { KonzBlattAnsicht } from "@/components/aufgaben/KonzBlattAnsicht";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { Button } from "@/components/ui/button";
import { uhrzeit, minutenZuZeit, zeitZuMinuten } from "@/lib/datum";
import { ton } from "@/lib/ton";
import { cn } from "@/lib/utils";

const HEFT_ZU_MS = 3500;
const SPEICHERN_MS = 800;

function phaseText(b: AblaufBlock): string {
  if (b.phase === "heftwechsel") return "Heftwechsel";
  const n = GRUPPEN_INFO[b.gruppe!].name;
  return b.phase === "einpraegen" ? `${n} · Einprägen` : b.phase === "abruf" ? `${n} · Abruf` : n;
}

function lesen(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function schreiben(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* egal */
  }
}

export default function SimulationLauf() {
  const { id = "" } = useParams();
  const doc = useDokument<SimulationsErgebnis>("simulationen", id);
  if (!doc)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold">Diese Simulation gibt es nicht (mehr).</p>
        <Link to="/simulation" className="font-semibold text-primary">
          Zur Simulation
        </Link>
      </div>
    );
  if (doc.abgeschlossen) return <Navigate to={`/simulation/ergebnis/${id}`} replace />;
  return <Lauf key={id} id={id} doc={doc} />;
}

function Lauf({ id, doc }: { id: string; doc: SimulationsErgebnis & { id: string } }) {
  const store = useSpeicher();
  const navigate = useNavigate();
  const ablauf = useMemo(() => ablaufFuer(doc), [doc.art, doc.mini, doc.heftwechselMinuten, doc.geplanterStart, doc.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const inhalt = useSimInhalt(doc.seed, ablauf);

  const [antworten, setAntworten] = useState<Record<string, number | null>>(() => doc.antworten ?? {});
  const [markiert, setMarkiert] = useState<boolean[][]>(() => konzMatrix(doc.konzMarkiert ?? []));
  const [jetzt, setJetzt] = useState(Date.now());
  const [heftZu, setHeftZu] = useState(false);
  const [nr, setNr] = useState(0);
  const [bogenOffen, setBogenOffen] = useState(false);
  const [restZeigen, setRestZeigen] = useState(() => lesen("munggi-sim-restzeit") !== "nein");

  const lauf = doc.lauf;
  const idx = lauf?.block ?? -1;
  const block = idx >= 0 ? ablauf[idx] : undefined;
  const rest = block && lauf ? restSekunden(block, lauf.blockStart, jetzt) : 0;

  /* ---------------- Speichern (entprellt) */
  const ausstehend = useRef<Partial<SimulationsErgebnis>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const teil = ausstehend.current;
    ausstehend.current = {};
    if (Object.keys(teil).length) void store.aendern<SimulationsErgebnis>("simulationen", id, teil);
  }, [store, id]);
  const planen = useCallback(
    (teil: Partial<SimulationsErgebnis>) => {
      ausstehend.current = { ...ausstehend.current, ...teil };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SPEICHERN_MS);
    },
    [flush],
  );
  useEffect(() => {
    const weg = () => flush();
    const sichtbar = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", weg);
    document.addEventListener("visibilitychange", sichtbar);
    return () => {
      window.removeEventListener("pagehide", weg);
      document.removeEventListener("visibilitychange", sichtbar);
      flush();
    };
  }, [flush]);

  const ersterLauf = useRef(true);
  useEffect(() => {
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    planen({ antworten });
  }, [antworten, planen]);
  const ersterKonz = useRef(true);
  useEffect(() => {
    if (ersterKonz.current) {
      ersterKonz.current = false;
      return;
    }
    const idxs: number[] = [];
    markiert.forEach((z, r) => z.forEach((m, c) => m && idxs.push(r * KONZ_SPALTEN + c)));
    planen({ konzMarkiert: idxs });
  }, [markiert, planen]);

  /* ---------------- Uhr */
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  /* ---------------- Blockwechsel */
  const antwortenRef = useRef(antworten);
  antwortenRef.current = antworten;
  const markiertRef = useRef(markiert);
  markiertRef.current = markiert;
  const endet = useRef(false);
  const heftZuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (heftZuTimer.current) clearTimeout(heftZuTimer.current);
  }, []);

  const abschliessen = useCallback(
    async (sekunden: Record<string, number>) => {
      if (!inhalt) return;
      const markiertIdx: number[] = [];
      markiertRef.current.forEach((z, r) => z.forEach((m, c) => m && markiertIdx.push(r * KONZ_SPALTEN + c)));
      const w = simulationWerten(inhalt, gruppenIm(ablauf), antwortenRef.current, { markiert: markiertIdx });
      const k = w.konz?.konz;
      flush();
      await store.aendern<SimulationsErgebnis>("simulationen", id, {
        antworten: antwortenRef.current,
        konzMarkiert: markiertIdx,
        gruppen: fuerSpeicher(w),
        ...(k && inhalt.konz ? { konz: { regelId: inhalt.konz.regelId, richtig: k.richtig, falsch: k.falsch, uebersehen: k.uebersehen, rohwert: k.rohwert, punktwert: k.punktwert } } : {}),
        blockSekunden: sekunden,
        ende: Date.now(),
        abgeschlossen: true,
        lauf: undefined,
      });
      ton.fertig();
      navigate(`/simulation/ergebnis/${id}`, { replace: true });
    },
    [inhalt, ablauf, flush, store, id, navigate],
  );

  const abschliessenRef = useRef(abschliessen);
  abschliessenRef.current = abschliessen;

  /** Nächster Block – liest den aktuellen Stand direkt aus dem Speicher (keine veralteten Werte aus Timern). */
  const weiter = useCallback(() => {
    const d = store.hole<SimulationsErgebnis>("simulationen", id);
    if (!d?.lauf) return;
    const i = d.lauf.block;
    const b = ablauf[i];
    if (!b) return;
    const sekunden = { ...(d.blockSekunden ?? {}) };
    if (sekunden[b.id] === undefined) sekunden[b.id] = Math.min(b.minuten * 60, Math.round((Date.now() - d.lauf.blockStart) / 1000));
    setBogenOffen(false);
    if (i + 1 >= ablauf.length) {
      void abschliessenRef.current(sekunden);
      return;
    }
    flush();
    setHeftZu(false);
    setNr(0);
    endet.current = false;
    void store.aendern<SimulationsErgebnis>("simulationen", id, { lauf: { block: i + 1, blockStart: Date.now() }, blockSekunden: sekunden, antworten: antwortenRef.current });
  }, [ablauf, flush, store, id]);

  const blockEnde = useCallback(
    (zeitUm: boolean) => {
      const d = store.hole<SimulationsErgebnis>("simulationen", id);
      if (endet.current || !d?.lauf) return;
      const b = ablauf[d.lauf.block];
      if (!b) return;
      endet.current = true;
      if (zeitUm) ton.zeit();
      flush();
      if (b.phase === "heftwechsel") {
        weiter();
        return;
      }
      // Genutzte Zeit festhalten, bevor der «Heft zu»-Bildschirm läuft
      const genutzt = Math.min(b.minuten * 60, Math.round((Date.now() - d.lauf.blockStart) / 1000));
      void store.aendern<SimulationsErgebnis>("simulationen", id, { blockSekunden: { ...(d.blockSekunden ?? {}), [b.id]: genutzt } });
      setHeftZu(true);
      heftZuTimer.current = setTimeout(() => weiter(), HEFT_ZU_MS);
    },
    [ablauf, flush, weiter, store, id],
  );

  useEffect(() => {
    if (lauf && block && rest === 0 && !heftZu && inhalt) blockEnde(true);
  }, [lauf, block, rest, heftZu, inhalt, blockEnde]);

  // Ablauf zu Ende (z. B. nach Neuladen im letzten «Heft zu»)
  useEffect(() => {
    if (lauf && idx >= ablauf.length && inhalt) void abschliessen(doc.blockSekunden ?? {});
  }, [lauf, idx, ablauf.length, inhalt, abschliessen, doc.blockSekunden]);

  /* ---------------- Antwortbogen */
  const leerBeiStart = useMemo(() => {
    const s = new Set<string>();
    if (!inhalt) return s;
    for (const g of fruehereAntwortGruppen(ablauf, idx))
      loesungenFuer(inhalt, g).forEach((_, i) => {
        const k = antwortSchluessel(g, i);
        if (antwortenRef.current[k] === null || antwortenRef.current[k] === undefined) s.add(k);
      });
    return s;
  }, [inhalt, ablauf, idx]);

  const aktuelleGruppe = block && (block.phase === "bearbeiten" || block.phase === "abruf") && block.gruppe !== "konz" ? block.gruppe : null;
  const bogen: BogenGruppe[] = useMemo(() => {
    if (!inhalt || !block) return [];
    const raten = nachtraeglichRatenErlaubt(ablauf, idx) && !heftZu;
    const liste: BogenGruppe[] = [];
    if (aktuelleGruppe) liste.push({ gruppe: aktuelleGruppe, titel: GRUPPEN_INFO[aktuelleGruppe].kurz, anzahl: loesungenFuer(inhalt, aktuelleGruppe).length, modus: heftZu ? "gesperrt" : "aktiv" });
    for (const g of fruehereAntwortGruppen(ablauf, idx))
      if (g !== aktuelleGruppe) liste.push({ gruppe: g, titel: GRUPPEN_INFO[g].kurz, anzahl: loesungenFuer(inhalt, g).length, modus: raten ? "nurLeer" : "gesperrt", leerSet: leerBeiStart });
    return liste;
  }, [inhalt, block, ablauf, idx, heftZu, aktuelleGruppe, leerBeiStart]);

  const onAntwort = useCallback((k: string, wert: number | null) => setAntworten((a) => ({ ...a, [k]: wert })), []);
  const onToggle = useCallback((r: number, c: number) => {
    setMarkiert((m) => {
      const n = m.map((z) => [...z]);
      n[r][c] = !n[r][c];
      return n;
    });
  }, []);

  function verlassen() {
    if (!window.confirm("Simulation verlassen? Die Zeit läuft weiter – du kannst später fortsetzen.")) return;
    flush();
    navigate("/simulation");
  }

  function starten() {
    const t = Date.now();
    void store.aendern<SimulationsErgebnis>("simulationen", id, { start: t, lauf: { block: 0, blockStart: t } });
    setJetzt(t);
  }

  /* ================================================================ Darstellung */

  if (!lauf)
    return (
      <Vorbereitung
        doc={doc}
        ablauf={ablauf}
        bereit={!!inhalt}
        onStart={starten}
        onVerlassen={() => navigate("/simulation")}
      />
    );

  if (!block || !inhalt)
    return (
      <Vollbild>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Testheft wird vorbereitet …</p>
        </div>
      </Vollbild>
    );

  const blockEndeZeit = uhrzeit(new Date(lauf.blockStart + block.minuten * 60_000));
  const fragenAnzahl = aktuelleGruppe ? loesungenFuer(inhalt, aktuelleGruppe).length : 0;
  const zeigeBogen = bogen.length > 0 && block.phase !== "einpraegen" && block.phase !== "heftwechsel" && block.gruppe !== "konz";

  return (
    <Vollbild>
      {/* Kopf mit zentraler Uhr */}
      <header className="sticky top-0 z-20 border-b-2 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <button type="button" onClick={verlassen} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Simulation verlassen">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Teil {block.teil} · {idx + 1}/{ablauf.length}
            </p>
            <p className="truncate text-sm font-extrabold leading-tight">{phaseText(block)}</p>
          </div>
          <div className="flex flex-col items-center" aria-live="off">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Uhrzeit</span>
            <span className="font-mono text-3xl font-extrabold leading-none tabular-nums">{uhrzeit(new Date(jetzt))}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-end text-right">
            <span className="text-[11px] font-semibold text-muted-foreground">Ende {blockEndeZeit}</span>
            {restZeigen ? (
              <span className={cn("font-mono text-sm font-bold tabular-nums", rest <= 60 && "text-flamme")}>noch {dauerText(rest)}</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">wie im Test</span>
            )}
            <button
              type="button"
              className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
              onClick={() => {
                setRestZeigen((x) => !x);
                schreiben("munggi-sim-restzeit", restZeigen ? "nein" : "ja");
              }}
            >
              {restZeigen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} Restzeit
            </button>
          </div>
        </div>
        {simArtVon(doc) === "generalprobe" && (
          <p className="mx-auto max-w-6xl px-3 pb-1.5 text-[11px] text-muted-foreground">
            Plan laut Testbeginn: {block.start}–{block.ende}
          </p>
        )}
      </header>

      <AnimatePresence mode="wait">
        {heftZu ? (
          <motion.div key="heftzu" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <MeinMunggi zustand="fokussiert" className="h-28 w-28" />
            <h2 className="text-3xl font-extrabold">Heft zu!</h2>
            <p className="max-w-xs text-muted-foreground">Stifte weg. Die Zeit für «{phaseText(block)}» ist um.</p>
            {idx + 1 < ablauf.length && <p className="text-sm font-semibold">Gleich: {phaseText(ablauf[idx + 1])}</p>}
          </motion.div>
        ) : (
          <motion.div key={block.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto w-full max-w-6xl flex-1 px-3 pb-36 pt-3 lg:pb-8">
            <div className={cn(zeigeBogen && "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5")}>
              <div className="flex min-w-0 flex-col gap-4">
                {block.hinweis && <p className="rounded-xl bg-muted p-2.5 text-xs font-semibold">{block.hinweis}</p>}
                <BlockInhalt
                  block={block}
                  inhalt={inhalt}
                  nr={nr}
                  setNr={setNr}
                  antworten={antworten}
                  markiert={markiert}
                  onToggle={onToggle}
                  rest={rest}
                  onWeiter={() => blockEnde(false)}
                />
                {block.phase !== "heftwechsel" && (
                  <Button
                    variant="outline"
                    className="self-center"
                    onClick={() => {
                      if (window.confirm(block.phase === "einpraegen" ? "Einprägen jetzt beenden?" : "Gruppe jetzt abgeben? Im Test wartest du bis zum Ende – nutze die Zeit zum Prüfen.")) blockEnde(false);
                    }}
                  >
                    {block.phase === "einpraegen" ? "Einprägen beenden" : "Gruppe abgeben"}
                  </Button>
                )}
              </div>

              {zeigeBogen && (
                <aside className="hidden lg:block">
                  <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border-2 bg-card p-3">
                    <h2 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold">
                      <PenLine className="h-4 w-4" /> Antwortbogen
                    </h2>
                    <AntwortbogenSim gruppen={bogen} antworten={antworten} onAntwort={onAntwort} aktuell={aktuelleGruppe ? { gruppe: aktuelleGruppe, i: nr } : undefined} onWaehle={(_, i) => setNr(i)} />
                  </div>
                </aside>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handy/Tablet: Leiste mit der aktuellen Zeile des Antwortbogens + ausklappbarer Bogen */}
      {zeigeBogen && !heftZu && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
            {aktuelleGruppe && fragenAnzahl > 0 ? (
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Antwortbogen · Nr. {nr + 1}</p>
                <AntwortZeile gruppe={aktuelleGruppe} i={nr} antworten={antworten} onAntwort={onAntwort} />
              </div>
            ) : (
              <p className="flex-1 text-xs text-muted-foreground">Leere Felder früherer Gruppen</p>
            )}
            <Button variant="outline" size="sm" onClick={() => setBogenOffen(true)} aria-label="Ganzen Antwortbogen öffnen">
              <ClipboardList /> Bogen
            </Button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {bogenOffen && zeigeBogen && (
          <>
            <motion.div key="hg" className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBogenOffen(false)} />
            <motion.div
              key="sheet"
              role="dialog"
              aria-label="Antwortbogen"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t-2 bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-extrabold">
                  <PenLine className="h-4 w-4" /> Antwortbogen
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setBogenOffen(false)} aria-label="Antwortbogen schliessen">
                  <X />
                </Button>
              </div>
              <AntwortbogenSim
                gruppen={bogen}
                antworten={antworten}
                onAntwort={onAntwort}
                aktuell={aktuelleGruppe ? { gruppe: aktuelleGruppe, i: nr } : undefined}
                onWaehle={(_, i) => {
                  setNr(i);
                  setBogenOffen(false);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Vollbild>
  );
}

/** Ernstfall im Vollbild: keine Navigation, nichts lenkt ab. */
function Vollbild({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto overflow-x-hidden bg-background text-foreground">{children}</div>;
}

/* ------------------------------------------------------------------ Vorbereitung */

function Vorbereitung({ doc, ablauf, bereit, onStart, onVerlassen }: {
  doc: SimulationsErgebnis;
  ablauf: AblaufBlock[];
  bereit: boolean;
  onStart: () => void;
  onVerlassen: () => void;
}) {
  const [jetzt, setJetzt] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const generalprobe = simArtVon(doc) === "generalprobe";
  const jetztMin = zeitZuMinuten(uhrzeit(new Date(jetzt)));
  const bisStart = generalprobe && doc.geplanterStart ? zeitZuMinuten(doc.geplanterStart) - jetztMin : 0;
  const titel = generalprobe ? "Testtag-Generalprobe" : simArtVon(doc) === "mini" ? "Mini-Simulation" : doc.art === "voll" ? "Volle Simulation" : doc.art === "teil-a" ? "Teil A" : "Teil B";
  const start = generalprobe ? doc.geplanterStart! : uhrzeit(new Date(jetzt));
  const s = zeitZuMinuten(start);
  return (
    <Vollbild>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onVerlassen} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Zurück">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold">{titel}</h1>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3">
          <MeinMunggi zustand="fokussiert" className="h-16 w-16 shrink-0" animiert />
          <div className="text-sm">
            <p className="font-bold">Bereit? {minutenText(gesamtMinuten(ablauf))} am Stück.</p>
            <p className="text-muted-foreground">Handy auf lautlos, Wasser bereit, Konzeptpapier und Stift daneben.</p>
          </div>
        </div>
        {generalprobe && (
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-bold">Start zur echten Testzeit: {doc.geplanterStart}</p>
            <p className="text-muted-foreground">
              {bisStart > 0 ? `Noch ${minutenText(bisStart)} bis zum Testbeginn. Starte möglichst genau dann.` : "Der Testbeginn ist erreicht – los geht's."} Keine Mittagspause, nur der Heftwechsel.
            </p>
          </div>
        )}
        <ol className="flex flex-col rounded-2xl border-2 p-3 text-sm">
          {ablauf.map((b) => (
            <li key={b.id} className="flex items-baseline gap-2 border-b border-dashed py-1 last:border-0">
              <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{minutenZuZeit(s + b.versatz)}</span>
              <span className="min-w-0 flex-1 font-semibold">{phaseText(b)}</span>
              <span className="shrink-0 text-xs tabular-nums">{b.minuten} min</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">Kein Zurückblättern in frühere Gruppen. Markiere sofort auf dem Antwortbogen. Kein Abzug – also immer ankreuzen.</p>
        <Link to="/fokus" className="flex items-center gap-2 self-start text-sm font-semibold text-primary">
          <Wind className="h-4 w-4" /> 1 Minute Fokus
        </Link>
        <Button size="lg" onClick={onStart} disabled={!bereit}>
          {bereit ? (
            <>
              <Play /> {generalprobe && bisStart > 0 ? "Trotzdem jetzt starten" : "Start"}
            </>
          ) : (
            <>
              <Loader2 className="animate-spin" /> Testheft wird vorbereitet …
            </>
          )}
        </Button>
      </div>
    </Vollbild>
  );
}

/* ------------------------------------------------------------------ Blockinhalt */

function Nummern({ anzahl, nr, setNr, beantwortet }: { anzahl: number; nr: number; setNr: (i: number) => void; beantwortet: (i: number) => boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={nr === 0} onClick={() => setNr(nr - 1)} aria-label="Vorherige Aufgabe">
          <ChevronLeft />
        </Button>
        <p className="flex-1 text-center text-sm font-bold">
          Aufgabe {nr + 1} von {anzahl}
        </p>
        <Button variant="outline" size="icon" disabled={nr >= anzahl - 1} onClick={() => setNr(nr + 1)} aria-label="Nächste Aufgabe">
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: anzahl }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setNr(i)}
            aria-label={`Aufgabe ${i + 1}${beantwortet(i) ? ", markiert" : ""}`}
            aria-current={i === nr}
            className={cn(
              "h-7 rounded-md border text-[11px] font-bold tabular-nums",
              i === nr ? "border-primary bg-primary text-primary-foreground" : beantwortet(i) ? "border-foreground/30 bg-muted" : "bg-card text-muted-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function NurLesenOptionen({ optionen }: { optionen: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {optionen.map((o, k) => (
        <li key={k} className="flex items-center gap-2 rounded-xl border-2 bg-card p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold">{BUCHSTABEN[k]}</span>
          <span className="text-[15px] leading-snug">{o}</span>
        </li>
      ))}
    </ol>
  );
}

function Hinweis({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-muted-foreground">{children}</p>;
}

function BlockInhalt({ block, inhalt, nr, setNr, antworten, markiert, onToggle, rest, onWeiter }: {
  block: AblaufBlock;
  inhalt: SimInhalt;
  nr: number;
  setNr: (i: number) => void;
  antworten: Record<string, number | null>;
  markiert: boolean[][];
  onToggle: (r: number, c: number) => void;
  rest: number;
  onWeiter: () => void;
}) {
  const g = block.gruppe as AufgabenGruppe | null;
  const beantwortet = (i: number) => g !== null && antworten[antwortSchluessel(g, i)] !== null && antworten[antwortSchluessel(g, i)] !== undefined;

  /* Heftwechsel */
  if (block.phase === "heftwechsel")
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Coffee className="h-10 w-10 text-primary" />
        <h2 className="text-2xl font-extrabold">Heftwechsel</h2>
        <p className="max-w-sm text-muted-foreground">Testheft A wird eingesammelt, Testheft B ausgeteilt. Kurz aufstehen, trinken, durchatmen – keine Mittagspause.</p>
        <p className="font-mono text-5xl font-extrabold tabular-nums">{dauerText(rest)}</p>
        <MeinMunggi zustand="ermutigt" className="h-24 w-24" animiert />
        <Button size="lg" onClick={onWeiter}>
          Pause beenden – weiter mit Teil B
        </Button>
      </div>
    );

  /* Einprägen */
  if (block.phase === "einpraegen") {
    const sperre = (
      <p className="flex items-center gap-2 rounded-xl border-2 border-gold/50 bg-gold/10 p-2.5 text-sm font-semibold">
        <Lock className="h-4 w-4 shrink-0" /> Keine Notizen – in den Gedächtnistests sind sie verboten. Nur im Kopf einprägen.
      </p>
    );
    if (g === "figuren-lernen" && inhalt.figuren)
      return (
        <div className="flex flex-col gap-3">
          {sperre}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inhalt.figuren.figuren.map((f, k) => (
              <FigurBild key={k} figur={f} modus="lernen" className="w-full" />
            ))}
          </div>
        </div>
      );
    if (g === "fakten-lernen" && inhalt.fakten)
      return (
        <div className="flex flex-col gap-3">
          {sperre}
          {Array.from({ length: Math.max(...inhalt.fakten.faelle.map((f) => f.gruppe)) + 1 }, (_, k) => (
            <div key={k} className="flex flex-col gap-1.5 rounded-xl border-2 bg-card p-3">
              <p className="text-xs font-extrabold uppercase text-muted-foreground">Gruppe {k + 1}</p>
              {inhalt.fakten!.faelle
                .filter((f) => f.gruppe === k)
                .map((f) => (
                  <p key={f.id} className="text-[15px]">
                    {fallText(f)}
                  </p>
                ))}
            </div>
          ))}
        </div>
      );
    return null;
  }

  /* Konz */
  if (g === "konz" && inhalt.konz) {
    const regel = konzRegel(inhalt.konz.regelId);
    const anzahl = markiert.flat().filter(Boolean).length;
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border-2 bg-card p-3 text-sm">
          <p className="font-bold">{regel.titel}</p>
          <p>{regel.anweisung}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Zeile für Zeile von links nach rechts. Tippen = durchstreichen, nochmals tippen = zurücknehmen. Gewertet wird bis zur letzten Markierung. {KONZ_ZEILEN} Zeilen · {anzahl} markiert
          </p>
        </div>
        <KonzBlattAnsicht blatt={inhalt.konz} markiert={markiert} onToggle={onToggle} />
      </div>
    );
  }

  if (!g) return null;

  /* Abruf */
  if (block.phase === "abruf") {
    if (g === "figuren-lernen" && inhalt.figuren) {
      const f = inhalt.figuren.figuren[inhalt.figuren.abfrage[nr]];
      return (
        <div className="flex flex-col gap-3">
          <Nummern anzahl={inhalt.figuren.abfrage.length} nr={nr} setNr={setNr} beantwortet={beantwortet} />
          <p className="font-bold">Welche Fläche war schwarz?</p>
          {f && <FigurBild figur={f} modus="abruf" className="mx-auto w-full max-w-xs" />}
          <Hinweis>Markiere A–E auf dem Antwortbogen.</Hinweis>
        </div>
      );
    }
    if (g === "fakten-lernen" && inhalt.fakten) {
      const q = inhalt.fakten.fragen[nr];
      return (
        <div className="flex flex-col gap-3">
          <Nummern anzahl={inhalt.fakten.fragen.length} nr={nr} setNr={setNr} beantwortet={beantwortet} />
          {q && (
            <>
              <p className="font-bold">{q.frage}</p>
              <NurLesenOptionen optionen={q.optionen} />
            </>
          )}
          <Hinweis>Markiere auf dem Antwortbogen.</Hinweis>
        </div>
      );
    }
    return null;
  }

  /* Bearbeiten: Einzelaufgaben und Text */
  const liste = inhalt.aufgaben[g] ?? [];
  const s = liste[nr];
  if (!s) return <p className="text-sm text-muted-foreground">Für diese Gruppe konnten keine Aufgaben erzeugt werden.</p>;
  const text = g === "textverstaendnis" && s.text !== undefined ? inhalt.texte[s.text] : undefined;
  return (
    <div className="flex flex-col gap-4">
      <Nummern anzahl={liste.length} nr={nr} setNr={setNr} beantwortet={beantwortet} />
      {text && <LeseText titel={`Text ${s.text! + 1}: ${text.titel}`} absaetze={text.absaetze} />}
      <Stimulus aufgabe={s.aufgabe} />
      <p className="font-bold">
        {nr + 1}. {s.aufgabe.frage}
      </p>
      <Optionen aufgabe={s.aufgabe} gewaehlt={null} aufgedeckt={false} onWahl={() => {}} gesperrt />
      <Hinweis>Antwort auf dem Antwortbogen markieren – das Testheft zählt nicht.</Hinweis>
    </div>
  );
}
