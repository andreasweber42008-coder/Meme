import { plusTage, type Tag } from "./datum";

/** Abstände der Wiedervorlage in Tagen (Leitner-Fächer). */
export const INTERVALLE = [1, 3, 7, 14, 30, 60] as const;

export interface SrsStand {
  fach: number; // 0 … INTERVALLE.length - 1
  faellig: Tag;
  zuletzt?: Tag;
}

/**
 * Nächste Wiedervorlage. Richtig → ein Fach weiter, falsch → zurück auf Fach 0.
 * Nie nach dem Testtag: Bis dahin bleibt alles frisch.
 */
export function naechsteWiederholung(stand: SrsStand | undefined, richtig: boolean, heute: Tag, testtag?: Tag): SrsStand {
  const fach = richtig ? Math.min((stand?.fach ?? -1) + 1, INTERVALLE.length - 1) : 0;
  let faellig = plusTage(heute, INTERVALLE[fach]);
  if (testtag && faellig >= testtag) faellig = plusTage(testtag, -2) > heute ? plusTage(testtag, -2) : plusTage(heute, 1);
  return { fach, faellig, zuletzt: heute };
}

export function istFaellig(stand: SrsStand | undefined, heute: Tag): boolean {
  return !!stand && stand.faellig <= heute;
}
