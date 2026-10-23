import type { Gamification } from "@/daten/modelle";

/** Wo ein Gegenstand an Munggi sitzt */
export type Platz = "kopf" | "augen" | "hals" | "hand" | "hintergrund";

export const PLAETZE: Array<{ id: Platz; name: string }> = [
  { id: "kopf", name: "Kopf" },
  { id: "augen", name: "Augen" },
  { id: "hals", name: "Hals" },
  { id: "hand", name: "Pfote" },
  { id: "hintergrund", name: "Hintergrund" },
];

export interface ShopArtikel {
  id: string;
  name: string;
  platz: Platz | "extra";
  preis: number;
  beschreibung: string;
}

/** Alles, was man mit XP kaufen kann. XP sammelt man mit richtigen Antworten, Lektionen und Stufen. */
export const ARTIKEL: ShopArtikel[] = [
  // Kopf
  { id: "zipfelmuetze", name: "Zipfelmütze", platz: "kopf", preis: 120, beschreibung: "Rot und warm – für frühe Lernmorgen." },
  { id: "chaeppi", name: "Chäppi", platz: "kopf", preis: 150, beschreibung: "Sportlich, Schild nach vorne." },
  { id: "sennenhut", name: "Hut mit Edelweiss", platz: "kopf", preis: 250, beschreibung: "Bergtauglich und elegant." },
  { id: "doktorhut", name: "Absolventenhut", platz: "kopf", preis: 400, beschreibung: "Für die Zeit nach dem Studium." },
  { id: "krone", name: "Krone", platz: "kopf", preis: 800, beschreibung: "Für echte Methoden-Könige." },
  // Augen
  { id: "brille", name: "Runde Brille", platz: "augen", preis: 100, beschreibung: "Sieht nach viel Gelesenem aus." },
  { id: "laborbrille", name: "Schutzbrille", platz: "augen", preis: 220, beschreibung: "Sicher im Labor." },
  { id: "sonnenbrille", name: "Sonnenbrille", platz: "augen", preis: 180, beschreibung: "Cool bleiben unter Zeitdruck." },
  // Hals
  { id: "halstuch", name: "Blaues Halstuch", platz: "hals", preis: 90, beschreibung: "Klassisch und bequem." },
  { id: "fliege", name: "Fliege", platz: "hals", preis: 120, beschreibung: "Bereit für die Maturafeier." },
  { id: "schal", name: "Schweizer Schal", platz: "hals", preis: 150, beschreibung: "Rot mit weissem Kreuz." },
  { id: "medaille", name: "Goldmedaille", platz: "hals", preis: 500, beschreibung: "Für deine erste volle Simulation." },
  // Pfote
  { id: "bleistift", name: "Bleistift", platz: "hand", preis: 60, beschreibung: "Weich, 2B – wie im Test." },
  { id: "buch", name: "Lehrbuch", platz: "hand", preis: 100, beschreibung: "Mit Lesezeichen." },
  { id: "edelweiss", name: "Edelweiss", platz: "hand", preis: 140, beschreibung: "Selten und zäh – wie du." },
  { id: "reagenzglas", name: "Reagenzglas", platz: "hand", preis: 160, beschreibung: "Blubbert leise." },
  // Hintergrund
  { id: "alpen", name: "Alpen", platz: "hintergrund", preis: 300, beschreibung: "Munggis Zuhause." },
  { id: "bibliothek", name: "Bibliothek", platz: "hintergrund", preis: 250, beschreibung: "Ruhe zum Lernen." },
  { id: "labor", name: "Labor", platz: "hintergrund", preis: 300, beschreibung: "Mit Mikroskop." },
  { id: "nacht", name: "Sternennacht", platz: "hintergrund", preis: 350, beschreibung: "Früh schlafen nicht vergessen." },
  // Extras
  { id: "schutzschild", name: "Serien-Schutz", platz: "extra", preis: 200, beschreibung: "Rettet deine Serie an einem verpassten Tag (höchstens 3)." },
];

export const MAX_SCHUTZ = 3;

export function artikel(id: string): ShopArtikel | undefined {
  return ARTIKEL.find((a) => a.id === id);
}

/** XP-Guthaben = gesammelte XP minus ausgegebene */
export function guthaben(g: Gamification): number {
  return Math.max(0, g.xpGesamt - (g.ausgegeben ?? 0));
}

export type KaufFehler = "unbekannt" | "zu-teuer" | "schon-da" | "voll";

/** Prüft und bucht einen Kauf (rein, ohne Speicher) */
export function kaufen(g: Gamification, id: string): { ok: true; neu: Gamification } | { ok: false; grund: KaufFehler } {
  const a = artikel(id);
  if (!a) return { ok: false, grund: "unbekannt" };
  if (guthaben(g) < a.preis) return { ok: false, grund: "zu-teuer" };
  if (a.platz === "extra") {
    if (g.streakSchutz >= MAX_SCHUTZ) return { ok: false, grund: "voll" };
    return { ok: true, neu: { ...g, ausgegeben: (g.ausgegeben ?? 0) + a.preis, streakSchutz: g.streakSchutz + 1 } };
  }
  if (g.inventar?.includes(id)) return { ok: false, grund: "schon-da" };
  return {
    ok: true,
    neu: { ...g, ausgegeben: (g.ausgegeben ?? 0) + a.preis, inventar: [...(g.inventar ?? []), id], angezogen: { ...(g.angezogen ?? {}), [a.platz]: id } },
  };
}

/** An- oder ausziehen (nur eigene Gegenstände) */
export function anziehen(g: Gamification, platz: Platz, id: string | null): Gamification {
  const angezogen = { ...(g.angezogen ?? {}) };
  if (id === null || angezogen[platz] === id) delete angezogen[platz];
  else if (g.inventar?.includes(id) && artikel(id)?.platz === platz) angezogen[platz] = id;
  return { ...g, angezogen };
}
