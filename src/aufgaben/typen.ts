import type { AufgabenGruppe } from "@/daten/modelle";
import type { GeneratorId } from "@/lernpfad/einheiten";

export const BUCHSTABEN = ["A", "B", "C", "D", "E"] as const;
export type Buchstabe = (typeof BUCHSTABEN)[number];

export interface Option {
  text: string;
  /** Welcher Denkfehler führt zu dieser (falschen) Option? */
  denkfehler?: string;
  /** Methodenschritt, der diesen Fehler verhindert hätte */
  schritt?: number;
}

/** Kurzer Drill für genau einen Methodenschritt (Stufe 3 «Einzelschritte» und Stufe 4/5 «Geführt»). */
export interface SchrittDrill {
  schritt: number;
  frage: string;
  optionen: string[];
  loesung: number;
  erklaerung: string;
}

export interface Aufgabe<D = unknown> {
  generator: GeneratorId;
  seed: string;
  schwierigkeit: number; // 1–5
  gruppe: AufgabenGruppe;
  methodeId: string;
  frage: string;
  daten: D;
  optionen: Option[];
  loesung: number;
  /** Musterlösung Schritt für Schritt, mit Bezug zum Methodenschritt */
  loesungsweg: Array<{ schritt: number; text: string }>;
  drills: SchrittDrill[];
  /** Zielzeit im EMS-Tempo */
  zielSekunden: number;
  /** Herkunft (z. B. Aufgabenbank) */
  quelle?: string;
}

export interface EinzelGenerator<D = unknown> {
  id: GeneratorId;
  erzeugen(seed: string, schwierigkeit: number, methodeId?: string): Aufgabe<D>;
  /** Liste von Problemen; leer = gültig (genau eine richtige Antwort usw.) */
  pruefen(a: Aufgabe<D>): string[];
}

export function aufgabenSchluessel(a: Pick<Aufgabe, "generator" | "seed" | "schwierigkeit">): string {
  return `${a.generator}:${a.schwierigkeit}:${a.seed}`;
}

/** Gemeinsame Prüfungen: 5 Optionen, eindeutige Texte, Lösung im Bereich, Drills gültig. */
export function grundpruefung(a: Aufgabe): string[] {
  const p: string[] = [];
  if (a.optionen.length !== 5) p.push(`${a.optionen.length} statt 5 Optionen`);
  const texte = a.optionen.map((o) => o.text.trim());
  if (new Set(texte).size !== texte.length) p.push(`doppelte Optionen: ${texte.join(" | ")}`);
  if (!(a.loesung >= 0 && a.loesung < a.optionen.length)) p.push("Lösung ausserhalb");
  if (a.optionen[a.loesung]?.denkfehler) p.push("richtige Option hat einen Denkfehler");
  a.optionen.forEach((o, i) => {
    if (i !== a.loesung && !o.denkfehler) p.push(`Distraktor ${BUCHSTABEN[i]} ohne Denkfehler`);
  });
  for (const d of a.drills) {
    if (!(d.loesung >= 0 && d.loesung < d.optionen.length)) p.push(`Drill ${d.schritt}: Lösung ausserhalb`);
    if (new Set(d.optionen).size !== d.optionen.length) p.push(`Drill ${d.schritt}: doppelte Optionen`);
  }
  if (a.loesungsweg.length === 0) p.push("kein Lösungsweg");
  return p;
}

/** Optionen mischen und Lösung mitführen */
export function mitLoesungMischen(richtig: Option, falsche: Option[], z: { mischen<T>(l: readonly T[]): T[] }): { optionen: Option[]; loesung: number } {
  const alle = z.mischen([richtig, ...falsche]);
  return { optionen: alle, loesung: alle.indexOf(richtig) };
}
