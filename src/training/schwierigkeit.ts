/** Schwierigkeit im freien Training: fest oder automatisch (passt sich an deine Antworten an). */
export type SchwierigkeitsModus = "auto" | "leicht" | "mittel" | "schwer";

export const MODI: Array<{ id: SchwierigkeitsModus; name: string }> = [
  { id: "auto", name: "Automatisch" },
  { id: "leicht", name: "Leicht" },
  { id: "mittel", name: "Mittel" },
  { id: "schwer", name: "Schwer" },
];

const FEST: Record<Exclude<SchwierigkeitsModus, "auto">, number> = { leicht: 2, mittel: 3, schwer: 5 };

/**
 * Automatisch: nach 3 richtigen in Folge eine Stufe schwerer, nach einer falschen eine leichter (1–5).
 */
export function naechsteSchwierigkeit(modus: SchwierigkeitsModus, aktuell: number, richtigInFolge: number, letzteFalsch: boolean): number {
  if (modus !== "auto") return FEST[modus];
  if (letzteFalsch) return Math.max(1, aktuell - 1);
  if (richtigInFolge > 0 && richtigInFolge % 3 === 0) return Math.min(5, aktuell + 1);
  return aktuell;
}
