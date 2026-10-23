import type { Datenspeicher } from "@/daten/store";
import type { Fehler, Fehlerursache, Fortschritt, Gamification, StufenErgebnis, TagStand, Versuch } from "@/daten/modelle";
import { GAMIFICATION_ID, einstellungenLesen } from "@/daten/hooks";
import { heute, plusTage, type Tag } from "@/lib/datum";
import { naechsteWiederholung } from "@/lib/srs";
import { neueId } from "@/lib/zufall";
import { ABZEICHEN, XP, methodeGemeistertAbzeichen, streak, type AbzeichenDef } from "@/lib/gamification";
import { testdatum } from "@/plan/plan";
import { methodeById } from "@/content";

/** Ereignisse für Feiern und Töne in der Oberfläche */
export type Feier =
  | { art: "tagesziel" }
  | { art: "abzeichen"; abzeichen: AbzeichenDef }
  | { art: "stufe"; methodeId: string; stufe: number }
  | { art: "gemeistert"; methodeId: string };

type FeierHoerer = (f: Feier) => void;
const hoerer = new Set<FeierHoerer>();
export function feiernAbonnieren(cb: FeierHoerer): () => void {
  hoerer.add(cb);
  return () => hoerer.delete(cb);
}
function feiern(f: Feier) {
  for (const h of hoerer) h(f);
}

function gamification(store: Datenspeicher): Gamification {
  return store.hole<Gamification>("gamification", GAMIFICATION_ID) ?? { xpGesamt: 0, streakSchutz: 1, abzeichen: [] };
}

function tagesStand(store: Datenspeicher, tag: Tag): TagStand {
  return store.hole<TagStand>("tage", tag) ?? { xp: 0, minuten: 0, erledigt: [], zielErreicht: false };
}

export async function abzeichenVergeben(store: Datenspeicher, def: AbzeichenDef): Promise<void> {
  const g = gamification(store);
  if (g.abzeichen.some((a) => a.id === def.id)) return;
  await store.speichern("gamification", GAMIFICATION_ID, { ...g, abzeichen: [...g.abzeichen, { id: def.id, am: heute(), titel: def.titel }] });
  feiern({ art: "abzeichen", abzeichen: def });
}

/** Freie Tage (Wochenrhythmus) unterbrechen die Serie nicht. */
export function istFreierTag(store: Datenspeicher, tag: Tag): boolean {
  const e = einstellungenLesen(store);
  const w = ((new Date(`${tag}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  return w === e.wochenrhythmus.freierTag || e.minutenProTag[w - 1] === 0;
}

export async function xpGeben(store: Datenspeicher, xp: number, extra: { minuten?: number; erledigt?: string } = {}): Promise<void> {
  const tag = heute();
  const t = tagesStand(store, tag);
  const e = einstellungenLesen(store);
  const neu: TagStand = {
    ...t,
    xp: t.xp + xp,
    minuten: t.minuten + (extra.minuten ?? 0),
    erledigt: extra.erledigt && !t.erledigt.includes(extra.erledigt) ? [...t.erledigt, extra.erledigt] : t.erledigt,
  };
  const zielNeu = !t.zielErreicht && neu.xp >= e.tagesziel;
  if (zielNeu) neu.zielErreicht = true;
  await store.speichern("tage", tag, neu);
  const g = gamification(store);
  await store.speichern("gamification", GAMIFICATION_ID, { ...g, xpGesamt: g.xpGesamt + xp });
  if (zielNeu) feiern({ art: "tagesziel" });

  // Serien-Abzeichen und Schutzschild alle 7 Tage
  const tage = Object.fromEntries(store.alle<TagStand>("tage").map((x) => [x.id, x]));
  const s = streak(tage, tag, (x) => istFreierTag(store, x));
  if (t.xp === 0 && s > 0 && s % 7 === 0) {
    const g2 = gamification(store);
    await store.speichern("gamification", GAMIFICATION_ID, { ...g2, streakSchutz: Math.min(3, g2.streakSchutz + 1) });
  }
  if (s >= 7) await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "streak-7")!);
  if (s >= 30) await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "streak-30")!);
}

/**
 * Beim Öffnen: Wurde gestern (oder vorgestern) nichts gemacht, obwohl es kein freier Tag war,
 * schützt automatisch ein Schutzschild die Serie (falls vorhanden).
 */
export async function streakPflegen(store: Datenspeicher): Promise<void> {
  const tag = heute();
  for (let i = 1; i <= 2; i++) {
    const t = plusTage(tag, -i);
    const s = store.hole<TagStand>("tage", t);
    if ((s?.xp ?? 0) > 0 || s?.streakSchutz || istFreierTag(store, t)) continue;
    // Nur schützen, wenn davor eine Serie lief
    const davor = store.hole<TagStand>("tage", plusTage(t, -1));
    if (!davor || (davor.xp === 0 && !davor.streakSchutz)) return;
    const g = gamification(store);
    if (g.streakSchutz <= 0) return;
    await store.speichern("tage", t, { ...(s ?? { xp: 0, minuten: 0, erledigt: [], zielErreicht: false }), streakSchutz: true });
    await store.speichern("gamification", GAMIFICATION_ID, { ...g, streakSchutz: g.streakSchutz - 1 });
  }
}

export async function versuchSpeichern(store: Datenspeicher, v: Omit<Versuch, "zeit" | "tag">): Promise<void> {
  await store.speichern<Versuch>("versuche", neueId(), { ...v, zeit: Date.now(), tag: heute() });
  if (v.richtig && v.quelle !== "drill") await xpGeben(store, XP.richtig);
  const gruppen = new Set(store.alle<Versuch>("versuche").map((x) => x.gruppe));
  if (gruppen.size >= 9) await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "alle-gruppen")!);
}

export async function fehlerEintragen(
  store: Datenspeicher,
  f: Omit<Fehler, "zeit" | "tag" | "srs"> & { ursache: Fehlerursache },
): Promise<string> {
  const id = neueId();
  const tag = heute();
  const e = einstellungenLesen(store);
  await store.speichern<Fehler>("fehlerheft", id, { ...f, zeit: Date.now(), tag, srs: naechsteWiederholung(undefined, false, tag, testdatum(e)) });
  return id;
}

/** Wiedervorlage eines Fehlers beantwortet */
export async function fehlerWiederholt(store: Datenspeicher, id: string, richtig: boolean): Promise<void> {
  const f = store.hole<Fehler>("fehlerheft", id);
  if (!f) return;
  const tag = heute();
  const srs = naechsteWiederholung(f.srs, richtig, tag, testdatum(einstellungenLesen(store)));
  const erledigt = richtig && srs.fach >= 3;
  await store.speichern<Fehler>("fehlerheft", id, { ...f, srs, erledigt });
  if (richtig) await xpGeben(store, XP.fehler);
  const anzahl = store.alle<Fehler>("fehlerheft").filter((x) => x.erledigt).length;
  if (anzahl >= 10) await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "fehlerheft")!);
}

export interface StufenBewertung {
  quote: number;
  schritteQuote: number;
  bestanden: boolean;
}

export function bewerteStufe(ergebnisse: StufenErgebnis[], beherrschung: number, stufe: number): StufenBewertung {
  const n = Math.max(1, ergebnisse.length);
  const quote = ergebnisse.filter((e) => e.richtig).length / n;
  const schritteQuote = ergebnisse.filter((e) => e.schritteOk).length / n;
  const tempoOk = stufe < 7 || ergebnisse.filter((e) => e.imTempo !== false).length / n >= 0.7;
  return { quote, schritteQuote, bestanden: ergebnisse.length > 0 && quote >= beherrschung && schritteQuote >= 0.8 && tempoOk };
}

/**
 * Lektion abschliessen: Ergebnisse speichern, bei Beherrschung eine Stufe aufsteigen.
 * Stufe 2 «Vormachen» ist ohne Bewertung bestanden.
 */
export async function lektionAbschliessen(
  store: Datenspeicher,
  methodeId: string,
  stufe: number,
  ergebnisse: StufenErgebnis[],
  schrittFehler: number[],
  minuten: number,
  planId?: string,
): Promise<StufenBewertung & { aufgestiegen: boolean }> {
  const e = einstellungenLesen(store);
  const alt: Fortschritt = store.hole<Fortschritt>("fortschritt", methodeId) ?? { stufe: 1 };
  const bewertung = stufe === 2 ? { quote: 1, schritteQuote: 1, bestanden: true } : bewerteStufe(ergebnisse, e.beherrschung, stufe);
  const verlauf = { ...(alt.verlauf ?? {}) };
  verlauf[String(stufe)] = [...(verlauf[String(stufe)] ?? []), ...ergebnisse].slice(-40);
  const schritte = { ...(alt.schritte ?? {}) };
  const schrittGesamt = new Set(schrittFehler);
  for (const s of schrittGesamt) {
    const k = String(s);
    schritte[k] = { fehler: (schritte[k]?.fehler ?? 0) + schrittFehler.filter((x) => x === s).length, gesamt: (schritte[k]?.gesamt ?? 0) + ergebnisse.length };
  }
  const aufgestiegen = bewertung.bestanden && stufe === alt.stufe && stufe < 8;
  const gemeistert = bewertung.bestanden && stufe === 8 && !alt.beherrschtAm;
  const tag = heute();
  const neu: Fortschritt = {
    ...alt,
    stufe: aufgestiegen ? stufe + 1 : alt.stufe,
    verlauf,
    schritte,
    beherrschtAm: gemeistert ? new Date().toISOString() : alt.beherrschtAm,
    srs: stufe >= 6 ? naechsteWiederholung(alt.srs, bewertung.bestanden, tag, testdatum(e)) : alt.srs,
  };
  await store.speichern("fortschritt", methodeId, neu);
  await xpGeben(store, XP.lektion + (aufgestiegen ? XP.stufe : 0), { minuten, erledigt: planId });
  await abzeichenVergeben(store, ABZEICHEN.find((a) => a.id === "erste-lektion")!);
  if (aufgestiegen) feiern({ art: "stufe", methodeId, stufe: stufe + 1 });
  if (gemeistert) {
    feiern({ art: "gemeistert", methodeId });
    await abzeichenVergeben(store, methodeGemeistertAbzeichen(methodeId, methodeById(methodeId)?.name ?? methodeId));
  }
  return { ...bewertung, aufgestiegen };
}

/** Plan-Aufgabe als erledigt markieren (z. B. Fokus, Termin) */
export async function planErledigt(store: Datenspeicher, planId: string, minuten = 0, xp = 0): Promise<void> {
  await xpGeben(store, xp, { minuten, erledigt: planId });
}
