import { METHODEN } from "@/content";
import type { Methode } from "@/content/schema";
import type { AufgabenGruppe } from "@/daten/modelle";

export type GeneratorId = "muster" | "mednat" | "objekte" | "quanti" | "figuren" | "fakten" | "text" | "diagramme" | "konz";

export interface Einheit {
  methodeId: string;
  methode: Methode;
  gruppe: AufgabenGruppe;
  generator: GeneratorId;
  /** «klein» = täglich (Milan), «gross» = paarweise rotieren, «konz» = 1–2× pro Woche */
  art: "klein" | "gross" | "konz";
  /** Reihenfolge im Lernpfad innerhalb der Gruppe */
  rang: number;
  /** Format: einzelne Aufgaben oder Block (Einprägen/Abruf, Konz-Blatt, Text mit 6 Fragen) */
  format: "einzel" | "gedaechtnis" | "konz" | "text";
}

const ZUORDNUNG: Record<string, Omit<Einheit, "methodeId" | "methode" | "gruppe">> = {
  "muster-grundverfahren": { generator: "muster", art: "klein", rang: 1, format: "einzel" },
  kreuzblick: { generator: "muster", art: "klein", rang: 2, format: "einzel" },
  "mednat-ableiten": { generator: "mednat", art: "gross", rang: 1, format: "einzel" },
  "objekte-im-raum": { generator: "objekte", art: "klein", rang: 1, format: "einzel" },
  "quanti-drei-runden": { generator: "quanti", art: "gross", rang: 1, format: "einzel" },
  "figuren-unikat": { generator: "figuren", art: "klein", rang: 1, format: "gedaechtnis" },
  "fakten-loci": { generator: "fakten", art: "klein", rang: 1, format: "gedaechtnis" },
  "text-markieren": { generator: "text", art: "gross", rang: 1, format: "text" },
  "diatab-ableiten": { generator: "diagramme", art: "gross", rang: 1, format: "einzel" },
  "konz-zeilenweise": { generator: "konz", art: "konz", rang: 1, format: "konz" },
};

export const EINHEITEN: Einheit[] = METHODEN.filter((m) => m.art === "einheit").map((m) => {
  const z = ZUORDNUNG[m.id];
  if (!z) throw new Error(`Keine Einheit für Methode ${m.id}`);
  return { ...z, methodeId: m.id, methode: m, gruppe: m.untertest as AufgabenGruppe };
});

export function einheit(methodeId: string): Einheit {
  const e = EINHEITEN.find((x) => x.methodeId === methodeId);
  if (!e) throw new Error(`Unbekannte Einheit ${methodeId}`);
  return e;
}

export function einheitenFuer(gruppe: AufgabenGruppe): Einheit[] {
  return EINHEITEN.filter((e) => e.gruppe === gruppe).sort((a, b) => a.rang - b.rang);
}

/** Geschätzte Minuten einer Lektion je Stufe */
export function lektionsMinuten(e: Einheit, stufe: number): number {
  if (stufe <= 1) return 5;
  if (e.format === "konz") return stufe >= 8 ? 10 : stufe >= 6 ? 6 : 4;
  if (e.format === "gedaechtnis") return stufe >= 8 ? (e.generator === "figuren" ? 10 : 13) : stufe >= 6 ? 8 : 6;
  if (e.format === "text") return stufe >= 6 ? 16 : 10;
  if (e.art === "gross") return stufe >= 8 ? 23 : 10;
  return stufe >= 8 ? 9 : 6;
}
