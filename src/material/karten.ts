/**
 * Lernkarten aus Lesestoff (Kursskript, NCWiki-Tipps, Test-Info): Text an Überschriften aufteilen.
 * Die Karten landen nur im privaten Dokumentenspeicher (Sammlung «karten»), nie im Code.
 */
import type { Lernkarte } from "@/daten/modelle";
import type { UntertestId } from "@/content/schema";
import { hashSeed } from "@/lib/zufall";
import { erkenneGruppe } from "./erkennung";

/** Eine Textzeile mit Schrifthöhe (aus pdf.js) */
export interface KartenZeile {
  text: string;
  /** Schrifthöhe in PDF-Punkten; 0 = unbekannt */
  hoehe: number;
  seite?: number;
}

const NUMMERIERT = /^(\d{1,2}(\.\d{1,2}){0,3})\.?\s+\p{Lu}/u;
const MAX_TEXT = 1500;
const MIN_TEXT = 40;

function median(werte: number[]): number {
  if (werte.length === 0) return 0;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Ist die Zeile eine Überschrift? Grössere Schrift als üblich oder «2.3 Titel», kurz und ohne Schlusspunkt. */
export function istUeberschrift(z: KartenZeile, grundHoehe: number): boolean {
  const t = z.text.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/[.,;:]$/.test(t) && !/^\d/.test(t)) return false;
  if (!/\p{L}/u.test(t)) return false;
  if (/^(seite\s+)?\d+(\s*\/\s*\d+)?$/i.test(t)) return false;
  const gross = grundHoehe > 0 && z.hoehe >= grundHoehe * 1.2;
  return gross || NUMMERIERT.test(t);
}

export interface KartenOptionen {
  quelle: Lernkarte["quelle"];
  /** Präfix für die Dokument-IDs, z. B. «kursskript-2026» */
  idPraefix: string;
  /** Gruppe, wenn keine erkannt wird */
  standardGruppe?: UntertestId;
}

/** Zeilen in Karten aufteilen. Die ID hängt vom Titel ab, erneutes Importieren überschreibt dieselbe Karte. */
export function kartenAusZeilen(zeilen: KartenZeile[], o: KartenOptionen): Array<{ id: string; daten: Lernkarte }> {
  const grund = median(zeilen.filter((z) => z.text.trim().length > 30 && z.hoehe > 0).map((z) => z.hoehe));
  const abschnitte: Array<{ titel: string; zeilen: string[] }> = [];
  for (const z of zeilen) {
    const t = z.text.trim();
    if (!t) continue;
    if (istUeberschrift(z, grund)) {
      const letzte = abschnitte[abschnitte.length - 1];
      // aufeinanderfolgende Überschriften zusammenfassen («Kapitel 3» + «Muster zuordnen»)
      if (letzte && letzte.zeilen.length === 0 && letzte.titel.length + t.length < 90) letzte.titel = `${letzte.titel} – ${t}`;
      else abschnitte.push({ titel: t, zeilen: [] });
    } else if (abschnitte.length) {
      abschnitte[abschnitte.length - 1].zeilen.push(t);
    }
  }

  const out: Array<{ id: string; daten: Lernkarte }> = [];
  const gesehen = new Map<string, number>();
  let gruppeVorher: UntertestId = o.standardGruppe ?? "uebergreifend";
  for (const a of abschnitte) {
    const text = zusammenfuegen(a.zeilen);
    if (text.length < MIN_TEXT) continue;
    const g = erkenneGruppe(a.titel, text);
    const gruppe: UntertestId = g && g !== "simulation" ? g : gruppeVorher;
    gruppeVorher = gruppe;
    for (const [i, teil] of teilen(text).entries()) {
      const titel = i === 0 ? a.titel : `${a.titel} (${i + 1})`;
      const basis = `${o.idPraefix}:${hashSeed(titel).toString(36)}`;
      const n = (gesehen.get(basis) ?? 0) + 1;
      gesehen.set(basis, n);
      out.push({ id: n === 1 ? basis : `${basis}-${n}`, daten: { titel, text: teil, gruppe, quelle: o.quelle } });
    }
  }
  return out;
}

/** Zeilen zu Absätzen verbinden, Silbentrennung am Zeilenende auflösen */
function zusammenfuegen(zeilen: string[]): string {
  let out = "";
  for (const z of zeilen) {
    if (!out) out = z;
    else if (/[a-zäöü]-$/.test(out) && /^[a-zäöü]/.test(z)) out = out.slice(0, -1) + z;
    else if (/^([•\-–*]|\d+[.)])\s/.test(z)) out += `\n${z}`;
    else out += ` ${z}`;
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

/** Zu lange Abschnitte an Satzgrenzen in mehrere Karten teilen */
function teilen(text: string): string[] {
  if (text.length <= MAX_TEXT) return [text];
  const teile: string[] = [];
  let rest = text;
  while (rest.length > MAX_TEXT) {
    const fenster = rest.slice(0, MAX_TEXT);
    const schnitt = Math.max(fenster.lastIndexOf(". "), fenster.lastIndexOf("\n"));
    const pos = schnitt > MAX_TEXT / 2 ? schnitt + 1 : MAX_TEXT;
    teile.push(rest.slice(0, pos).trim());
    rest = rest.slice(pos).trim();
  }
  if (rest.length >= MIN_TEXT || teile.length === 0) teile.push(rest);
  else teile[teile.length - 1] += ` ${rest}`;
  return teile;
}
