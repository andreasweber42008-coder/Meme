import { useMemo } from "react";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import type { Fortschritt } from "@/daten/modelle";
import type { Datenspeicher } from "@/daten/store";

export function useFortschritt(): Record<string, Fortschritt | undefined> {
  const liste = useSammlung<Fortschritt>("fortschritt");
  return useMemo(() => Object.fromEntries(liste.map((f) => [f.id, f])), [liste]);
}

/** Stufe 1 «Verstehen» abschliessen (oder zurücksetzen). */
export async function verstandenSetzen(store: Datenspeicher, methodeId: string, verstanden: boolean): Promise<void> {
  const alt = store.hole<Fortschritt>("fortschritt", methodeId);
  await store.speichern<Fortschritt>("fortschritt", methodeId, {
    ...(alt ?? { stufe: 1 }),
    stufe: verstanden ? Math.max(2, alt?.stufe ?? 1) : 1,
    verstandenAm: verstanden ? new Date().toISOString() : undefined,
  });
}

export function useVerstanden() {
  const store = useSpeicher();
  return (methodeId: string, verstanden: boolean) => verstandenSetzen(store, methodeId, verstanden);
}
