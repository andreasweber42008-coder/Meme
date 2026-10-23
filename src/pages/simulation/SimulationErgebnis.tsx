import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BookmarkPlus, CheckCircle2, ChevronDown, ChevronUp, Clock, Info, Loader2, Target } from "lucide-react";
import type { AufgabenGruppe, Fehlerursache, SimulationsErgebnis, Versuch } from "@/daten/modelle";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import type { Option } from "@/aufgaben/typen";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { figurenDenkfehler } from "@/aufgaben/figuren";
import { konzRegel } from "@/aufgaben/konz";
import { methodeById } from "@/content";
import { abzeichenVergeben, fehlerEintragen, xpGeben } from "@/lernpfad/protokoll";
import { ABZEICHEN, XP } from "@/lib/gamification";
import { heute, formatTag } from "@/lib/datum";
import { neueId } from "@/lib/zufall";
import { antwortSchluessel, gesamtMinuten, gruppenIm, GRUPPEN_INFO, loesungenFuer, type SimInhalt } from "@/simulation/ablauf";
import { ablaufFuer, dauerText, simArtVon, useSimInhalt } from "@/simulation/lauf";
import { FehlerAnalyse, URSACHEN } from "@/lektion/gemeinsam";
import { Optionen, Stimulus, LeseText } from "@/components/aufgaben/AufgabeAnsicht";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ART_TITEL: Record<SimulationsErgebnis["art"], string> = { voll: "Volle Simulation", "teil-a": "Halbe Simulation: Teil A", "teil-b": "Halbe Simulation: Teil B", generalprobe: "Testtag-Generalprobe" };

interface FehlerItem {
  key: string;
  gruppe: AufgabenGruppe;
  nr: number;
  antwort: number | null;
  loesung: number;
  frage: string;
  optionen: string[];
  option?: Option;
  methodeId: string;
  ref: { art: "generator"; generator: string; seed: string; schwierigkeit: number };
}

function fehlerSammeln(inhalt: SimInhalt, gruppen: AufgabenGruppe[], antworten: Record<string, number | null | undefined>): FehlerItem[] {
  const out: FehlerItem[] = [];
  for (const g of gruppen) {
    if (g === "konz") continue;
    const loesungen = loesungenFuer(inhalt, g);
    loesungen.forEach((l, i) => {
      const key = antwortSchluessel(g, i);
      const a = antworten[key];
      const antwort = a === undefined ? null : a;
      if (antwort === l) return;
      if (g === "figuren-lernen" && inhalt.figuren) {
        const set = inhalt.figuren;
        const df = antwort !== null ? figurenDenkfehler(set, set.abfrage[i], antwort) : undefined;
        out.push({
          key, gruppe: g, nr: i, antwort, loesung: l, frage: "Welche Fläche war schwarz?", optionen: [...BUCHSTABEN],
          option: df ? { text: BUCHSTABEN[antwort!], denkfehler: df.text, schritt: df.schritt } : undefined,
          methodeId: "figuren-unikat", ref: { art: "generator", generator: "figuren", seed: `${set.seed}:${i}`, schwierigkeit: 4 },
        });
      } else if (g === "fakten-lernen" && inhalt.fakten) {
        const q = inhalt.fakten.fragen[i];
        const df = antwort !== null ? q.denkfehler[antwort] : null;
        out.push({
          key, gruppe: g, nr: i, antwort, loesung: l, frage: q.frage, optionen: q.optionen,
          option: antwort !== null ? { text: q.optionen[antwort], denkfehler: df?.text, schritt: df?.schritt } : undefined,
          methodeId: "fakten-loci", ref: { art: "generator", generator: "fakten", seed: `${inhalt.fakten.seed}:${i}`, schwierigkeit: 3 },
        });
      } else {
        const s = inhalt.aufgaben[g]?.[i];
        if (!s) return;
        out.push({
          key, gruppe: g, nr: i, antwort, loesung: l, frage: s.aufgabe.frage, optionen: s.aufgabe.optionen.map((o) => o.text),
          option: antwort !== null ? s.aufgabe.optionen[antwort] : undefined,
          methodeId: s.aufgabe.methodeId, ref: { art: "generator", generator: s.aufgabe.generator, seed: s.aufgabe.seed, schwierigkeit: s.schwierigkeit },
        });
      }
    });
  }
  return out;
}

export default function SimulationErgebnis() {
  const { id = "" } = useParams();
  const doc = useDokument<SimulationsErgebnis>("simulationen", id);
  if (!doc)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold">Dieses Ergebnis gibt es nicht (mehr).</p>
        <Link to="/simulation" className="font-semibold text-primary">
          Zur Simulation
        </Link>
      </div>
    );
  if (!doc.abgeschlossen)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-bold">Diese Simulation läuft noch.</p>
        <Link to={`/simulation/lauf/${id}`} className="font-semibold text-primary">
          Fortsetzen
        </Link>
      </div>
    );
  return <Ergebnis id={id} doc={doc} />;
}

function Ergebnis({ id, doc }: { id: string; doc: SimulationsErgebnis & { id: string } }) {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const ablauf = useMemo(() => ablaufFuer(doc), [doc.art, doc.mini, doc.heftwechselMinuten, doc.geplanterStart, doc.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const gruppen = useMemo(() => gruppenIm(ablauf), [ablauf]);
  const inhalt = useSimInhalt(doc.seed, ablauf);
  const antworten = useMemo(() => doc.antworten ?? {}, [doc.antworten]);
  const fehler = useMemo(() => (inhalt ? fehlerSammeln(inhalt, gruppen, antworten) : []), [inhalt, gruppen, antworten]);

  /* ---------------- Belohnung (einmal) + Versuche für die Statistik */
  const belohnt = useRef(false);
  useEffect(() => {
    if (belohnt.current || doc.belohnt) return;
    if (doc.seed && !inhalt) return; // auf Inhalt warten, damit die Versuche mitgespeichert werden
    belohnt.current = true;
    void (async () => {
      await store.aendern<SimulationsErgebnis>("simulationen", id, { belohnt: true });
      const minuten = doc.blockSekunden ? Math.round(Object.values(doc.blockSekunden).reduce((s, x) => s + x, 0) / 60) : gesamtMinuten(ablauf.filter((b) => b.phase !== "heftwechsel"));
      if (inhalt) {
        const jetzt = Date.now();
        const tag = heute();
        const versuche: Array<{ sammlung: string; id: string; daten: Versuch; geloescht: boolean; geaendert: number }> = [];
        for (const g of gruppen) {
          if (g === "konz") continue;
          const block = ablauf.find((b) => b.gruppe === g && b.phase !== "einpraegen");
          const loesungen = loesungenFuer(inhalt, g);
          const dauer = block && loesungen.length ? Math.round(((doc.blockSekunden?.[block.id] ?? block.minuten * 60) * 1000) / loesungen.length) : 0;
          loesungen.forEach((l, i) => {
            const a = antworten[antwortSchluessel(g, i)] ?? null;
            const s = inhalt.aufgaben[g]?.[i];
            versuche.push({
              sammlung: "versuche",
              id: neueId(),
              geloescht: false,
              geaendert: jetzt,
              daten: {
                zeit: jetzt, tag, gruppe: g, quelle: "simulation",
                methodeId: s?.aufgabe.methodeId,
                generator: s?.aufgabe.generator ?? (g === "figuren-lernen" ? "figuren" : "fakten"),
                seed: s?.aufgabe.seed ?? `${g === "figuren-lernen" ? inhalt.figuren?.seed : inhalt.fakten?.seed}:${i}`,
                schwierigkeit: s?.schwierigkeit,
                antwort: a, loesung: l, richtig: a === l, dauerMs: dauer,
                zielMs: block ? Math.round((block.minuten * 60_000) / Math.max(1, loesungen.length)) : undefined,
              },
            });
          });
        }
        if (versuche.length) await store.einmischen(versuche, false);
      }
      await xpGeben(store, XP.simulation, { minuten, erledigt: doc.planId });
      await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "erste-simulation")!);
      if ((doc.art === "voll" || doc.art === "generalprobe") && !doc.mini) await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "volle-simulation")!);
    })();
  }, [doc, inhalt, store, id, ablauf, gruppen, antworten]);

  /* ---------------- Fehlerheft-Auswahl */
  const [auswahl, setAuswahl] = useState<Record<string, { an: boolean; ursache: Fehlerursache }>>({});
  const [offen, setOffen] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const schon = new Set(doc.imFehlerheft ?? []);
  const wert = (f: FehlerItem) => auswahl[f.key] ?? { an: !schon.has(f.key), ursache: f.antwort === null ? ("zeitnot" as const) : ("denkfehler" as const) };
  const gewaehlt = fehler.filter((f) => !schon.has(f.key) && wert(f).an);

  function alleUrsache(u: Fehlerursache) {
    setAuswahl(Object.fromEntries(fehler.map((f) => [f.key, { ...wert(f), ursache: u }])));
  }

  async function insFehlerheft() {
    setSpeichert(true);
    try {
      for (const f of gewaehlt)
        await fehlerEintragen(store, {
          gruppe: f.gruppe,
          methodeId: f.methodeId,
          schritt: f.option?.schritt,
          ursache: wert(f).ursache,
          denkfehler: f.option?.denkfehler,
          ref: f.ref,
        });
      await store.aendern<SimulationsErgebnis>("simulationen", id, { imFehlerheft: [...schon, ...gewaehlt.map((f) => f.key)] });
      toast.success(`${gewaehlt.length} Aufgaben im Fehlerheft`);
    } finally {
      setSpeichert(false);
    }
  }

  /* ---------------- Darstellung */
  const titel = simArtVon(doc) === "mini" ? "Mini-Simulation" : ART_TITEL[doc.art];
  const summe = gruppen.reduce((s, g) => s + (doc.gruppen[g]?.punkte ?? doc.gruppen[g]?.richtig ?? 0), 0);
  const maxSumme = gruppen.reduce((s, g) => s + (g === "konz" ? 18 : (doc.gruppen[g]?.gesamt ?? 0)), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <MeinMunggi zustand="feiert" className="h-24 w-24" animiert />
        <h1 className="text-2xl font-extrabold">Geschafft!</h1>
        <p className="text-sm text-muted-foreground">
          {titel}
          {doc.quelle === "papier" ? " auf Papier" : ""} · {formatTag(doc.tag, "mittel")}
        </p>
        <p className="text-3xl font-extrabold tabular-nums">
          {summe} <span className="text-base font-bold text-muted-foreground">/ {maxSumme} Punkte</span>
        </p>
        <p className="font-bold text-gold">+{XP.simulation} XP</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border-2 p-3" aria-label="Ergebnis pro Gruppe">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Target className="h-4 w-4" /> Pro Gruppe – verglichen mit deinem Ziel
        </h2>
        {gruppen.map((g) => {
          const r = doc.gruppen[g];
          if (!r) return null;
          const konz = g === "konz";
          const quote = konz ? (r.punkte ?? 0) / 18 : r.gesamt ? r.richtig / r.gesamt : 0;
          const ziel = e.ziele[g]?.genauigkeit ?? 0.75;
          const bloecke = ablauf.filter((b) => b.gruppe === g);
          const leer = konz ? 0 : loesungenFuer(inhalt ?? ({ aufgaben: {}, texte: [], seed: "" } as SimInhalt), g).filter((_, i) => (antworten[antwortSchluessel(g, i)] ?? null) === null).length;
          return (
            <div key={g} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-bold">{GRUPPEN_INFO[g].kurz}</span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums">
                  {konz ? `${r.punkte ?? 0} / 18 Punkte` : `${r.richtig} / ${r.gesamt}`}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-muted" role="img" aria-label={`${Math.round(quote * 100)} % – Ziel ${Math.round(ziel * 100)} %`}>
                <div className={cn("h-full rounded-full", quote >= ziel ? "bg-richtig" : "bg-primary")} style={{ width: `${Math.max(2, Math.min(100, quote * 100))}%` }} />
                <div className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: `${ziel * 100}%` }} title={`Ziel ${Math.round(ziel * 100)} %`} />
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>
                  {Math.round(quote * 100)} % · Ziel {Math.round(ziel * 100)} %
                </span>
                {konz && doc.konz && (
                  <span>
                    Rohwert {doc.konz.rohwert} ({doc.konz.richtig} richtig − {doc.konz.falsch} falsch − {doc.konz.uebersehen} übersehen)
                  </span>
                )}
                {!konz && leer > 0 && <span>{leer} leer</span>}
                {doc.blockSekunden &&
                  bloecke.map((b) => (
                    <span key={b.id} className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {b.phase === "einpraegen" ? "Einprägen " : b.phase === "abruf" ? "Abruf " : ""}
                      {doc.blockSekunden![b.id] !== undefined ? dauerText(doc.blockSekunden![b.id]) : "–"} / {b.minuten}:00
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
        {doc.konz && (
          <p className="text-[11px] text-muted-foreground">
            Konz-Punkte: Näherung über die Umrechnungstabelle der offiziellen Konz-Beispiele ({konzRegel(doc.konz.regelId).titel}). Echte Punkte werden jedes Jahr aus allen Ergebnissen berechnet.
          </p>
        )}
      </section>

      <p className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Im EMS sind im Schnitt nur etwa 50 % richtig. Zähl auf dein Ziel pro Gruppe – Punkte sind zwischen Jahren nicht vergleichbar.</span>
      </p>

      {/* ---------------- Fehler */}
      <section className="flex flex-col gap-3" aria-label="Falsche und leere Antworten">
        <h2 className="text-lg font-extrabold">Falsch oder leer ({fehler.length})</h2>
        {!inhalt && doc.seed ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Aufgaben werden geladen …
          </p>
        ) : fehler.length === 0 ? (
          <p className="flex items-center gap-2 font-bold text-richtig">
            <CheckCircle2 className="h-5 w-5" /> Alles richtig!
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-2xl border-2 p-3">
              <p className="text-xs font-bold text-muted-foreground">Ursache für alle setzen</p>
              <div className="flex flex-wrap gap-1.5">
                {URSACHEN.map((u) => (
                  <button key={u.id} type="button" onClick={() => alleUrsache(u.id)} className="rounded-full border-2 bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary">
                    {u.text}
                  </button>
                ))}
              </div>
              <Button onClick={() => void insFehlerheft()} disabled={gewaehlt.length === 0 || speichert}>
                <BookmarkPlus /> {gewaehlt.length > 0 ? `${gewaehlt.length} ins Fehlerheft` : "Alles im Fehlerheft"}
              </Button>
            </div>
            {gruppen
              .filter((g) => fehler.some((f) => f.gruppe === g))
              .map((g) => (
                <div key={g} className="flex flex-col gap-2">
                  <h3 className="text-sm font-extrabold">{GRUPPEN_INFO[g].kurz}</h3>
                  {fehler
                    .filter((f) => f.gruppe === g)
                    .map((f) => {
                      const w = wert(f);
                      const methode = methodeById(f.methodeId);
                      const drin = schon.has(f.key);
                      return (
                        <div key={f.key} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-3">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                              checked={drin || w.an}
                              disabled={drin}
                              onChange={(ev) => setAuswahl((a) => ({ ...a, [f.key]: { ...w, an: ev.target.checked } }))}
                              aria-label={`Aufgabe ${f.nr + 1} ins Fehlerheft`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">
                                Nr. {f.nr + 1} · {f.antwort === null ? "leer" : `deine: ${BUCHSTABEN[f.antwort]}`} · richtig: {BUCHSTABEN[f.loesung]}
                                {drin && <span className="ml-1 text-xs font-semibold text-richtig">im Fehlerheft</span>}
                              </p>
                              <p className="line-clamp-2 text-sm text-muted-foreground">{f.frage}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setOffen(offen === f.key ? null : f.key)} aria-label={offen === f.key ? "Aufgabe zuklappen" : "Aufgabe ansehen"}>
                              {offen === f.key ? <ChevronUp /> : <ChevronDown />}
                            </Button>
                          </div>
                          {offen === f.key && inhalt && <AufgabeDetail inhalt={inhalt} f={f} />}
                          {methode ? (
                            <FehlerAnalyse
                              option={f.option}
                              methode={methode}
                              ursache={w.ursache}
                              onUrsache={(u) => setAuswahl((a) => ({ ...a, [f.key]: { ...w, ursache: u } }))}
                              kurz={drin}
                            />
                          ) : (
                            f.option?.denkfehler && <p className="text-sm">{f.option.denkfehler}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
          </>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Link to="/simulation" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
          Zur Simulation
        </Link>
        <Link to="/" className="py-2 text-center text-sm font-semibold text-muted-foreground">
          Zurück zu Heute
        </Link>
      </div>
    </div>
  );
}

function AufgabeDetail({ inhalt, f }: { inhalt: SimInhalt; f: FehlerItem }) {
  if (f.gruppe === "figuren-lernen" && inhalt.figuren) {
    const fig = inhalt.figuren.figuren[inhalt.figuren.abfrage[f.nr]];
    return (
      <div className="grid grid-cols-2 gap-2">
        <FigurBild figur={fig} modus="lernen" className="w-full" />
        <FigurBild figur={fig} modus="abruf" gewaehlt={f.antwort} richtig className="w-full" />
      </div>
    );
  }
  if (f.gruppe === "fakten-lernen") {
    return (
      <ol className="flex flex-col gap-1 text-sm">
        {f.optionen.map((o, k) => (
          <li key={k} className={cn("rounded-lg border-2 p-2", k === f.loesung && "border-richtig bg-richtig/10", k === f.antwort && k !== f.loesung && "border-falsch bg-falsch/10")}>
            <b>{BUCHSTABEN[k]}</b> {o}
          </li>
        ))}
      </ol>
    );
  }
  const s = inhalt.aufgaben[f.gruppe]?.[f.nr];
  if (!s) return null;
  const text = s.text !== undefined ? inhalt.texte[s.text] : undefined;
  return (
    <div className="flex flex-col gap-3">
      {text && <LeseText titel={text.titel} absaetze={text.absaetze} />}
      <Stimulus aufgabe={s.aufgabe} />
      <p className="font-bold">{s.aufgabe.frage}</p>
      <Optionen aufgabe={s.aufgabe} gewaehlt={f.antwort} aufgedeckt onWahl={() => {}} />
      {s.aufgabe.loesungsweg.length > 0 && (
        <ol className="flex list-decimal flex-col gap-1 rounded-xl bg-muted/60 p-3 pl-7 text-sm">
          {s.aufgabe.loesungsweg.map((l, k) => (
            <li key={k}>{l.text}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
