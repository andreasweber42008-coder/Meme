import type { GeneratorId } from "@/lernpfad/einheiten";
import type { Aufgabe, EinzelGenerator } from "./typen";
import { musterGenerator } from "./muster";
import { objekteGenerator } from "./objekte";
import { quantiGenerator } from "./quanti";
import { diagrammGenerator } from "./diagramme";
import { mednatGenerator, textAufgaben, textEintrag, TEXT_BANK } from "./bank";
import { neuerSeed } from "@/lib/zufall";

export type EinzelGeneratorId = "muster" | "mednat" | "objekte" | "quanti" | "diagramme";

export const EINZEL_GENERATOREN: Record<EinzelGeneratorId, EinzelGenerator> = {
  muster: musterGenerator as EinzelGenerator,
  mednat: mednatGenerator as EinzelGenerator,
  objekte: objekteGenerator as EinzelGenerator,
  quanti: quantiGenerator as EinzelGenerator,
  diagramme: diagrammGenerator as EinzelGenerator,
};

export function istEinzel(g: GeneratorId): g is EinzelGeneratorId {
  return g in EINZEL_GENERATOREN;
}

/** Aufgabe aus einem Schlüssel wiederherstellen (Fehlerheft, Meldungen). */
export function aufgabeAus(generator: string, seed: string, schwierigkeit: number, methodeId?: string): Aufgabe | undefined {
  try {
    if (istEinzel(generator as GeneratorId)) return EINZEL_GENERATOREN[generator as EinzelGeneratorId].erzeugen(seed, schwierigkeit, methodeId);
    if (generator === "text") {
      const [textSeed, nr] = seed.split(":");
      const t = textEintrag(textSeed);
      return t ? textAufgaben(t, textSeed, methodeId)[Number(nr) || 0] : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Mehrere gültige Aufgaben erzeugen (ungültige werden verworfen und neu gewürfelt). */
export function aufgabenErzeugen(
  generator: EinzelGeneratorId,
  anzahl: number,
  schwierigkeit: number,
  methodeId?: string,
  basis = neuerSeed(),
  gesperrt: Set<string> = new Set(),
): Aufgabe[] {
  const g = EINZEL_GENERATOREN[generator];
  const out: Aufgabe[] = [];
  const gesehen = new Set<string>();
  for (let i = 0; out.length < anzahl && i < anzahl * 6; i++) {
    try {
      const a = g.erzeugen(`${basis}-${i}`, schwierigkeit, methodeId);
      const schluessel = a.quelle ?? JSON.stringify(a.daten).slice(0, 400);
      if (gesehen.has(schluessel) || gesperrt.has(schluessel) || gesperrt.has(`${a.generator}:${a.seed}`) || g.pruefen(a).length > 0) continue;
      gesehen.add(schluessel);
      out.push(a);
    } catch {
      /* nächster Seed */
    }
  }
  return out;
}

export { TEXT_BANK };

/** Schlüssel gemeldeter Aufgaben (Bank-Quelle oder Generator+Seed) */
export function gesperrteSchluessel(meldungen: Array<{ generator: string; seed: string; quelle?: string }>): Set<string> {
  return new Set(meldungen.flatMap((m) => [m.quelle, `${m.generator}:${m.seed}`].filter((x): x is string => !!x)));
}
