/**
 * Katalog des abrufbaren Materials. Enthält nur Titel und Verweise – das Material selbst liegt
 * ausschliesslich im privaten Speicher (Bucket «material», Ordner des eigenen Kontos).
 */
import roh from "@/content/ncwiki-katalog.json";
import type { AufgabenGruppe, MaterialDatei } from "@/daten/modelle";

export type KatalogQuelle = "drive" | "gdoc" | "ncwiki";
export type AbrufQuelle = KatalogQuelle | "url";
export type KatalogArt = "aufgaben" | "loesungen" | "gesamt" | "abruf" | "konz" | "schablone";

export interface KatalogDatei {
  quelle: KatalogQuelle;
  ref: string;
  art: KatalogArt;
  titel: string;
}

export interface KatalogSet {
  id: string;
  titel: string;
  gruppe: AufgabenGruppe | "simulation";
  jahr: number;
  serie?: number;
  zeitMinuten: number;
  anzahl: number;
  dateien: KatalogDatei[];
  hinweis?: string;
}

interface KatalogDateiRoh {
  quelle: string;
  lizenz: string;
  kursskript: { id: string; titel: string; dateien: KatalogDatei[] };
  sets: KatalogSet[];
}

const KATALOG = roh as unknown as KatalogDateiRoh;

export const NCWIKI_LIZENZ = "CC BY-NC 4.0";
export const LIZENZ_HINWEIS = "NCWiki-Material: CC BY-NC 4.0, nur privat";
export const NCWIKI_SETS: KatalogSet[] = KATALOG.sets;
export const KURSSKRIPT = KATALOG.kursskript;

export function katalogSet(id: string): KatalogSet | undefined {
  return NCWIKI_SETS.find((s) => s.id === id);
}

/** Reihenfolge der Gruppen in der Bibliothek: Simulationen zuerst, dann EMS-Reihenfolge */
export const GRUPPEN_REIHENFOLGE: Array<AufgabenGruppe | "simulation"> = [
  "simulation",
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

export const GRUPPEN_NAMEN: Record<AufgabenGruppe | "simulation", string> = {
  simulation: "Testsimulationen",
  "muster-zuordnen": "Muster zuordnen",
  "med-nat": "Med-Nat Grundverständnis",
  "objekte-im-raum": "Objekte im Raum",
  quanti: "Quantitative und formale Probleme",
  "figuren-lernen": "Figuren lernen",
  "fakten-lernen": "Fakten lernen",
  textverstaendnis: "Textverständnis",
  "diagramme-tabellen": "Diagramme und Tabellen",
  konz: "Konz",
};

/** Katalog gruppiert nach Gruppe und Jahr (neueste zuerst) */
export function katalogNachGruppe(): Array<{ gruppe: AufgabenGruppe | "simulation"; jahre: Array<{ jahr: number; sets: KatalogSet[] }> }> {
  return GRUPPEN_REIHENFOLGE.map((gruppe) => {
    const sets = NCWIKI_SETS.filter((s) => s.gruppe === gruppe);
    const jahre = [...new Set(sets.map((s) => s.jahr))].sort((a, b) => b - a);
    return {
      gruppe,
      jahre: jahre.map((jahr) => ({ jahr, sets: sets.filter((s) => s.jahr === jahr).sort((a, b) => (a.serie ?? 0) - (b.serie ?? 0)) })),
    };
  }).filter((g) => g.jahre.length > 0);
}

/** Prozentrang-Vergleiche werden nie importiert (keine Prognosen, siehe REFERENZ). */
export function istPrognoseDatei(d: Pick<KatalogDatei, "titel">): boolean {
  return /prozentrang/i.test(d.titel);
}

export function katalogDateienFuerImport(s: KatalogSet): KatalogDatei[] {
  return s.dateien.filter((d) => !istPrognoseDatei(d));
}

/** Katalog-Art → Art und Rolle im MaterialSet */
export function artUebersetzen(art: KatalogArt): Pick<MaterialDatei, "art" | "rolle"> {
  switch (art) {
    case "aufgaben":
    case "loesungen":
    case "gesamt":
      return { art };
    case "abruf":
      return { art: "aufgaben", rolle: "abruf" };
    case "konz":
      return { art: "loesungen", rolle: "konz" };
    case "schablone":
      return { art: "loesungen", rolle: "schablone" };
  }
}

/** Konz-Auswertungen und Auswerte-Schablonen aus dem Katalog */
export function konzBeilagen(): Array<{ set: KatalogSet; datei: KatalogDatei }> {
  return NCWIKI_SETS.flatMap((set) => set.dateien.filter((d) => d.art === "konz" || d.art === "schablone").map((datei) => ({ set, datei })));
}

/* ------------------------------------------------------------------ Offizielles Material */

export const ERLAUBTE_HOSTS = ["www.swissuniversities.ch", "swissuniversities.ch", "www.unifr.ch"] as const;

export function urlErlaubt(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && (ERLAUBTE_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

export interface OffiziellEintrag {
  id: string;
  titel: string;
  url: string;
  /** info = Lesestoff (wird zu Lernkarten), set = Aufgaben mit Antwortbogen */
  art: "info" | "set";
  gruppe: AufgabenGruppe | "simulation";
  zeitMinuten: number;
  beschreibung: string;
}

/** Öffentliche PDFs von swissuniversities (Quellen laut docs/REFERENZ.md, Abschnitt 7) */
export const OFFIZIELL: OffiziellEintrag[] = [
  {
    id: "offiziell-testinfo-2026",
    titel: "Test-Info 2026",
    url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/Testinfo2026_de.pdf",
    art: "info",
    gruppe: "simulation",
    zeitMinuten: 0,
    beschreibung: "Regeln, Ablauf und Aufgabenformate. Wird zu Lernkarten.",
  },
  {
    id: "offiziell-beispielaufgaben-2026",
    titel: "Beispielaufgaben 2026",
    url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/Beispielaufgaben2026.pdf",
    art: "set",
    gruppe: "simulation",
    zeitMinuten: 0,
    beschreibung: "Offizielle Beispiele aller Aufgabengruppen. Anzahl und Bereiche prüfst du nach dem Import.",
  },
  {
    id: "offiziell-konz-beispiele",
    titel: "Konz-Beispiele",
    url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/BeispielaufgabenKonz.pdf",
    art: "set",
    gruppe: "konz",
    zeitMinuten: 8,
    beschreibung: "Beispielblätter für Konzentriertes und sorgfältiges Arbeiten.",
  },
];
