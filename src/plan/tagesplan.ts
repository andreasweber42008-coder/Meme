import { useEffect, useMemo } from "react";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen, usePlanStand } from "@/daten/hooks";
import type { Datenspeicher } from "@/daten/store";
import { heute } from "@/lib/datum";
import { planeTag, type PlanTag } from "./plan";

/**
 * Der Tagespfad bleibt für den ganzen Tag gleich: Er wird beim ersten Öffnen berechnet und gespeichert.
 * So verschwinden erledigte Stationen nicht, wenn sich der Lernstand im Lauf des Tages ändert.
 */
export function tagesplanId(tag = heute()): string {
  return `tag:${tag}`;
}

export function useTagesplan(): PlanTag {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const tag = heute();
  const stand = usePlanStand(tag);
  const gespeichert = useDokument<PlanTag>("plan", tagesplanId(tag));
  const live = useMemo(() => planeTag(tag, stand), [tag, stand]);
  useEffect(() => {
    if (!gespeichert && e.onboardingFertig) void store.speichern("plan", tagesplanId(tag), live);
  }, [gespeichert, e.onboardingFertig, store, tag, live]);
  return gespeichert ?? live;
}

/** Nach geänderten Einstellungen: Tagespfad neu berechnen lassen */
export async function tagesplanZuruecksetzen(store: Datenspeicher): Promise<void> {
  if (store.hole("plan", tagesplanId())) await store.loeschen("plan", tagesplanId());
}
