import type { UntertestId } from "./schema";

export interface Untertest {
  id: UntertestId;
  name: string;
  kurzname: string;
  teil: "A" | "B" | "A+B" | null;
  aufgaben: number | null;
  /** Bearbeitungszeit in Minuten laut Test-Info 2026 */
  minuten: string | null;
  zieltempo: string | null;
}

/** Reihenfolge wie im EMS (Test-Info 2026). Gedächtnistests: Einprägen in Teil A, Abrufen in Teil B. */
export const UNTERTESTS: Untertest[] = [
  { id: "muster-zuordnen", name: "Muster zuordnen", kurzname: "Muster", teil: "A", aufgaben: 18, minuten: "16", zieltempo: "53 s pro Aufgabe" },
  { id: "med-nat", name: "Medizinisch-naturwissenschaftliches Grundverständnis", kurzname: "Med-Nat", teil: "A", aufgaben: 18, minuten: "45", zieltempo: "150 s pro Aufgabe" },
  { id: "objekte-im-raum", name: "Objekte im Raum", kurzname: "Objekte", teil: "A", aufgaben: 18, minuten: "10", zieltempo: "33 s pro Aufgabe" },
  { id: "quanti", name: "Quantitative und formale Probleme", kurzname: "Quanti", teil: "A", aufgaben: 18, minuten: "45", zieltempo: "150 s pro Aufgabe" },
  { id: "figuren-lernen", name: "Figuren lernen", kurzname: "Figuren", teil: "A+B", aufgaben: 18, minuten: "4 + 5", zieltempo: "13 s pro Figur" },
  { id: "fakten-lernen", name: "Fakten lernen", kurzname: "Fakten", teil: "A+B", aufgaben: 18, minuten: "6 + 6", zieltempo: "24 s pro Fall" },
  { id: "textverstaendnis", name: "Textverständnis", kurzname: "Text", teil: "B", aufgaben: 18, minuten: "45", zieltempo: "15 min pro Text" },
  { id: "diagramme-tabellen", name: "Diagramme und Tabellen", kurzname: "Diagramme", teil: "B", aufgaben: 18, minuten: "45", zieltempo: "150 s pro Aufgabe" },
  { id: "konz", name: "Konzentriertes und sorgfältiges Arbeiten", kurzname: "Konz", teil: "B", aufgaben: null, minuten: "8", zieltempo: "~10 Zielzeichen pro Zeile" },
  { id: "uebergreifend", name: "Übergreifend", kurzname: "Übergreifend", teil: null, aufgaben: null, minuten: null, zieltempo: null },
];

export function untertestById(id: UntertestId): Untertest {
  const u = UNTERTESTS.find((x) => x.id === id);
  if (!u) throw new Error(`Unbekannter Untertest: ${id}`);
  return u;
}
