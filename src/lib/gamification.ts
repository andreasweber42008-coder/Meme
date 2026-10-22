import { plusTage, type Tag } from "./datum";
import type { TagStand } from "@/daten/modelle";

export const XP = { richtig: 2, lektion: 10, stufe: 30, simulation: 50, serie: 20, fehler: 3 } as const;

/**
 * Streak: Tage am Stück mit mindestens einer erledigten Einheit.
 * Geplante freie Tage und eingesetzte Schutzschilde unterbrechen die Serie nicht.
 */
export function streak(tage: Record<Tag, TagStand | undefined>, heute: Tag, istFrei: (t: Tag) => boolean): number {
  let n = 0;
  let tag = (tage[heute]?.xp ?? 0) > 0 ? heute : plusTage(heute, -1);
  for (let i = 0; i < 2000; i++) {
    const s = tage[tag];
    if ((s?.xp ?? 0) > 0) n++;
    else if (!(s?.streakSchutz || istFrei(tag))) break;
    tag = plusTage(tag, -1);
  }
  return n;
}

/** Ist die Serie heute in Gefahr? (gestern aktiv, heute noch nichts, Abend) */
export function streakInGefahr(tage: Record<Tag, TagStand | undefined>, heute: Tag, stunde: number): boolean {
  return (tage[heute]?.xp ?? 0) === 0 && stunde >= 17;
}

export interface AbzeichenDef {
  id: string;
  titel: string;
  beschreibung: string;
}

export const ABZEICHEN: AbzeichenDef[] = [
  { id: "erste-lektion", titel: "Erster Schritt", beschreibung: "Erste Lektion abgeschlossen." },
  { id: "streak-7", titel: "Eine Woche dran", beschreibung: "7 Tage am Stück gelernt." },
  { id: "streak-30", titel: "Murmeltier-Ausdauer", beschreibung: "30 Tage am Stück gelernt." },
  { id: "erste-simulation", titel: "Ernstfall geprobt", beschreibung: "Erste Simulation abgeschlossen." },
  { id: "volle-simulation", titel: "3 Stunden 55", beschreibung: "Eine volle Simulation durchgezogen." },
  { id: "fehlerheft", titel: "Aus Fehlern gelernt", beschreibung: "10 Fehler aus dem Fehlerheft erledigt." },
  { id: "alle-gruppen", titel: "Alle Neune", beschreibung: "In allen 9 Aufgabengruppen geübt." },
];

export function methodeGemeistertAbzeichen(methodeId: string, name: string): AbzeichenDef {
  return { id: `methode:${methodeId}`, titel: `Methode gemeistert: ${name}`, beschreibung: "Stufe 8 «Ernstfall» bestanden." };
}
