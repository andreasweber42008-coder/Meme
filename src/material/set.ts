/**
 * Material-Sets: anlegen, Läufe bewerten, Doppeldurchgang auswerten, Versuche und Fehlerheft-Einträge bilden.
 * Reine Funktionen – das Schreiben in den Datenspeicher übernehmen die Seiten bzw. import.ts.
 */
import { BUCHSTABEN, type Buchstabe } from "@/aufgaben/typen";
import { methodeById } from "@/content";
import type { Schritt } from "@/content/schema";
import { einheitenFuer } from "@/lernpfad/einheiten";
import type { Tag } from "@/lib/datum";
import { naechsteWiederholung } from "@/lib/srs";
import type { AufgabenGruppe, Fehler, Fehlerursache, Lauf, MaterialDatei, MaterialSet, Versuch } from "@/daten/modelle";
import { NCWIKI_LIZENZ, type KatalogSet, type OffiziellEintrag } from "./katalog";

export type SetBereich = NonNullable<MaterialSet["bereiche"]>[number];

/* ------------------------------------------------------------------ Buchstaben */

export function buchstabeZuIndex(b: Buchstabe | null | undefined): number | null {
  if (!b) return null;
  const i = (BUCHSTABEN as readonly string[]).indexOf(b);
  return i >= 0 ? i : null;
}

export function indexZuBuchstabe(i: number | null | undefined): Buchstabe | null {
  return i === null || i === undefined ? null : (BUCHSTABEN[i] ?? null);
}

export function aufgabenNummern(set: Pick<MaterialSet, "ersteNr" | "anzahl">): number[] {
  return Array.from({ length: Math.max(0, set.anzahl) }, (_, i) => set.ersteNr + i);
}

export function loesungFuer(set: Pick<MaterialSet, "ersteNr" | "schluessel">, nr: number): Buchstabe | null {
  return set.schluessel[nr - set.ersteNr] ?? null;
}

/* ------------------------------------------------------------------ Anlegen */

/**
 * Vorschlag für die Bereiche einer Vollsimulation (8 × 18 Aufgaben mit Antwortbogen, Konz separat).
 * Reihenfolge laut Test-Info 2026; bitte auf der Prüfseite mit dem Material abgleichen.
 */
export function standardBereiche(ersteNr = 1): SetBereich[] {
  const folge: Array<[AufgabenGruppe, number]> = [
    ["muster-zuordnen", 16],
    ["med-nat", 45],
    ["objekte-im-raum", 10],
    ["quanti", 45],
    ["textverstaendnis", 45],
    ["figuren-lernen", 5],
    ["fakten-lernen", 6],
    ["diagramme-tabellen", 45],
  ];
  return folge.map(([gruppe, minuten], i) => ({ gruppe, von: ersteNr + i * 18, bis: ersteNr + i * 18 + 17, minuten }));
}

function leererSchluessel(anzahl: number): MaterialSet["schluessel"] {
  return Array.from({ length: Math.max(0, anzahl) }, () => null);
}

export function setAusKatalog(k: KatalogSet, dateien: MaterialDatei[], jetzt: number): MaterialSet {
  return {
    titel: k.titel,
    quelle: "ncwiki",
    katalogId: k.id,
    gruppe: k.gruppe,
    jahr: k.jahr,
    zeitMinuten: k.zeitMinuten,
    anzahl: k.anzahl,
    ersteNr: 1,
    schluessel: leererSchluessel(k.anzahl),
    dateien,
    seiten: {},
    bereiche: k.gruppe === "simulation" && k.anzahl === 144 ? standardBereiche(1) : undefined,
    textAufgaben: k.gruppe === "textverstaendnis",
    status: "neu",
    erstellt: jetzt,
    lizenz: NCWIKI_LIZENZ,
    hinweis: k.hinweis,
  };
}

export function setAusOffiziell(o: OffiziellEintrag, dateien: MaterialDatei[], jetzt: number): MaterialSet {
  return {
    titel: o.titel,
    quelle: "offiziell",
    katalogId: o.id,
    gruppe: o.gruppe,
    zeitMinuten: o.zeitMinuten,
    anzahl: 0,
    ersteNr: 1,
    schluessel: [],
    dateien,
    seiten: {},
    textAufgaben: false,
    status: "neu",
    erstellt: jetzt,
    hinweis: "Offizielles Material von swissuniversities.",
  };
}

export interface EigeneAngaben {
  titel: string;
  gruppe: AufgabenGruppe | "simulation";
  zeitMinuten: number;
  anzahl: number;
  ersteNr?: number;
  jahr?: number;
}

export function setAusUpload(a: EigeneAngaben, dateien: MaterialDatei[], jetzt: number): MaterialSet {
  const anzahl = Math.max(0, Math.round(a.anzahl));
  return {
    titel: a.titel.trim() || "Eigenes Set",
    quelle: "eigen",
    gruppe: a.gruppe,
    jahr: a.jahr,
    zeitMinuten: Math.max(0, Math.round(a.zeitMinuten)),
    anzahl,
    ersteNr: a.ersteNr ?? 1,
    schluessel: leererSchluessel(anzahl),
    dateien,
    seiten: {},
    bereiche: a.gruppe === "simulation" && anzahl === 144 ? standardBereiche(a.ersteNr ?? 1) : undefined,
    textAufgaben: a.gruppe === "textverstaendnis",
    status: "neu",
    erstellt: jetzt,
  };
}

/** Schlüssel auf neue Anzahl bzw. erste Nummer umbauen, bekannte Einträge bleiben */
export function schluesselAnpassen(set: Pick<MaterialSet, "ersteNr" | "schluessel">, ersteNr: number, anzahl: number): MaterialSet["schluessel"] {
  return Array.from({ length: Math.max(0, anzahl) }, (_, i) => loesungFuer(set, ersteNr + i));
}

/* ------------------------------------------------------------------ Gruppen */

/** Gruppe einer Aufgabe; bei Simulationen über die Bereiche, sonst die Gruppe des Sets */
export function gruppeFuerNr(set: Pick<MaterialSet, "gruppe" | "bereiche">, nr: number): AufgabenGruppe | null {
  if (set.gruppe !== "simulation") return set.gruppe;
  return set.bereiche?.find((b) => nr >= b.von && nr <= b.bis)?.gruppe ?? null;
}

/** Zeitlimit eines Laufs in ms (null = ohne Zeit) */
export function zeitLimitMs(set: Pick<MaterialSet, "zeitMinuten">, modus: Lauf["modus"]): number | null {
  return modus === "zeit" && set.zeitMinuten > 0 ? set.zeitMinuten * 60_000 : null;
}

/* ------------------------------------------------------------------ Bewerten */

export interface AufgabenErgebnis {
  nr: number;
  antwort: number | null;
  loesung: number | null;
  richtig: boolean;
  /** false, wenn kein Schlüssel vorhanden ist */
  gewertet: boolean;
}

export interface Bewertung {
  richtig: number;
  gewertet: number;
  beantwortet: number;
  aufgaben: AufgabenErgebnis[];
}

export function bewerten(set: Pick<MaterialSet, "ersteNr" | "anzahl" | "schluessel">, antworten: Lauf["antworten"]): Bewertung {
  const aufgaben = aufgabenNummern(set).map<AufgabenErgebnis>((nr) => {
    const roh = antworten[String(nr)];
    const antwort = typeof roh === "number" && roh >= 0 && roh < BUCHSTABEN.length ? roh : null;
    const loesung = buchstabeZuIndex(loesungFuer(set, nr));
    return { nr, antwort, loesung, gewertet: loesung !== null, richtig: loesung !== null && antwort === loesung };
  });
  return {
    aufgaben,
    richtig: aufgaben.filter((a) => a.richtig).length,
    gewertet: aufgaben.filter((a) => a.gewertet).length,
    beantwortet: aufgaben.filter((a) => a.antwort !== null).length,
  };
}

/** Bewertung pro Gruppe (für Simulationen) */
export function bewertungNachGruppe(
  set: Pick<MaterialSet, "gruppe" | "bereiche">,
  b: Bewertung,
): Partial<Record<AufgabenGruppe, { richtig: number; gesamt: number }>> {
  const out: Partial<Record<AufgabenGruppe, { richtig: number; gesamt: number }>> = {};
  for (const a of b.aufgaben) {
    if (!a.gewertet) continue;
    const g = gruppeFuerNr(set, a.nr);
    if (!g) continue;
    const e = (out[g] ??= { richtig: 0, gesamt: 0 });
    e.gesamt++;
    if (a.richtig) e.richtig++;
  }
  return out;
}

/* ------------------------------------------------------------------ Doppeldurchgang */

/**
 * beide-richtig: sitzt.
 * zeitproblem: unter Zeitdruck falsch (oder leer), ohne Zeit richtig.
 * verstaendnis: in beiden Durchgängen falsch.
 * unsicher: mit Zeit richtig, ohne Zeit falsch (Glückstreffer?).
 */
export type DoppelKategorie = "beide-richtig" | "zeitproblem" | "verstaendnis" | "unsicher";

export interface DoppelVergleich {
  aufgaben: Array<{ nr: number; kategorie: DoppelKategorie }>;
  anzahl: Record<DoppelKategorie, number>;
}

export function doppelVergleich(
  set: Pick<MaterialSet, "ersteNr" | "anzahl" | "schluessel">,
  mitZeit: Pick<Lauf, "antworten">,
  ohneZeit: Pick<Lauf, "antworten">,
): DoppelVergleich {
  const a = bewerten(set, mitZeit.antworten).aufgaben;
  const b = new Map(bewerten(set, ohneZeit.antworten).aufgaben.map((x) => [x.nr, x]));
  const anzahl: Record<DoppelKategorie, number> = { "beide-richtig": 0, zeitproblem: 0, verstaendnis: 0, unsicher: 0 };
  const aufgaben: DoppelVergleich["aufgaben"] = [];
  for (const x of a) {
    const y = b.get(x.nr);
    if (!x.gewertet || !y) continue;
    const kategorie: DoppelKategorie = x.richtig
      ? y.richtig
        ? "beide-richtig"
        : "unsicher"
      : y.richtig
        ? "zeitproblem"
        : "verstaendnis";
    anzahl[kategorie]++;
    aufgaben.push({ nr: x.nr, kategorie });
  }
  return { aufgaben, anzahl };
}

export type LaufMitId = Lauf & { id: string };

export interface DoppelStand {
  /** offen: noch kein Lauf mit Zeit; zweiter-offen: mit Zeit fertig, ohne Zeit fehlt; fertig: beide da */
  stand: "offen" | "zweiter-offen" | "fertig";
  mitZeit?: LaufMitId;
  ohneZeit?: LaufMitId;
}

/** Stand des Doppeldurchgangs eines Sets anhand seiner Läufe (der jüngste Lauf mit Zeit zählt). */
export function doppelStand(laeufe: LaufMitId[], setId?: string): DoppelStand {
  const fertig = laeufe.filter((l) => (setId === undefined || l.setId === setId) && l.ende !== undefined).sort((a, b) => (b.ende ?? 0) - (a.ende ?? 0));
  const mitZeit = fertig.find((l) => l.modus === "zeit");
  if (!mitZeit) return { stand: "offen" };
  const ohneZeit = fertig.find(
    (l) => l.modus === "ohne-zeit" && (l.partnerLaufId === mitZeit.id || mitZeit.partnerLaufId === l.id),
  );
  return ohneZeit ? { stand: "fertig", mitZeit, ohneZeit } : { stand: "zweiter-offen", mitZeit };
}

/** Partner für einen neuen Lauf: Ein Lauf ohne Zeit wird zum zweiten Durchgang des offenen Laufs mit Zeit. */
export function partnerFuerNeuenLauf(laeufe: LaufMitId[], setId: string, modus: Lauf["modus"]): string | undefined {
  if (modus !== "ohne-zeit") return undefined;
  const d = doppelStand(laeufe, setId);
  return d.stand === "zweiter-offen" ? d.mitZeit?.id : undefined;
}

/** Zuletzt abgeschlossener Lauf eines Sets */
export function letzterLauf(laeufe: LaufMitId[], setId: string): LaufMitId | undefined {
  return laeufe.filter((l) => l.setId === setId && l.ende !== undefined).sort((a, b) => (b.ende ?? 0) - (a.ende ?? 0))[0];
}

/** Offener (nicht abgegebener) Lauf eines Sets */
export function offenerLauf(laeufe: LaufMitId[], setId: string): LaufMitId | undefined {
  return laeufe.filter((l) => l.setId === setId && l.ende === undefined).sort((a, b) => b.start - a.start)[0];
}

/* ------------------------------------------------------------------ Versuche und Fehlerheft */

export function methodeFuerGruppe(gruppe: AufgabenGruppe | null): string | undefined {
  return gruppe ? einheitenFuer(gruppe)[0]?.methodeId : undefined;
}

/** Ein Versuch pro gewerteter Aufgabe (Sammlung «versuche», quelle «material») */
export function versucheAusLauf(set: MaterialSet & { id: string }, lauf: LaufMitId, tag: Tag): Array<{ id: string; daten: Versuch }> {
  const b = bewerten(set, lauf.antworten);
  const dauer = lauf.dauerMs ?? (lauf.ende ? lauf.ende - lauf.start : 0);
  const proAufgabe = set.anzahl > 0 ? Math.round(dauer / set.anzahl) : 0;
  const out: Array<{ id: string; daten: Versuch }> = [];
  for (const a of b.aufgaben) {
    if (!a.gewertet || a.loesung === null) continue;
    const gruppe = gruppeFuerNr(set, a.nr);
    if (!gruppe) continue;
    const bereich = set.gruppe === "simulation" ? set.bereiche?.find((x) => a.nr >= x.von && a.nr <= x.bis) : undefined;
    const zielMs = bereich
      ? Math.round((bereich.minuten * 60_000) / Math.max(1, bereich.bis - bereich.von + 1))
      : set.zeitMinuten > 0 && set.anzahl > 0
        ? Math.round((set.zeitMinuten * 60_000) / set.anzahl)
        : undefined;
    out.push({
      id: `${lauf.id}:${a.nr}`,
      daten: {
        zeit: lauf.ende ?? lauf.start,
        tag,
        gruppe,
        quelle: "material",
        methodeId: methodeFuerGruppe(gruppe),
        setId: set.id,
        nr: a.nr,
        antwort: a.antwort,
        loesung: a.loesung,
        richtig: a.richtig,
        dauerMs: proAufgabe,
        ...(zielMs !== undefined ? { zielMs } : {}),
      },
    });
  }
  return out;
}

export function fehlerId(setId: string, nr: number): string {
  return `material:${setId}:${nr}`;
}

/** Eintrag fürs Fehlerheft (Sammlung «fehlerheft»), mit erster Wiedervorlage morgen */
export function fehlerEintrag(
  set: MaterialSet & { id: string },
  nr: number,
  ursache: Fehlerursache,
  tag: Tag,
  optionen: { testtag?: Tag; notiz?: string; jetzt?: number } = {},
): { id: string; daten: Fehler } | null {
  const gruppe = gruppeFuerNr(set, nr);
  if (!gruppe) return null;
  const methodeId = methodeFuerGruppe(gruppe);
  return {
    id: fehlerId(set.id, nr),
    daten: {
      zeit: optionen.jetzt ?? Date.now(),
      tag,
      gruppe,
      ...(methodeId ? { methodeId } : {}),
      ursache,
      ...(optionen.notiz ? { notiz: optionen.notiz } : {}),
      ref: { art: "material", setId: set.id, nr },
      srs: naechsteWiederholung(undefined, false, tag, optionen.testtag),
    },
  };
}

/** Vorgeschlagene Ursache: Zeitproblem im Doppeldurchgang → Zeitnot, sonst Methodenschritt */
export function ursacheVorschlag(kategorie: DoppelKategorie | undefined, antwort: number | null): Fehlerursache {
  if (kategorie === "zeitproblem") return "zeitnot";
  if (antwort === null) return "zeitnot";
  return "methodenschritt";
}

/* ------------------------------------------------------------------ Lösungsweg */

export interface Loesungsweg {
  herkunft: "material" | "ergaenzung";
  text?: string;
  methodeId?: string;
  methodeName?: string;
  schritte?: Array<Pick<Schritt, "nr" | "titel" | "tun">>;
}

/**
 * Lösungsweg einer Aufgabe: aus dem Material, falls vorhanden; sonst als «Ergänzung» aus den
 * Schritten der Methode der Gruppe (REFERENZ, Inhaltsregel 5).
 */
export function loesungswegFuer(set: Pick<MaterialSet, "gruppe" | "bereiche" | "loesungswege">, nr: number): Loesungsweg | null {
  const ausMaterial = set.loesungswege?.[String(nr)];
  if (ausMaterial && ausMaterial.trim()) return { herkunft: "material", text: ausMaterial.trim() };
  const methodeId = methodeFuerGruppe(gruppeFuerNr(set, nr));
  const methode = methodeId ? methodeById(methodeId) : undefined;
  if (!methode) return null;
  return {
    herkunft: "ergaenzung",
    methodeId: methode.id,
    methodeName: methode.name,
    schritte: methode.schritte.filter((s) => s.phase !== "nachbereitung").map((s) => ({ nr: s.nr, titel: s.titel, tun: s.tun })),
  };
}

export const URSACHEN: Array<{ id: Fehlerursache; label: string }> = [
  { id: "methodenschritt", label: "Methodenschritt" },
  { id: "denkfehler", label: "Denkfehler" },
  { id: "zeitnot", label: "Zeitnot" },
  { id: "fluechtigkeit", label: "Flüchtigkeit" },
];
