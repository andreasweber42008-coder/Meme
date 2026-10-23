import type { AufgabenGruppe } from "@/daten/modelle";
import type { Aufgabe } from "@/aufgaben/typen";
import { aufgabenErzeugen, type EinzelGeneratorId } from "@/aufgaben/register";
import { TEXT_BANK, textAufgaben, textEintrag, type TextEintrag } from "@/aufgaben/bank";
import { erzeugeFigurenSet, type FigurenSet } from "@/aufgaben/figuren";
import { erzeugeFaktenSet, type FaktenSet } from "@/aufgaben/fakten";
import { KONZ_REGELN, bewerten, erzeugeBlatt, konzRegel, punktwert, type KonzBlatt, type KonzWertung } from "@/aufgaben/konz";
import { minutenZuZeit, zeitZuMinuten } from "@/lib/datum";
import { Zufall } from "@/lib/zufall";

/**
 * Ablauf und Inhalt einer EMS-Simulation (reine Logik, ohne Oberfläche).
 * Zeiten und Reihenfolge nach docs/REFERENZ.md (Test-Info 2026).
 */

export type SimArt = "voll" | "teil-a" | "teil-b" | "mini" | "generalprobe";
export type BlockPhase = "bearbeiten" | "einpraegen" | "abruf" | "heftwechsel";
export type Teil = "A" | "B";

export const SIM_ARTEN: Array<{ id: SimArt; titel: string; kurz: string }> = [
  { id: "voll", titel: "Volle Simulation", kurz: "Alle 9 Gruppen, Teil A und B mit Heftwechsel" },
  { id: "teil-a", titel: "Halbe Simulation: Teil A", kurz: "Muster, Med-Nat, Objekte, Quanti, Einprägen" },
  { id: "teil-b", titel: "Halbe Simulation: Teil B", kurz: "Text, Abruf, Diagramme, Konz" },
  { id: "mini", titel: "Mini-Simulation", kurz: "2–4 Gruppen deiner Wahl mit Originalzeit" },
  { id: "generalprobe", titel: "Testtag-Generalprobe", kurz: "Voll, zur echten Testzeit, ohne Mittagspause" },
];

export function istSimArt(x: unknown): x is SimArt {
  return typeof x === "string" && SIM_ARTEN.some((a) => a.id === x);
}

export interface GruppenInfo {
  name: string;
  kurz: string;
  teil: Teil;
  /** Bearbeitungszeit (bei Gedächtnistests: Abruf) */
  minuten: number;
  /** Nur Gedächtnistests: Einprägezeit in Teil A */
  einpraegen?: number;
  anzahl: number;
}

/** Offizielle Zeiten (REFERENZ.md, Abschnitt 1) */
export const GRUPPEN_INFO: Record<AufgabenGruppe, GruppenInfo> = {
  "muster-zuordnen": { name: "Muster zuordnen", kurz: "Muster", teil: "A", minuten: 16, anzahl: 18 },
  "med-nat": { name: "Medizinisch-naturwissenschaftliches Grundverständnis", kurz: "Med-Nat", teil: "A", minuten: 45, anzahl: 18 },
  "objekte-im-raum": { name: "Objekte im Raum", kurz: "Objekte", teil: "A", minuten: 10, anzahl: 18 },
  quanti: { name: "Quantitative und formale Probleme", kurz: "Quanti", teil: "A", minuten: 45, anzahl: 18 },
  "figuren-lernen": { name: "Figuren lernen", kurz: "Figuren", teil: "A", einpraegen: 4, minuten: 5, anzahl: 18 },
  "fakten-lernen": { name: "Fakten lernen", kurz: "Fakten", teil: "A", einpraegen: 6, minuten: 6, anzahl: 18 },
  textverstaendnis: { name: "Textverständnis", kurz: "Text", teil: "B", minuten: 45, anzahl: 18 },
  "diagramme-tabellen": { name: "Diagramme und Tabellen", kurz: "Diagramme", teil: "B", minuten: 45, anzahl: 18 },
  konz: { name: "Konzentriertes und sorgfältiges Arbeiten", kurz: "Konz", teil: "B", minuten: 8, anzahl: 40 },
};

export const GEDAECHTNIS: AufgabenGruppe[] = ["figuren-lernen", "fakten-lernen"];
export const KONZ_ZEILEN = 40;
export const KONZ_SPALTEN = 40;
/** Fakten lernen: 15 Fälle in 5 Dreiergruppen */
export const FAKTEN_GRUPPEN = 5;
/** EMS-Zieltempo im Textverständnis: 15 Minuten pro Text */
export const MINUTEN_PRO_TEXT = 15;

export interface AblaufBlock {
  /** eindeutig, z. B. «quanti», «figuren-lernen:einpraegen», «heftwechsel» */
  id: string;
  gruppe: AufgabenGruppe | null;
  phase: BlockPhase;
  teil: Teil;
  minuten: number;
  /** Aufgaben (Einprägen: Figuren bzw. Fälle; Konz: Zeilen) */
  anzahl: number;
  /** Minuten ab Simulationsstart */
  versatz: number;
  start: string;
  ende: string;
  /** Übungsersatz (Teil B allein) bzw. Zusatz (Teil A allein) – nicht wie im echten Test */
  hinweis?: string;
}

type Roh = Omit<AblaufBlock, "versatz" | "start" | "ende">;

function bearbeiten(g: AufgabenGruppe, anzahl = GRUPPEN_INFO[g].anzahl, minuten = GRUPPEN_INFO[g].minuten): Roh {
  return { id: g, gruppe: g, phase: "bearbeiten", teil: GRUPPEN_INFO[g].teil, minuten, anzahl };
}
function einpraegen(g: AufgabenGruppe, teil: Teil = "A", hinweis?: string): Roh {
  return { id: `${g}:einpraegen`, gruppe: g, phase: "einpraegen", teil, minuten: GRUPPEN_INFO[g].einpraegen!, anzahl: g === "fakten-lernen" ? FAKTEN_GRUPPEN * 3 : 18, hinweis };
}
function abruf(g: AufgabenGruppe, teil: Teil = "B", hinweis?: string): Roh {
  return { id: `${g}:abruf`, gruppe: g, phase: "abruf", teil, minuten: GRUPPEN_INFO[g].minuten, anzahl: 18, hinweis };
}

export interface AblaufOptionen {
  art: SimArt;
  /** Startzeit «HH:MM» (Generalprobe: Testbeginn laut Einladung) */
  startZeit: string;
  heftwechselMinuten: number;
  /** Mini: gewählte Gruppen (2–4) */
  mini?: AufgabenGruppe[];
  /** verfügbare Texte in der Textbank (Standard 3 wie im EMS) */
  texte?: number;
}

/** Text-Block: 3 Texte à 6 Fragen in 45 Minuten. Bei weniger Texten in der Bank: 15 Minuten pro Text (gleiches Tempo). */
function textBlock(texte: number): Roh | null {
  const n = Math.min(3, Math.max(0, texte));
  if (n === 0) return null;
  return bearbeiten("textverstaendnis", n * 6, n === 3 ? GRUPPEN_INFO.textverstaendnis.minuten : n * MINUTEN_PRO_TEXT);
}

const TEIL_A_ARBEIT: AufgabenGruppe[] = ["muster-zuordnen", "med-nat", "objekte-im-raum", "quanti"];

function teilA(): Roh[] {
  return [...TEIL_A_ARBEIT.map((g) => bearbeiten(g)), einpraegen("figuren-lernen"), einpraegen("fakten-lernen")];
}

function teilB(texte: number): Roh[] {
  return [textBlock(texte), abruf("figuren-lernen"), abruf("fakten-lernen"), bearbeiten("diagramme-tabellen"), bearbeiten("konz")].filter((b): b is Roh => !!b);
}

/** Reihenfolge aller Gruppen im EMS (Einprägen nach Quanti, Abruf nach Text) */
const OFFIZIELL: string[] = teilA()
  .concat(teilB(3))
  .map((b) => b.id);

function zeitenSetzen(roh: Roh[], startZeit: string): AblaufBlock[] {
  const s = zeitZuMinuten(startZeit);
  let versatz = 0;
  return roh.map((b) => {
    const block = { ...b, versatz, start: minutenZuZeit(s + versatz), ende: minutenZuZeit(s + versatz + b.minuten) };
    versatz += b.minuten;
    return block;
  });
}

/**
 * Ablauf einer Simulation.
 *
 * - voll / generalprobe: Teil A → Heftwechsel (einstellbar, Standard 10 min, keine Mittagspause – F6) → Teil B.
 *   Figuren/Fakten: Einprägen am Ende von Teil A, Abruf nach dem Textverständnis in Teil B.
 * - teil-a: Teil A wie im Test. Weil kein Teil B folgt, kommt der Abruf der Gedächtnistests als Zusatz direkt danach –
 *   ein Einprägen ohne Abruf wäre wertlos. (Der Abstand ist kürzer als im Test.)
 * - teil-b: Im Test liegt das Einprägen in Teil A. Als Übungsersatz prägst du dir die Figuren und Fakten am Anfang
 *   von Teil B ein; das Textverständnis (45 min) liegt dann wie im Test zwischen Einprägen und Abruf.
 * - mini: gewählte Gruppen in offizieller Reihenfolge mit Originalzeit, ohne Heftwechsel. Gedächtnistests: Einprägen an
 *   der Stelle nach Quanti, Abruf an der Stelle nach Text.
 */
export function ablaufErstellen(o: AblaufOptionen): AblaufBlock[] {
  const texte = o.texte ?? 3;
  let roh: Roh[];
  switch (o.art) {
    case "voll":
    case "generalprobe":
      roh = [
        ...teilA(),
        { id: "heftwechsel", gruppe: null, phase: "heftwechsel", teil: "A", minuten: Math.max(0, o.heftwechselMinuten), anzahl: 0 },
        ...teilB(texte),
      ];
      if (o.heftwechselMinuten <= 0) roh = roh.filter((b) => b.phase !== "heftwechsel");
      break;
    case "teil-a":
      roh = [
        ...teilA(),
        abruf("figuren-lernen", "A", "Zusatz: Im Test kommt der Abruf erst in Teil B."),
        abruf("fakten-lernen", "A", "Zusatz: Im Test kommt der Abruf erst in Teil B."),
      ];
      break;
    case "teil-b":
      roh = [
        einpraegen("figuren-lernen", "B", "Übungsersatz: Im Test prägst du dir das am Ende von Teil A ein."),
        einpraegen("fakten-lernen", "B", "Übungsersatz: Im Test prägst du dir das am Ende von Teil A ein."),
        ...teilB(texte),
      ];
      break;
    case "mini": {
      const gewaehlt = new Set(o.mini ?? []);
      const alle: Roh[] = [...teilA(), ...teilB(texte)];
      roh = OFFIZIELL.map((id) => alle.find((b) => b.id === id)).filter((b): b is Roh => !!b && !!b.gruppe && gewaehlt.has(b.gruppe));
      break;
    }
  }
  return zeitenSetzen(roh, o.startZeit);
}

export function gesamtMinuten(ablauf: AblaufBlock[]): number {
  return ablauf.reduce((s, b) => s + b.minuten, 0);
}

/** Gruppen, die in einem Ablauf vorkommen (offizielle Reihenfolge, ohne Duplikate) */
export function gruppenIm(ablauf: AblaufBlock[]): AufgabenGruppe[] {
  return [...new Set(ablauf.flatMap((b) => (b.gruppe ? [b.gruppe] : [])))];
}

/** Welche gespeicherte «art» bekommt eine Mini-Simulation? Mehrheit der gewählten Gruppen (A oder B). */
export function miniArt(mini: AufgabenGruppe[]): "teil-a" | "teil-b" {
  const a = mini.filter((g) => GRUPPEN_INFO[g].teil === "A" && !GEDAECHTNIS.includes(g)).length;
  const b = mini.filter((g) => GRUPPEN_INFO[g].teil === "B").length;
  return b > a ? "teil-b" : "teil-a";
}

/* ------------------------------------------------------------------ Inhalt */

export const GENERATOR_FUER: Partial<Record<AufgabenGruppe, EinzelGeneratorId>> = {
  "muster-zuordnen": "muster",
  "med-nat": "mednat",
  "objekte-im-raum": "objekte",
  quanti: "quanti",
  "diagramme-tabellen": "diagramme",
};

export interface SimAufgabe {
  aufgabe: Aufgabe;
  /** angeforderte Schwierigkeit (für die Wiederherstellung im Fehlerheft) */
  schwierigkeit: number;
  /** Textverständnis: Index des Textes */
  text?: number;
}

export interface SimInhalt {
  seed: string;
  aufgaben: Partial<Record<AufgabenGruppe, SimAufgabe[]>>;
  texte: TextEintrag[];
  figuren?: FigurenSet;
  fakten?: FaktenSet;
  konz?: KonzBlatt;
}

/** Schwierigkeit steigt innerhalb jeder Gruppe (REFERENZ): 2 → 5 über 18 Aufgaben */
export function schwierigkeitFuer(i: number, anzahl = 18): number {
  return 2 + Math.min(3, Math.floor((i * 4) / anzahl));
}

function einzelAufgaben(gruppe: AufgabenGruppe, seed: string): SimAufgabe[] {
  const gen = GENERATOR_FUER[gruppe]!;
  const anzahl = GRUPPEN_INFO[gruppe].anzahl;
  const proStufe = new Map<number, number>();
  for (let i = 0; i < anzahl; i++) proStufe.set(schwierigkeitFuer(i, anzahl), (proStufe.get(schwierigkeitFuer(i, anzahl)) ?? 0) + 1);
  const gesperrt = new Set<string>();
  const merken = (a: Aufgabe) => {
    gesperrt.add(a.quelle ?? JSON.stringify(a.daten).slice(0, 400));
    gesperrt.add(`${a.generator}:${a.seed}`);
  };
  const out: SimAufgabe[] = [];
  for (const [stufe, n] of [...proStufe.entries()].sort((a, b) => a[0] - b[0])) {
    let fehlt = n;
    // Zu wenige (z. B. kleine Aufgabenbank): mit Nachbarstufen auffüllen
    for (const s of [stufe, stufe - 1, stufe + 1, 3, 1].filter((x) => x >= 1 && x <= 5)) {
      if (fehlt <= 0) break;
      const liste = aufgabenErzeugen(gen, fehlt, s, undefined, s === stufe ? `${seed}-${gen}-${stufe}` : `${seed}-${gen}-${stufe}-${s}`, gesperrt);
      for (const a of liste) {
        merken(a);
        out.push({ aufgabe: a, schwierigkeit: s });
      }
      fehlt -= liste.length;
    }
  }
  return out;
}

/** Bis zu 3 Texte; der Text-Seed wird so gewählt, dass aufgabeAus("text", …) den Text wiederfindet (Fehlerheft). */
function textInhalt(seed: string): { texte: TextEintrag[]; aufgaben: SimAufgabe[] } {
  const z = new Zufall(`${seed}:texte`);
  const gewaehlt = z.stichprobe(TEXT_BANK, Math.min(3, TEXT_BANK.length));
  const aufgaben: SimAufgabe[] = [];
  gewaehlt.forEach((t, k) => {
    let textSeed = `${seed}t${k}`;
    for (let j = 0; j < 2000; j++) {
      const s = `${seed}t${k}x${j}`;
      if (textEintrag(s)?.id === t.id) {
        textSeed = s;
        break;
      }
    }
    for (const a of textAufgaben(t, textSeed)) aufgaben.push({ aufgabe: a, schwierigkeit: a.schwierigkeit, text: k });
  });
  return { texte: gewaehlt, aufgaben };
}

export function konzRegelFuer(seed: string): string {
  return new Zufall(`${seed}:konz-regel`).waehle(KONZ_REGELN).id;
}

/** Seeds dürfen keinen Doppelpunkt enthalten (Text-Schlüssel «seed:nr»). */
export function seedBereinigen(seed: string): string {
  return seed.replace(/[^A-Za-z0-9_-]/g, "") || "seed";
}

/** Gesamter Inhalt aus einem Seed – reproduzierbar; jede Gruppe hat ihren eigenen Teil-Seed. */
export function inhaltErzeugen(seedRoh: string, gruppen: AufgabenGruppe[]): SimInhalt {
  const seed = seedBereinigen(seedRoh);
  const inhalt: SimInhalt = { seed, aufgaben: {}, texte: [] };
  for (const g of gruppen) {
    if (GENERATOR_FUER[g]) inhalt.aufgaben[g] = einzelAufgaben(g, seed);
    else if (g === "textverstaendnis") {
      const t = textInhalt(seed);
      inhalt.texte = t.texte;
      inhalt.aufgaben[g] = t.aufgaben;
    } else if (g === "figuren-lernen") inhalt.figuren = erzeugeFigurenSet(`${seed}fig`, 18, 4);
    else if (g === "fakten-lernen") inhalt.fakten = erzeugeFaktenSet(`${seed}fak`, FAKTEN_GRUPPEN, 18);
    else if (g === "konz") inhalt.konz = erzeugeBlatt(konzRegelFuer(seed), seed, KONZ_ZEILEN, KONZ_SPALTEN);
  }
  return inhalt;
}

/* ------------------------------------------------------------------ Antworten und Wertung */

export function antwortSchluessel(gruppe: AufgabenGruppe, i: number): string {
  return `${gruppe}:${i}`;
}

/** Richtige Antwort (0–4) pro Frage einer Gruppe; Konz hat keine Multiple-Choice-Fragen. */
export function loesungenFuer(inhalt: SimInhalt, gruppe: AufgabenGruppe): number[] {
  if (gruppe === "figuren-lernen") return inhalt.figuren ? inhalt.figuren.abfrage.map((idx) => inhalt.figuren!.figuren[idx].schwarz) : [];
  if (gruppe === "fakten-lernen") return inhalt.fakten?.fragen.map((f) => f.loesung) ?? [];
  if (gruppe === "konz") return [];
  return inhalt.aufgaben[gruppe]?.map((a) => a.aufgabe.loesung) ?? [];
}

export interface GruppenWertung {
  richtig: number;
  gesamt: number;
  leer: number;
  /** Konz: Punktwert 0–18 (Näherung) */
  punkte?: number;
  konz?: KonzWertung | { richtig: number; falsch: number; uebersehen: number; rohwert: number; punktwert: number };
}

/**
 * Wertung einer Gruppe: +1 pro richtiger Antwort. Leere Felder zählen als falsch, ohne weiteren Abzug
 * (REFERENZ: kein Abzug für falsche Antworten). Mehrfachmarkierungen gibt es im digitalen Bogen nicht;
 * auf dem Papierbogen werden sie als -1 erfasst und zählen 0 Punkte.
 */
export function gruppeWerten(loesungen: number[], antworten: Record<string, number | null | undefined>, gruppe: AufgabenGruppe): GruppenWertung {
  let richtig = 0;
  let leer = 0;
  loesungen.forEach((l, i) => {
    const a = antworten[antwortSchluessel(gruppe, i)];
    if (a === null || a === undefined) leer++;
    else if (a === l) richtig++;
  });
  return { richtig, gesamt: loesungen.length, leer };
}

/** Konz-Markierungen als Index-Liste (zeile × Spalten + spalte) → 2D-Matrix */
export function konzMatrix(indizes: number[], zeilen = KONZ_ZEILEN, spalten = KONZ_SPALTEN): boolean[][] {
  const m = Array.from({ length: zeilen }, () => new Array<boolean>(spalten).fill(false));
  for (const i of indizes) {
    const r = Math.floor(i / spalten);
    const c = i % spalten;
    if (r < zeilen) m[r][c] = true;
  }
  return m;
}

/** Konz aus Zählwerten (Papier-Auswertung mit Schablone) */
export function konzAusZahlen(regelId: string, richtig: number, falsch: number, uebersehen: number) {
  const rohwert = Math.max(0, richtig - falsch - uebersehen);
  return { richtig, falsch, uebersehen, rohwert, punktwert: punktwert(rohwert, konzRegel(regelId).tabelle) };
}

export function zielzeichen(blatt: KonzBlatt): number {
  return blatt.ziele.flat().filter(Boolean).length;
}

/** Alle Gruppen werten. Konz: aus Markierungen (digital) oder aus Zählwerten (Papier). */
export function simulationWerten(
  inhalt: SimInhalt,
  gruppen: AufgabenGruppe[],
  antworten: Record<string, number | null | undefined>,
  konz?: { markiert?: number[]; zahlen?: { richtig: number; falsch: number; uebersehen: number } },
): Partial<Record<AufgabenGruppe, GruppenWertung>> {
  const out: Partial<Record<AufgabenGruppe, GruppenWertung>> = {};
  for (const g of gruppen) {
    if (g === "konz") {
      if (!inhalt.konz) continue;
      const w = konz?.zahlen
        ? konzAusZahlen(inhalt.konz.regelId, konz.zahlen.richtig, konz.zahlen.falsch, konz.zahlen.uebersehen)
        : bewerten(inhalt.konz, konzMatrix(konz?.markiert ?? []));
      out.konz = { richtig: w.rohwert, gesamt: zielzeichen(inhalt.konz), leer: 0, punkte: w.punktwert, konz: w };
    } else out[g] = gruppeWerten(loesungenFuer(inhalt, g), antworten, g);
  }
  return out;
}

/** Für SimulationsErgebnis.gruppen: Konz → richtig = Rohwert, gesamt = Zielzeichen, punkte = Punktwert */
export function fuerSpeicher(w: Partial<Record<AufgabenGruppe, GruppenWertung>>): Partial<Record<AufgabenGruppe, { richtig: number; gesamt: number; punkte?: number }>> {
  return Object.fromEntries(
    Object.entries(w).map(([g, x]) => [g, x!.punkte !== undefined ? { richtig: x!.richtig, gesamt: x!.gesamt, punkte: x!.punkte } : { richtig: x!.richtig, gesamt: x!.gesamt }]),
  );
}

/* ------------------------------------------------------------------ Laufzustand */

/**
 * Wo steht ein Lauf jetzt? Läuft ein Block beim Fortsetzen schon länger als seine Zeit, ist er vorbei –
 * der nächste Block beginnt dann neu (ein Absturz soll nicht mehrere Blöcke «verschlucken»).
 */
export function restSekunden(block: Pick<AblaufBlock, "minuten">, blockStart: number, jetzt: number): number {
  return Math.min(block.minuten * 60, Math.max(0, Math.round(block.minuten * 60 - (jetzt - blockStart) / 1000)));
}

/** Darf im Block «aktuell» ein leeres Feld der früheren Gruppe noch geraten werden? (REFERENZ: Leere Felder) */
export function nachtraeglichRatenErlaubt(ablauf: AblaufBlock[], aktuell: number): boolean {
  const b = ablauf[aktuell];
  if (!b) return false;
  if (b.phase === "einpraegen" || b.phase === "heftwechsel" || b.gruppe === "konz") return false;
  // nicht nach Diagramme und Tabellen
  const diagIndex = ablauf.findIndex((x) => x.gruppe === "diagramme-tabellen");
  if (diagIndex >= 0 && aktuell > diagIndex) return false;
  return true;
}

/** Gruppen mit Antwortfeldern, die vor dem aktuellen Block lagen */
export function fruehereAntwortGruppen(ablauf: AblaufBlock[], aktuell: number): AufgabenGruppe[] {
  return [
    ...new Set(
      ablauf
        .slice(0, aktuell)
        .filter((b) => (b.phase === "bearbeiten" || b.phase === "abruf") && b.gruppe && b.gruppe !== "konz")
        .map((b) => b.gruppe!),
    ),
  ];
}
