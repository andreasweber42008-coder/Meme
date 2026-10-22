/** Ein Datensatz im lokalen Speicher, der mit Lovable Cloud abgeglichen wird. */
export interface Dokument<T = unknown> {
  sammlung: string;
  id: string;
  daten: T;
  geloescht: boolean;
  /** Zeitpunkt der letzten Änderung (ms seit 1970) – «Letzte Änderung gewinnt» */
  geaendert: number;
  /** false = noch nicht hochgeladen */
  synchron: boolean;
}

export interface Ablage {
  alleLaden(): Promise<Dokument[]>;
  schreiben(doks: Dokument[]): Promise<void>;
  metaLesen(schluessel: string): Promise<string | undefined>;
  metaSchreiben(schluessel: string, wert: string): Promise<void>;
  leeren(): Promise<void>;
}

/** Bekannte Sammlungen. Nur Kleinbuchstaben, Ziffern, - und _ (Regel der Datenbank). */
export const SAMMLUNGEN = [
  "einstellungen",
  "fortschritt",
  "versuche",
  "fehlerheft",
  "material",
  "laeufe",
  "markierungen",
  "simulationen",
  "termine",
  "tage",
  "gamification",
  "plan",
  "meldungen",
  "karten",
  "checklisten",
  "experimente",
] as const;
export type Sammlung = (typeof SAMMLUNGEN)[number];
