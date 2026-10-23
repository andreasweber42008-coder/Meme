import type { Tag } from "@/lib/datum";
import type { SrsStand } from "@/lib/srs";
import type { UntertestId } from "@/content/schema";

export type AufgabenGruppe = Exclude<UntertestId, "uebergreifend">;

export const GRUPPEN: AufgabenGruppe[] = [
  "muster-zuordnen",
  "med-nat",
  "objekte-im-raum",
  "quanti",
  "figuren-lernen",
  "fakten-lernen",
  "textverstaendnis",
  "diagramme-tabellen",
  "konz",
];

export type Studienwunsch = "humanmedizin" | "zahnmedizin" | "veterinaermedizin" | "chiropraktik";
export type Testort = "Zürich" | "Bern" | "Basel" | "Luzern" | "St. Gallen" | "Chur" | "Freiburg";
export type MaskottchenVariante = "a" | "b" | "c";

export interface Zeitraum {
  id: string;
  von: Tag;
  bis: Tag;
  art: "pruefungswoche" | "ferien";
  titel?: string;
}

export interface Maturapruefung {
  id: string;
  fach: string;
  datum: Tag;
}

export interface Ziel {
  /** Ziel-Genauigkeit 0–1 */
  genauigkeit: number;
  /** Zieltempo als Anteil der EMS-Zeit (1 = genau EMS-Tempo) */
  tempo: number;
}

export interface Einstellungen {
  onboardingFertig: boolean;
  einstufungFertig: boolean;
  maturajahr: number;
  /** Optional manuell gesetztes Testdatum (sonst Freitag der KW 27) */
  testdatum?: Tag;
  studienwunsch: Studienwunsch;
  /** Minuten pro Wochentag, Index 0 = Montag */
  minutenProTag: number[];
  zeitraeume: Zeitraum[];
  maturapruefungen: Maturapruefung[];
  erinnerung: string; // «HH:MM»
  wochenrhythmus: { simulationstag: number; schwaechentag: number; freierTag: number }; // 1 = Mo … 7 = So
  heftwechselMinuten: number;
  testort?: Testort;
  anreiseMinuten?: number;
  pufferMinuten: number;
  testbeginn: string; // «HH:MM» laut Einladung
  ziele: Record<AufgabenGruppe, Ziel>;
  beherrschung: number; // Standard 0.8
  maskottchen: MaskottchenVariante;
  ton: boolean;
  tagesziel: number; // XP
  design: "system" | "hell" | "dunkel";
}

export const STANDARD_ZIELE: Record<AufgabenGruppe, Ziel> = Object.fromEntries(
  GRUPPEN.map((g) => [g, { genauigkeit: 0.75, tempo: 1 }]),
) as Record<AufgabenGruppe, Ziel>;

export function standardEinstellungen(): Einstellungen {
  return {
    onboardingFertig: false,
    einstufungFertig: false,
    maturajahr: 2027,
    studienwunsch: "humanmedizin",
    minutenProTag: [30, 30, 30, 30, 30, 60, 0],
    zeitraeume: [],
    maturapruefungen: [],
    erinnerung: "17:30",
    wochenrhythmus: { simulationstag: 6, schwaechentag: 5, freierTag: 7 },
    heftwechselMinuten: 10,
    pufferMinuten: 45,
    testbeginn: "08:30",
    ziele: structuredClone(STANDARD_ZIELE),
    beherrschung: 0.8,
    maskottchen: "a",
    ton: true,
    tagesziel: 50,
    design: "system",
  };
}

/** Ergebnis einer bearbeiteten Aufgabe der Methoden-Stufen */
export interface StufenErgebnis {
  zeit: number;
  richtig: boolean;
  schritteOk: boolean;
  imTempo?: boolean;
}

export interface Fortschritt {
  stufe: number; // aktuelle Stufe 1–8
  verstandenAm?: string;
  beherrschtAm?: string; // Stufe 8 bestanden → Abzeichen
  /** letzte Ergebnisse pro Stufe */
  verlauf?: Record<string, StufenErgebnis[]>;
  /** Schritt-Statistik: Schritt-Nr → { fehler, gesamt } */
  schritte?: Record<string, { fehler: number; gesamt: number }>;
  srs?: SrsStand;
}

export type Fehlerursache = "methodenschritt" | "denkfehler" | "zeitnot" | "fluechtigkeit";

export interface Versuch {
  zeit: number;
  tag: Tag;
  gruppe: AufgabenGruppe;
  quelle: "lektion" | "drill" | "material" | "simulation" | "einstufung" | "wiedervorlage" | "konz";
  methodeId?: string;
  stufe?: number;
  generator?: string;
  seed?: string;
  schwierigkeit?: number;
  setId?: string;
  nr?: number;
  antwort: number | null;
  loesung: number;
  richtig: boolean;
  dauerMs: number;
  zielMs?: number;
  schrittFehler?: number[];
  denkfehler?: string;
}

export interface Fehler {
  zeit: number;
  tag: Tag;
  gruppe: AufgabenGruppe;
  methodeId?: string;
  schritt?: number;
  ursache: Fehlerursache;
  denkfehler?: string;
  notiz?: string;
  ref: { art: "generator"; generator: string; seed: string; schwierigkeit: number } | { art: "material"; setId: string; nr: number };
  srs: SrsStand;
  erledigt?: boolean;
}

export interface MaterialDatei {
  pfad: string; // im privaten Bucket
  art: "aufgaben" | "loesungen" | "gesamt";
  seiten?: number;
  titel?: string;
  /** Zusatzrolle: Abruf-Heft (Gedächtnistests), Konz-Auswertung, Auswerte-Schablone */
  rolle?: "abruf" | "konz" | "schablone";
  contentType?: string;
  bytes?: number;
  /** Woher die Datei stammt (für erneutes Abrufen) */
  herkunft?: { quelle: "drive" | "gdoc" | "ncwiki" | "url"; ref: string };
}

export interface MaterialSet {
  titel: string;
  quelle: "ncwiki" | "offiziell" | "eigen";
  katalogId?: string;
  gruppe: AufgabenGruppe | "simulation";
  jahr?: number;
  zeitMinuten: number;
  anzahl: number;
  ersteNr: number;
  schluessel: Array<"A" | "B" | "C" | "D" | "E" | null>;
  dateien: MaterialDatei[];
  /** Aufgaben-Nr → Seite (1-basiert) in der Aufgaben-Datei */
  seiten: Record<string, number>;
  /** Aufgaben-Nr → Lösungsweg aus dem Material */
  loesungswege?: Record<string, string>;
  /** Für Simulationen: Gruppenbereiche */
  bereiche?: Array<{ gruppe: AufgabenGruppe; von: number; bis: number; minuten: number }>;
  textAufgaben: boolean;
  status: "neu" | "geprueft";
  erstellt: number;
  lizenz?: string;
  hinweis?: string;
  /** Ergebnis der automatischen Erkennung (Schlüssel, Seiten, Zeit) */
  analyse?: { am: number; schluessel: number; seiten: number; loesungswege: number; zeitMinuten?: number; fehler?: string };
}

export interface Lauf {
  setId: string;
  modus: "zeit" | "ohne-zeit";
  start: number;
  ende?: number;
  antworten: Record<string, number | null>;
  dauerMs?: number;
  richtig?: number;
  partnerLaufId?: string; // Doppeldurchgang
}

export interface Strich {
  farbe: string;
  breite: number;
  marker: boolean;
  punkte: number[]; // x0,y0,x1,y1 … (0–1 relativ)
}

export interface Markierung {
  striche: Strich[];
  textMarken?: Record<string, string>; // Wort-Index → Farbe
}

export interface SimulationsErgebnis {
  art: "voll" | "teil-a" | "teil-b" | "generalprobe";
  quelle: "generator" | "material" | "papier";
  setId?: string;
  seed?: string;
  start: number;
  ende?: number;
  tag: Tag;
  /** Gruppe → { richtig, gesamt } bzw. Konz-Punktwert */
  gruppen: Partial<Record<AufgabenGruppe, { richtig: number; gesamt: number; punkte?: number }>>;
  antworten?: Record<string, number | null>;
  abgeschlossen: boolean;
  /** Mini-Simulation: gewählte Gruppen (art ist dann «teil-a» oder «teil-b», je nach Mehrheit) */
  mini?: AufgabenGruppe[];
  /** Heftwechsel-Minuten zum Zeitpunkt des Starts (Ablauf reproduzierbar) */
  heftwechselMinuten?: number;
  /** geplante Startzeit «HH:MM» (Generalprobe: offizieller Testbeginn) */
  geplanterStart?: string;
  /** Plan-Aufgabe, die beim Abschluss erledigt wird */
  planId?: string;
  /** Laufzustand für das Fortsetzen nach Neuladen: aktueller Block und dessen Startzeitpunkt (ms) */
  lauf?: { block: number; blockStart: number };
  /** Block-ID → benötigte Sekunden */
  blockSekunden?: Record<string, number>;
  /** Konz: markierte Zeichen als Index zeile × 40 + spalte (während des Laufs) */
  konzMarkiert?: number[];
  /** Konz-Wertung (Generator oder Papier-Eingabe) */
  konz?: { regelId: string; richtig: number; falsch: number; uebersehen: number; rohwert: number; punktwert: number };
  /** XP und Abzeichen wurden vergeben */
  belohnt?: boolean;
  /** Antwort-Schlüssel («gruppe:nr»), die schon im Fehlerheft stehen */
  imFehlerheft?: string[];
}

export interface Termin {
  titel: string;
  datum: Tag;
  zeit?: string;
  art: "ncwiki-simulation" | "probelauf" | "frist" | "sonstiges";
  notiz?: string;
}

export interface TagStand {
  /** Tagespfad-Truhe geöffnet */
  truhe?: boolean;
  xp: number;
  minuten: number;
  erledigt: string[]; // Plan-Aufgaben-IDs
  zielErreicht: boolean;
  streakSchutz?: boolean;
}

export interface Gamification {
  xpGesamt: number;
  streakSchutz: number; // verfügbare «Schutzschilde»
  abzeichen: Array<{ id: string; am: string; titel: string }>;
  /** im Shop ausgegebene XP (Guthaben = xpGesamt − ausgegeben) */
  ausgegeben?: number;
  /** gekaufte Gegenstände für Munggi */
  inventar?: string[];
  /** angezogene Gegenstände pro Platz (kopf, augen, hals, hand, hintergrund) */
  angezogen?: Partial<Record<"kopf" | "augen" | "hals" | "hand" | "hintergrund", string>>;
}

export interface Meldung {
  zeit: number;
  generator: string;
  seed: string;
  schwierigkeit: number;
  text: string;
  /** Bank-Aufgabe (z. B. «Aufgabenbank mn12») – wird dann nie mehr gezeigt */
  quelle?: string;
}

export interface Lernkarte {
  titel: string;
  text: string;
  gruppe: UntertestId;
  quelle: "ncwiki" | "milan" | "test-info";
  srs?: SrsStand;
}
