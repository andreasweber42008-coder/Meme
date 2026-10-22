import { z } from "zod";

export const HERKUNFT = ["milan", "ncwiki", "ergaenzung", "anpassung", "test-info"] as const;
export const herkunftSchema = z.enum(HERKUNFT);
export type Herkunft = z.infer<typeof herkunftSchema>;

export const UNTERTEST_IDS = [
  "muster-zuordnen",
  "med-nat",
  "objekte-im-raum",
  "quanti",
  "figuren-lernen",
  "fakten-lernen",
  "textverstaendnis",
  "diagramme-tabellen",
  "konz",
  "uebergreifend",
] as const;
export const untertestIdSchema = z.enum(UNTERTEST_IDS);
export type UntertestId = z.infer<typeof untertestIdSchema>;

/** Ein Satz aus den Quellen. Ohne Herkunft gilt die Herkunft der Methode. */
export const itemSchema = z.union([
  z.string().min(1),
  z.object({ text: z.string().min(1), herkunft: herkunftSchema }).strict(),
]);
export type Item = z.infer<typeof itemSchema>;

const quelleSchema = z
  .object({
    herkunft: herkunftSchema,
    titel: z.string().min(1),
    originaltitel: z.string().optional(),
    url: z.string().url().optional(),
    videoId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{11}$/)
      .optional(),
    datum: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    laenge: z.string().optional(),
    fundstelle: z.string().optional(),
  })
  .strict();
export type Quelle = z.infer<typeof quelleSchema>;

const schrittSchema = z
  .object({
    nr: z.number().int().positive(),
    titel: z.string().min(1),
    tun: z.string().min(1),
    achten: z.array(itemSchema),
    zeit: z.string().optional(),
    herkunft: herkunftSchema,
    phase: z.enum(["einrichten", "nachbereitung"]).optional(),
  })
  .strict();
export type Schritt = z.infer<typeof schrittSchema>;

const varianteSeiteSchema = z
  .object({ text: z.string().min(1), herkunft: herkunftSchema, quelle: z.string().min(1) })
  .strict();

const entscheidungSchema = z
  .object({
    id: z.string().regex(/^W\d+$/),
    thema: z.string().min(1),
    a: varianteSeiteSchema,
    b: varianteSeiteSchema,
    gewaehlt: z.enum(["a", "b", "beide"]),
    begruendung: z.string().min(1),
  })
  .strict();
export type Entscheidung = z.infer<typeof entscheidungSchema>;

const offeneFrageSchema = z
  .object({ id: z.string().regex(/^F\d+$/), frage: z.string().min(1), entscheidung: z.string().min(1) })
  .strict();
export type OffeneFrage = z.infer<typeof offeneFrageSchema>;

export const EMS_STATUS = ["gilt-direkt", "anpassen", "nur-tms"] as const;

const methodeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    kurz: z.string().min(1),
    untertest: untertestIdSchema,
    /** einheit = eigene Lern-Einheit mit 8 Stufen; plan/querschnitt/lernkarte = ohne Stufen */
    art: z.enum(["einheit", "plan", "querschnitt", "lernkarte"]),
    herkunft: herkunftSchema,
    quellen: z.array(quelleSchema).min(1),
    kernaussage: z.string().optional(),
    ziel: z.string().min(1),
    eckdatenTms: z.string().optional(),
    schritteHinweis: z.string().optional(),
    schritte: z.array(schrittSchema).min(1),
    einsetzen: z.array(itemSchema),
    nichtEinsetzen: z.array(itemSchema),
    typischeFehler: z.array(itemSchema),
    uebung: z
      .object({
        menge: z.array(itemSchema),
        reihenfolge: z.array(itemSchema),
        steigerung: z.array(itemSchema),
      })
      .strict(),
    werkzeuge: z.array(itemSchema).optional(),
    weitereTipps: z.array(itemSchema),
    beispiele: z.array(itemSchema),
    hinweis: z.string().optional(),
    ems: z
      .object({
        status: z.enum(EMS_STATUS),
        zeitbudget: z.string().optional(),
        uebertragenAuf: z.string().optional(),
        anpassungen: z.array(itemSchema),
        nurTms: z.array(itemSchema),
      })
      .strict(),
    varianten: z.array(z.string().regex(/^W\d+$/)),
    unklar: z.array(z.string().regex(/^F\d+$/)),
    ergaenzungen: z.array(itemSchema),
    verwandt: z.array(z.string()),
  })
  .strict();
export type Methode = z.infer<typeof methodeSchema>;

export const methodenDateiSchema = z
  .object({
    version: z.number().int(),
    stand: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hinweis: z.string(),
    herkunftLegende: z.record(herkunftSchema, z.string()),
    entscheidungen: z.array(entscheidungSchema),
    offeneFragen: z.array(offeneFrageSchema),
    methoden: z.array(methodeSchema).min(1),
  })
  .strict();
export type MethodenDatei = z.infer<typeof methodenDateiSchema>;

export function itemText(item: Item): string {
  return typeof item === "string" ? item : item.text;
}

export function itemHerkunft(item: Item, standard: Herkunft): Herkunft {
  return typeof item === "string" ? standard : item.herkunft;
}
