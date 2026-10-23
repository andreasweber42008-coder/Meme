import type { Datenspeicher } from "@/daten/store";
import type { Gamification } from "@/daten/modelle";
import { GAMIFICATION_ID } from "@/daten/hooks";
import { anziehen, kaufen, type KaufFehler, type Platz } from "./shop";

function lesen(store: Datenspeicher): Gamification {
  return store.hole<Gamification>("gamification", GAMIFICATION_ID) ?? { xpGesamt: 0, streakSchutz: 1, abzeichen: [] };
}

export async function artikelKaufen(store: Datenspeicher, id: string): Promise<KaufFehler | null> {
  const r = kaufen(lesen(store), id);
  if (!r.ok) return r.grund;
  await store.speichern("gamification", GAMIFICATION_ID, r.neu);
  return null;
}

export async function artikelAnziehen(store: Datenspeicher, platz: Platz, id: string | null): Promise<void> {
  await store.speichern("gamification", GAMIFICATION_ID, anziehen(lesen(store), platz, id));
}
