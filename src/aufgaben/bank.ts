import { z } from "zod";
import { Zufall } from "@/lib/zufall";
import type { Aufgabe, EinzelGenerator, Option, SchrittDrill } from "./typen";
import { grundpruefung } from "./typen";

/**
 * Aufgabenbanken für Med-Nat und Textverständnis (eigene Aufgaben, keine echten EMS-Aufgaben).
 * Jede Aufgabe wurde unabhängig ein zweites Mal gelöst; nur eindeutige Aufgaben sind in der Bank.
 */

export const DENKFEHLER = {
  frage: "Fragestellung nicht genau gelesen",
  verneinung: "Verneinung («NICHT», «falsch») übersehen",
  vertauscht: "Begriffe oder Details vertauscht",
  kette: "Kette nicht zu Ende verfolgt",
  richtung: "Richtung umgekehrt (mehr ↔ weniger, fördert ↔ hemmt)",
  kausal: "Ursache und Wirkung verwechselt",
  absolut: "Absolute Formulierung übersehen («immer», «nie», «nur», «alle»)",
  vorwissen: "Steht nicht im Text – Vorwissen statt Ableitung",
  zuschnell: "Richtige Aussage zu schnell verworfen",
  rechnung: "Rechen- oder Einheitenfehler",
} as const;
export type DenkfehlerCode = keyof typeof DENKFEHLER;
const CODES = Object.keys(DENKFEHLER) as [DenkfehlerCode, ...DenkfehlerCode[]];

/** Welcher Methodenschritt verhindert welchen Denkfehler? */
export const SCHRITT_FUER: Record<"mednat-ableiten" | "text-markieren", Record<DenkfehlerCode, number>> = {
  "mednat-ableiten": { frage: 1, verneinung: 6, vertauscht: 2, kette: 3, richtung: 3, kausal: 3, rechnung: 3, zuschnell: 4, absolut: 5, vorwissen: 5 },
  "text-markieren": { frage: 4, verneinung: 3, vertauscht: 3, kette: 3, richtung: 3, kausal: 3, rechnung: 3, zuschnell: 4, absolut: 4, vorwissen: 4 },
};

const fehlerSchema = z.record(z.union([z.enum(CODES), z.tuple([z.enum(CODES), z.string()])]));

const frageFelder = {
  frage: z.string().min(5),
  aussagen: z.array(z.string()).length(3).optional(),
  optionen: z.array(z.string().min(1)).length(5),
  loesung: z.number().int().min(0).max(4),
  fehler: fehlerSchema,
  weg: z.string().min(5),
};

export const mednatSchema = z.object({ id: z.string(), thema: z.string(), schwierigkeit: z.number().int().min(1).max(5), text: z.string().min(50), ...frageFelder });
export type MedNatEintrag = z.infer<typeof mednatSchema>;

export const textFrageSchema = z.object({ id: z.string(), ...frageFelder, absatz: z.array(z.number().int().min(1)).optional() });
export const textSchema = z.object({
  id: z.string(),
  titel: z.string(),
  thema: z.string(),
  absaetze: z.array(z.string().min(20)).min(3),
  fragen: z.array(textFrageSchema).length(6),
});
export type TextFrage = z.infer<typeof textFrageSchema>;
export type TextEintrag = z.infer<typeof textSchema>;

/** Aufgaben, die die unabhängige Zweitlösung nicht eindeutig bestanden haben (werden nicht verwendet). */
export const AUSGESCHLOSSEN = new Set<string>([]);

const dateien = import.meta.glob<{ default: unknown[] }>("../content/bank/*.json", { eager: true });

function laden<T>(praefix: string, schema: z.ZodType<T>): T[] {
  return Object.entries(dateien)
    .filter(([pfad]) => pfad.split("/").pop()!.startsWith(praefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, m]) => m.default.map((e) => schema.parse(e)));
}

export const MEDNAT_BANK: MedNatEintrag[] = laden("mednat-", mednatSchema).filter((e) => !AUSGESCHLOSSEN.has(e.id));
export const TEXT_BANK: TextEintrag[] = laden("text-", textSchema).map((t) => ({
  ...t,
  fragen: t.fragen.filter((f) => !AUSGESCHLOSSEN.has(f.id)),
}));

function fehlerAuflösen(f: z.infer<typeof fehlerSchema>[string]): { code: DenkfehlerCode; erklaerung?: string } {
  return Array.isArray(f) ? { code: f[0], erklaerung: f[1] } : { code: f };
}

export type FrageArt = "ableitbar" | "nicht-ableitbar" | "kombi" | "rechnung";

export function frageArt(e: { frage: string; aussagen?: string[]; fehler: z.infer<typeof fehlerSchema> }): FrageArt {
  if (e.aussagen) return "kombi";
  if (/\bNICHT\b|falsch\?/.test(e.frage)) return "nicht-ableitbar";
  if (Object.values(e.fehler).every((f) => fehlerAuflösen(f).code === "rechnung" || fehlerAuflösen(f).code === "frage")) return "rechnung";
  return "ableitbar";
}

const FRAGEART_TEXT: Record<FrageArt, string> = {
  ableitbar: "Gesucht ist die eine ableitbare Aussage.",
  "nicht-ableitbar": "Verneinte Frage: Gesucht ist die Aussage, die NICHT ableitbar bzw. falsch ist.",
  kombi: "Kombinationsfrage: Aussagen I–III einzeln prüfen, dann die passende Kombination wählen.",
  rechnung: "Rechenfrage: Grössen aus dem Text herausschreiben und Schritt für Schritt rechnen.",
};

/** Die Aussage, die in den Kombi-Optionen am häufigsten vorkommt (Schritt «Häufigste Aussage zuerst»). */
export function haeufigsteAussage(optionen: string[]): number {
  const zaehler = [0, 0, 0];
  for (const o of optionen) {
    const roemisch = o.match(/\b(I{1,3})\b/g) ?? [];
    for (const r of roemisch) zaehler[r.length - 1]++;
  }
  return zaehler.indexOf(Math.max(...zaehler));
}

type FrageDaten = { frage: string; aussagen?: string[]; optionen: string[]; loesung: number; fehler: z.infer<typeof fehlerSchema>; weg: string };

/** Optionen, Lösungsweg und Schritt-Drills aus einem Bank-Eintrag. Die Reihenfolge der Optionen bleibt wie im Original. */
export function bankAufgabe<D>(
  e: FrageDaten,
  methodeId: "mednat-ableiten" | "text-markieren",
  z: Zufall,
): Pick<Aufgabe<D>, "optionen" | "loesung" | "loesungsweg" | "drills"> {
  const schritte = SCHRITT_FUER[methodeId];
  const optionen: Option[] = e.optionen.map((text, i) => {
    if (i === e.loesung) return { text };
    const f = e.fehler[String(i)];
    if (!f) return { text, denkfehler: DENKFEHLER.vorwissen, schritt: schritte.vorwissen };
    const { code, erklaerung } = fehlerAuflösen(f);
    return { text, denkfehler: erklaerung ? `${DENKFEHLER[code]}: ${erklaerung}` : DENKFEHLER[code], schritt: schritte[code] };
  });

  const art = frageArt(e);
  const drills: SchrittDrill[] = [];
  const artOptionen: FrageArt[] = ["ableitbar", "nicht-ableitbar", "kombi", "rechnung"];
  const artTexte = artOptionen.map((a) => FRAGEART_TEXT[a]);
  drills.push({
    schritt: methodeId === "mednat-ableiten" ? 1 : 4,
    frage: "Fragen zuerst: Was genau ist gesucht?",
    optionen: artTexte,
    loesung: artOptionen.indexOf(art),
    erklaerung: FRAGEART_TEXT[art],
  });

  if (e.aussagen && methodeId === "mednat-ableiten") {
    const h = haeufigsteAussage(e.optionen);
    drills.push({
      schritt: 4,
      frage: "Welche Aussage prüfst du zuerst?",
      optionen: ["Aussage I", "Aussage II", "Aussage III"],
      loesung: h,
      erklaerung: `Aussage ${["I", "II", "III"][h]} kommt in den Antworten am häufigsten vor – ihre Prüfung schliesst am meisten aus.`,
    });
  }

  // Ein Distraktor als Prüf-Drill: Warum ist diese Option falsch?
  const falsche = optionen.map((o, i) => ({ o, i })).filter(({ i }) => i !== e.loesung);
  const probe = z.waehle(falsche);
  const probeCode = fehlerAuflösen(e.fehler[String(probe.i)] ?? "vorwissen").code;
  const codeAuswahl = z.mischen([probeCode, ...z.stichprobe(CODES.filter((c) => c !== probeCode && c !== "rechnung"), 3)]);
  drills.push({
    schritt: schritte[probeCode],
    frage: `«${probe.o.text}» – warum ist diese Option nicht die gesuchte?`,
    optionen: codeAuswahl.map((c) => DENKFEHLER[c]),
    loesung: codeAuswahl.indexOf(probeCode),
    erklaerung: probe.o.denkfehler ?? "",
  });

  if (art === "ableitbar" || art === "kombi") {
    drills.push({
      schritt: methodeId === "mednat-ableiten" ? 5 : 4,
      frage: "Eine Aussage steht so nicht im Text, widerspricht ihm aber auch nicht. Sie ist …",
      optionen: ["nicht ableitbar", "ableitbar, weil sie medizinisch stimmt", "ableitbar, wenn sie plausibel klingt"],
      loesung: 0,
      erklaerung: "Nur der Text zählt: Was nicht drinsteht, ist nicht ableitbar – auch wenn es stimmt.",
    });
  }

  const loesungsweg = [
    { schritt: methodeId === "mednat-ableiten" ? 1 : 4, text: FRAGEART_TEXT[art] },
    { schritt: methodeId === "mednat-ableiten" ? 5 : 4, text: e.weg },
  ];
  return { optionen, loesung: e.loesung, loesungsweg, drills };
}

export interface MedNatDaten {
  id: string;
  thema: string;
  text: string;
  aussagen?: string[];
}

/** Wählt per Seed einen Eintrag der passenden Schwierigkeit (±1), sonst irgendeinen. */
export function mednatEintrag(seed: string, schwierigkeit: number): MedNatEintrag {
  const z = new Zufall(`mednat:${seed}`);
  const passend = MEDNAT_BANK.filter((e) => Math.abs(e.schwierigkeit - schwierigkeit) <= 1);
  return z.waehle(passend.length > 0 ? passend : MEDNAT_BANK);
}

export function mednatAusEintrag(e: MedNatEintrag, seed: string, methodeId = "mednat-ableiten"): Aufgabe<MedNatDaten> {
  const z = new Zufall(`mednat-drill:${e.id}:${seed}`);
  return {
    generator: "mednat",
    seed,
    schwierigkeit: e.schwierigkeit,
    gruppe: "med-nat",
    methodeId,
    frage: e.frage,
    daten: { id: e.id, thema: e.thema, text: e.text, aussagen: e.aussagen },
    ...bankAufgabe<MedNatDaten>(e, "mednat-ableiten", z),
    zielSekunden: 135, // 20 Aufgaben in 45 Minuten
    quelle: `Aufgabenbank ${e.id}`,
  };
}

export const mednatGenerator: EinzelGenerator<MedNatDaten> = {
  id: "mednat",
  erzeugen(seed, schwierigkeit, methodeId) {
    return mednatAusEintrag(mednatEintrag(seed, schwierigkeit), seed, methodeId);
  },
  pruefen(a) {
    return grundpruefung(a);
  },
};

export interface TextAufgabeDaten {
  textId: string;
  titel: string;
  absaetze: string[];
  absatz?: number[];
  aussagen?: string[];
}

/** Alle 6 Fragen eines Textes als Aufgaben. */
export function textAufgaben(t: TextEintrag, seed: string, methodeId = "text-markieren"): Aufgabe<TextAufgabeDaten>[] {
  return t.fragen.map((f, i) => {
    const z = new Zufall(`text-drill:${f.id}:${seed}`);
    return {
      generator: "text",
      seed: `${seed}:${i}`,
      schwierigkeit: 3,
      gruppe: "textverstaendnis",
      methodeId,
      frage: f.frage,
      daten: { textId: t.id, titel: t.titel, absaetze: t.absaetze, absatz: f.absatz, aussagen: f.aussagen },
      ...bankAufgabe<TextAufgabeDaten>(f, "text-markieren", z),
      zielSekunden: 150, // 6 Fragen in 15 Minuten
      quelle: `Textbank ${f.id}`,
    };
  });
}

export function textEintrag(seed: string): TextEintrag | undefined {
  if (TEXT_BANK.length === 0) return undefined;
  return new Zufall(`text:${seed}`).waehle(TEXT_BANK);
}

/** Prüft einen Bank-Eintrag auf formale Fehler (Schema, Distraktoren, Kombi-Optionen). */
export function pruefeEintrag(e: FrageDaten & { id: string }): string[] {
  const p: string[] = [];
  if (new Set(e.optionen.map((o) => o.trim())).size !== 5) p.push(`${e.id}: doppelte Optionen`);
  for (let i = 0; i < 5; i++) {
    if (i === e.loesung && e.fehler[String(i)]) p.push(`${e.id}: richtige Option hat einen Denkfehler`);
    if (i !== e.loesung && !e.fehler[String(i)]) p.push(`${e.id}: Option ${i} ohne Denkfehler`);
  }
  const ss = String.fromCharCode(0xdf);
  const alles = JSON.stringify(e);
  if (alles.includes(ss)) p.push(`${e.id}: scharfes S`);
  if (/[„“]/.test(alles)) p.push(`${e.id}: deutsche Anführungszeichen statt «»`);
  return p;
}
