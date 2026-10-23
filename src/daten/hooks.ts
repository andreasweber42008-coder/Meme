import { useMemo } from "react";
import { useSammlung, useSpeicher } from "./DatenProvider";
import type { Datenspeicher } from "./store";
import {
  GRUPPEN,
  standardEinstellungen,
  type AufgabenGruppe,
  type Einstellungen,
  type Fehler,
  type Fortschritt,
  type Gamification,
  type MaterialSet,
  type SimulationsErgebnis,
  type TagStand,
  type Termin,
  type Versuch,
} from "./modelle";
import { heute, plusTage, type Tag } from "@/lib/datum";
import { istFaellig } from "@/lib/srs";
import { KONZ_REGEL_IDS } from "@/aufgaben/konz";
import type { PlanStand } from "@/plan/plan";

export const EINSTELLUNGEN_ID = "haupt";

export function einstellungenLesen(store: Datenspeicher): Einstellungen {
  const e = store.hole<Einstellungen>("einstellungen", EINSTELLUNGEN_ID);
  return { ...standardEinstellungen(), ...(e ?? {}) };
}

export function useEinstellungen(): [Einstellungen, (teil: Partial<Einstellungen>) => Promise<void>] {
  const store = useSpeicher();
  const liste = useSammlung<Einstellungen>("einstellungen");
  const e = useMemo(() => ({ ...standardEinstellungen(), ...(liste.find((d) => d.id === EINSTELLUNGEN_ID) ?? {}) }), [liste]);
  return [e, (teil) => store.speichern("einstellungen", EINSTELLUNGEN_ID, { ...einstellungenLesen(store), ...teil })];
}

export function useTage(): Record<Tag, TagStand | undefined> {
  const liste = useSammlung<TagStand>("tage");
  return useMemo(() => Object.fromEntries(liste.map((t) => [t.id, t])), [liste]);
}

export const GAMIFICATION_ID = "haupt";

export function useGamification(): Gamification {
  const liste = useSammlung<Gamification>("gamification");
  return useMemo(() => liste.find((g) => g.id === GAMIFICATION_ID) ?? { xpGesamt: 0, streakSchutz: 1, abzeichen: [] }, [liste]);
}

/**
 * Schwäche pro Gruppe (0 stark … 1 schwach) aus den letzten Versuchen, gemessen an der Ziel-Genauigkeit.
 * Ohne Daten: 0.5.
 */
export function schwaecheBerechnen(versuche: Versuch[], e: Einstellungen, bisTag: Tag): Partial<Record<AufgabenGruppe, number>> {
  const ab = plusTage(bisTag, -21);
  const out: Partial<Record<AufgabenGruppe, number>> = {};
  for (const g of GRUPPEN) {
    const liste = versuche.filter((v) => v.gruppe === g && v.tag >= ab && v.quelle !== "drill").slice(-60);
    if (liste.length < (liste.some((v) => v.quelle === "einstufung") ? 2 : 5)) {
      out[g] = 0.5;
      continue;
    }
    const quote = liste.filter((v) => v.richtig).length / liste.length;
    const ziel = e.ziele[g]?.genauigkeit ?? 0.75;
    out[g] = Math.max(0, Math.min(1, 0.5 + (ziel - quote) * 2));
  }
  return out;
}

export function usePlanStand(tag: Tag = heute()): PlanStand {
  const [einstellungen] = useEinstellungen();
  const fortschrittListe = useSammlung<Fortschritt>("fortschritt");
  const versuche = useSammlung<Versuch>("versuche");
  const fehler = useSammlung<Fehler>("fehlerheft");
  const material = useSammlung<MaterialSet>("material");
  const laeufe = useSammlung<{ setId: string; ende?: number }>("laeufe");
  const sims = useSammlung<SimulationsErgebnis>("simulationen");
  const termine = useSammlung<Termin>("termine");

  return useMemo<PlanStand>(() => {
    const fortschritt = Object.fromEntries(fortschrittListe.map((f) => [f.id, f]));
    const konzVerlauf = versuche
      .filter((v) => v.gruppe === "konz" && v.quelle === "konz" && v.seed)
      .map((v) => ({ tag: v.tag, regel: v.seed!.split(":")[0] }));
    return {
      einstellungen,
      heute: tag,
      fortschritt,
      schwaeche: schwaecheBerechnen(versuche, einstellungen, tag),
      konzVerlauf,
      konzRegeln: KONZ_REGEL_IDS,
      fehlerFaellig: fehler.filter((f) => !f.erledigt && istFaellig(f.srs, tag)).length,
      sets: material.map((m) => ({ id: m.id, gruppe: m.gruppe, titel: m.titel, zeitMinuten: m.zeitMinuten, quelle: m.quelle, jahr: m.jahr })),
      erledigteSets: [...new Set(laeufe.filter((l) => l.ende).map((l) => l.setId))],
      simulationen: sims.filter((s) => s.abgeschlossen).map((s) => ({ tag: s.tag, art: s.art })),
      termine,
    };
  }, [einstellungen, fortschrittListe, versuche, fehler, material, laeufe, sims, termine, tag]);
}
