/**
 * Erkennung aus dem Text, den pdf.js aus Material-PDFs zieht. Reine Funktionen ohne Seiteneffekte.
 * Alles hier ist eine Vermutung: Die Prüfseite zeigt das Ergebnis und Du korrigierst es.
 */
import { BUCHSTABEN, type Buchstabe } from "@/aufgaben/typen";
import type { AufgabenGruppe } from "@/daten/modelle";

export type Schluessel = Record<number, Buchstabe>;

export interface Bereich {
  /** erste erwartete Aufgaben-Nr. (Standard 1) */
  ersteNr?: number;
  /** erwartete Anzahl Aufgaben (unbekannt: weglassen) */
  anzahl?: number;
}

/* ------------------------------------------------------------------ Hilfen */

function normalisieren(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\r\n?/g, "\n");
}

function imBereich(nr: number, b: Bereich): boolean {
  const erste = b.ersteNr ?? 1;
  if (nr < erste || nr > 999) return false;
  if (b.anzahl && b.anzahl > 0 && nr >= erste + b.anzahl) return false;
  return true;
}

const istBuchstabe = (t: string): t is Buchstabe => (BUCHSTABEN as readonly string[]).includes(t);

/** Wörter am Zeilenanfang einer Tabelle wie «Aufgabe», «Nr.», «Lösung» */
const TABELLEN_LABEL = /^(aufgaben?|frage|fragen|nr\.?|nummer|l(ö|oe)sungs?|l(ö|oe)sungen|antwort(en)?|richtig|key|[|:])$/i;

function tokens(zeile: string): string[] {
  return zeile
    .split(/[\s|;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function ohneLabel(t: string[]): string[] {
  let i = 0;
  while (i < t.length && TABELLEN_LABEL.test(t[i])) i++;
  return t.slice(i);
}

function istZahlenreihe(t: string[]): number[] | null {
  if (t.length < 3 || !t.every((x) => /^\d{1,3}$/.test(x))) return null;
  const n = t.map(Number);
  for (let i = 1; i < n.length; i++) if (n[i] !== n[i - 1] + 1) return null;
  return n;
}

/* ------------------------------------------------------------------ Lösungsschlüssel */

/**
 * Tabellen wie
 *   1 2 3 4 5
 *   E A C B D
 * (auch mit Kopfspalte «Aufgabe» / «Lösung» oder beides in einer Zeile).
 */
function tabellenSuchen(zeilen: string[]): { schluessel: Schluessel; verbraucht: Set<number> } {
  const schluessel: Schluessel = {};
  const verbraucht = new Set<number>();
  for (let i = 0; i < zeilen.length; i++) {
    const t = ohneLabel(tokens(zeilen[i]));
    // Beides in einer Zeile: «1 2 3 4 E A C B»
    if (t.length >= 6 && t.length % 2 === 0) {
      const h = t.length / 2;
      const zahlen = istZahlenreihe(t.slice(0, h));
      const buchst = t.slice(h);
      if (zahlen && buchst.every(istBuchstabe)) {
        zahlen.forEach((nr, k) => (schluessel[nr] ??= buchst[k] as Buchstabe));
        verbraucht.add(i);
        continue;
      }
    }
    const zahlen = istZahlenreihe(t);
    if (!zahlen) continue;
    // nächste nicht leere Zeile (höchstens 2 weiter)
    for (let j = i + 1; j <= i + 2 && j < zeilen.length; j++) {
      const b = ohneLabel(tokens(zeilen[j]));
      if (b.length === 0) continue;
      if (b.length === zahlen.length && b.every(istBuchstabe)) {
        zahlen.forEach((nr, k) => (schluessel[nr] ??= b[k] as Buchstabe));
        verbraucht.add(i);
        verbraucht.add(j);
      }
      break;
    }
  }
  return { schluessel, verbraucht };
}

const PRAEFIX = String.raw`(?:(?:Aufgabe|Frage|Nr\.?)\s*)?`;
const LOESUNGSWORT = String.raw`(?:(?:richtige\s+)?(?:L(?:ö|oe)sung|Antwort)\s*[:=]?\s*)?`;
const ENDE = String.raw`(?=$|[\s.,;:)\-|])`;
/** «1) E», «1. E», «1: E», «Aufgabe 1: E», «1.E», «1 - E», «1) Lösung: E» */
const STARK = new RegExp(String.raw`(?<=^|[\s|;,])${PRAEFIX}(\d{1,3})\s*[).:=\-]\s*${LOESUNGSWORT}\(?([A-E])\)?${ENDE}`, "g");
/** «Aufgabe 1 E» und «1 E» (nur Leerzeichen) */
const SCHWACH = new RegExp(String.raw`(?<=^|[\s|;,])${PRAEFIX}(\d{1,3})\s+${LOESUNGSWORT}\(?([A-E])\)?${ENDE}`, "g");
/** «Aufgabe 1» und in der nächsten Zeile «Lösung: E» */
const ZWEIZEILIG = /(?:Aufgabe|Frage|Nr\.?)\s*(\d{1,3})[^\n]{0,80}\n\s*(?:richtige\s+)?(?:L(?:ö|oe)sung|Antwort)\s*[:=]?\s*\(?([A-E])\)?(?=$|[\s.,;:)])/gim;

function treffer(re: RegExp, text: string, b: Bereich): Array<[number, Buchstabe]> {
  const out: Array<[number, Buchstabe]> = [];
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const nr = Number(m[1]);
    if (imBereich(nr, b)) out.push([nr, m[2] as Buchstabe]);
  }
  return out;
}

/**
 * Lösungsschlüssel aus dem Text der Lösungen.
 * Reihenfolge: Tabellen, dann eindeutige Muster («1) E»), dann schwache («1 E»).
 * Einzelne Treffer ohne Nachbarn (nr−1 oder nr+1) gelten als Zufall und fallen weg.
 */
export function erkenneSchluessel(text: string, bereich: Bereich = {}): Schluessel {
  const zeilen = normalisieren(text).split("\n");
  const { schluessel: tabelle, verbraucht } = tabellenSuchen(zeilen);
  const out: Schluessel = {};
  for (const [nr, b] of Object.entries(tabelle)) if (imBereich(Number(nr), bereich)) out[Number(nr)] = b;

  const rest = zeilen.filter((_, i) => !verbraucht.has(i)).join("\n");
  const stufen = [treffer(ZWEIZEILIG, rest, bereich), treffer(STARK, rest, bereich), treffer(SCHWACH, rest, bereich)];
  for (const liste of stufen) {
    const neu: Schluessel = {};
    for (const [nr, b] of liste) if (out[nr] === undefined && neu[nr] === undefined) neu[nr] = b;
    for (const [nr, b] of Object.entries(neu)) {
      const n = Number(nr);
      const nachbar = neu[n - 1] ?? neu[n + 1] ?? out[n - 1] ?? out[n + 1];
      const einzigeAufgabe = bereich.anzahl === 1 && Object.keys(out).length === 0;
      if (nachbar !== undefined || einzigeAufgabe) out[n] = b;
    }
  }
  return out;
}

/** Schlüssel als Liste ab ersteNr (fehlende Einträge = null) */
export function schluesselAlsListe(s: Schluessel, ersteNr: number, anzahl: number): Array<Buchstabe | null> {
  return Array.from({ length: Math.max(0, anzahl) }, (_, i) => s[ersteNr + i] ?? null);
}

/** Anzahl und erste Nummer aus einem erkannten Schlüssel ableiten */
export function bereichAusSchluessel(s: Schluessel): { ersteNr: number; anzahl: number } | null {
  const nrn = Object.keys(s).map(Number);
  if (nrn.length === 0) return null;
  const min = Math.min(...nrn);
  const max = Math.max(...nrn);
  return { ersteNr: min, anzahl: max - min + 1 };
}

/* ------------------------------------------------------------------ Seiten */

const AUFGABE_WORT = /(?:^|\s)Aufgabe\s+(\d{1,3})(?!\d)/gi;
const NUMMER_ZEILE = /^\s*(\d{1,3})\s*[.)](?=\s|$)/gm;

/**
 * Aufgaben-Nr. → Seite (1-basiert). Erwartet die Aufgaben in aufsteigender Reihenfolge;
 * angenommen wird eine Nummer nur, wenn sie zur nächsten erwarteten passt (höchstens 2 übersprungen).
 */
export function erkenneSeiten(seitenTexte: string[], bereich: Bereich = {}): Record<number, number> {
  const erste = bereich.ersteNr ?? 1;
  const out: Record<number, number> = {};
  let erwartet = erste;
  seitenTexte.forEach((roh, i) => {
    const text = normalisieren(roh);
    const funde: Array<{ pos: number; nr: number }> = [];
    for (const m of text.matchAll(AUFGABE_WORT)) funde.push({ pos: m.index ?? 0, nr: Number(m[1]) });
    for (const m of text.matchAll(NUMMER_ZEILE)) funde.push({ pos: m.index ?? 0, nr: Number(m[1]) });
    funde.sort((a, b) => a.pos - b.pos);
    for (const { nr } of funde) {
      if (!imBereich(nr, bereich)) continue;
      if (nr < erwartet || nr > erwartet + 2) continue;
      for (let k = erwartet; k <= nr; k++) out[k] ??= i + 1;
      erwartet = nr + 1;
    }
  });
  return out;
}

/** Lücken in der Seitenzuordnung mit der Seite der vorherigen Aufgabe füllen */
export function seitenFuellen(seiten: Record<number, number>, ersteNr: number, anzahl: number): Record<string, number> {
  const out: Record<string, number> = {};
  let letzte = 1;
  for (let nr = ersteNr; nr < ersteNr + anzahl; nr++) {
    if (seiten[nr] !== undefined) letzte = seiten[nr];
    out[String(nr)] = letzte;
  }
  return out;
}

/* ------------------------------------------------------------------ Zeit */

function dauerLesen(s: string): number | null {
  const h = s.match(/^\s*[:=]?\s*(?:ca\.\s*)?(\d{1,2})\s*(?:h|Std\.?|Stunden?)\b(?:\s*(?:und\s*)?(\d{1,2})\s*(?:Minuten|Min\.?|min\.?)\b)?/i);
  if (h) return Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  const m = s.match(/^\s*[:=]?\s*(?:ca\.\s*)?(\d{1,3})\s*(?:Minuten|Min\.?|min\.?)(?![a-z])/i);
  if (m) return Number(m[1]);
  return null;
}

/** Zeitlimit in Minuten, z. B. «Bearbeitungszeit: 45 Minuten», «Zeit: 1 h 30 min», «45 min» */
export function erkenneZeit(text: string): number | null {
  const t = normalisieren(text);
  const wort = /(Bearbeitungszeit|Zeitlimit|Zeitvorgabe|Testzeit|Dauer|Zeit)\b/gi;
  for (const m of t.matchAll(wort)) {
    const d = dauerLesen(t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 40));
    if (d && d > 0 && d <= 300) return d;
  }
  const frei = t.match(/(?<![\d.,])(\d{1,3})\s*(?:Minuten|min\.?)(?![a-z])/i);
  if (frei) {
    const d = Number(frei[1]);
    if (d > 0 && d <= 240) return d;
  }
  return null;
}

/* ------------------------------------------------------------------ Gruppe */

function vereinfachen(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[-_/&+]/g, " ")
    .replace(/\s+/g, " ");
}

const STICHWORTE: Array<[AufgabenGruppe | "simulation", RegExp]> = [
  ["simulation", /\b(test ?simulation|simulation|probetest|gesamttest)\b/g],
  ["muster-zuordnen", /\bmuster( zuordnen)?\b/g],
  ["med-nat", /\b(med ?nat|medizinisch naturwissenschaftlich\w*|grundverstaendnis)\b/g],
  ["objekte-im-raum", /\b(objekte im raum|objekte|wuerfel)\b/g],
  ["quanti", /\b(quanti\w*|formale probleme|qfp)\b/g],
  ["figuren-lernen", /(?<!schlauch)\bfiguren( lernen| reproduzieren)?\b/g],
  ["fakten-lernen", /\bfakten( lernen| reproduzieren)?\b/g],
  ["textverstaendnis", /\btext ?verstaendnis\b/g],
  ["diagramme-tabellen", /\b(diagramme?|tabellen?)\b/g],
  ["konz", /\b(konz(entr\w*)?|sorgfaeltig\w*)\b/g],
];

/** Gruppe aus Titel (zählt dreifach) und Text; null, wenn nichts passt */
export function erkenneGruppe(titel: string, text = ""): AufgabenGruppe | "simulation" | null {
  const t = vereinfachen(titel);
  const x = vereinfachen(text.slice(0, 4000));
  let beste: AufgabenGruppe | "simulation" | null = null;
  let max = 0;
  for (const [g, re] of STICHWORTE) {
    const punkte = (t.match(re)?.length ?? 0) * 3 + (x.match(re)?.length ?? 0);
    if (punkte > max) {
      max = punkte;
      beste = g;
    }
  }
  return beste;
}

/* ------------------------------------------------------------------ Lösungswege */

const BLOCK_START = /^\s*(?:(?:Aufgabe|Frage|Nr\.?)\s*)?(\d{1,3})\s*[).:]\s*/i;
const BLOCK_SCHLUESSEL = /^(?:(?:richtige\s+)?(?:L(?:ö|oe)sung|Antwort)\s*[:=]?\s*)?\(?[A-E]\)?(?=$|[\s.,;:)-])[\s.,;:)-]*/i;

/**
 * Lösungswege pro Aufgabe, falls die Lösungen mehr als den Buchstaben enthalten.
 * Ein Block beginnt mit «12)» / «12.» / «Aufgabe 12:» am Zeilenanfang und läuft bis zum nächsten.
 * Blöcke unter 25 Zeichen (nur Schlüssel) zählen nicht.
 */
export function erkenneLoesungswege(text: string, bereich: Bereich = {}): Record<number, string> {
  const zeilen = normalisieren(text).split("\n");
  const bloecke: Array<{ nr: number; zeilen: string[] }> = [];
  let letzte = (bereich.ersteNr ?? 1) - 1;
  for (const z of zeilen) {
    const m = z.match(BLOCK_START);
    const nr = m ? Number(m[1]) : NaN;
    if (m && imBereich(nr, bereich) && nr > letzte && nr <= letzte + 3) {
      letzte = nr;
      bloecke.push({ nr, zeilen: [z.slice(m[0].length).replace(BLOCK_SCHLUESSEL, "")] });
    } else if (bloecke.length) {
      bloecke[bloecke.length - 1].zeilen.push(z);
    }
  }
  const out: Record<number, string> = {};
  for (const b of bloecke) {
    const t = b.zeilen
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (t.length >= 25) out[b.nr] = t.slice(0, 3000);
  }
  return out;
}
