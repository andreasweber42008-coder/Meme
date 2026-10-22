/**
 * Datumslogik in der Zeitzone Europe/Zurich.
 * Kalendertage sind Strings «YYYY-MM-DD»; gerechnet wird in UTC, damit Sommerzeit nichts verschiebt.
 */
export type Tag = string;
export const ZEITZONE = "Europe/Zurich";

const TAG_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function istTag(text: unknown): text is Tag {
  return typeof text === "string" && TAG_REGEX.test(text) && !Number.isNaN(tagZuDate(text).getTime());
}

/** Heutiger Kalendertag in Zürich */
export function heute(jetzt: Date = new Date()): Tag {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZEITZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(jetzt);
}

/** Aktuelle Uhrzeit in Zürich als «HH:MM» */
export function uhrzeit(jetzt: Date = new Date(), mitSekunden = false): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: ZEITZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...(mitSekunden ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  }).format(jetzt);
}

export function tagZuDate(tag: Tag): Date {
  const [j, m, d] = tag.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, d));
}

export function dateZuTag(datum: Date): Tag {
  return datum.toISOString().slice(0, 10);
}

export function plusTage(tag: Tag, tage: number): Tag {
  const d = tagZuDate(tag);
  d.setUTCDate(d.getUTCDate() + tage);
  return dateZuTag(d);
}

/** Anzahl Tage von a nach b (b − a) */
export function tageZwischen(a: Tag, b: Tag): number {
  return Math.round((tagZuDate(b).getTime() - tagZuDate(a).getTime()) / 86_400_000);
}

/** Wochentag 1 = Montag … 7 = Sonntag */
export function wochentag(tag: Tag): number {
  const w = tagZuDate(tag).getUTCDay();
  return w === 0 ? 7 : w;
}

export function montagDerWoche(tag: Tag): Tag {
  return plusTage(tag, 1 - wochentag(tag));
}

export function isoWoche(tag: Tag): { jahr: number; woche: number } {
  const donnerstag = plusTage(tag, 4 - wochentag(tag));
  const jahr = Number(donnerstag.slice(0, 4));
  const erster = `${jahr}-01-01`;
  return { jahr, woche: Math.floor(tageZwischen(erster, donnerstag) / 7) + 1 };
}

/** Montag der ISO-Kalenderwoche 1: die Woche mit dem 4. Januar */
export function montagKw1(jahr: number): Tag {
  return montagDerWoche(`${jahr}-01-04`);
}

export function freitagDerKw(jahr: number, kw: number): Tag {
  return plusTage(montagKw1(jahr), (kw - 1) * 7 + 4);
}

/** EMS: Freitag der ISO-KW 27 */
export function emsDatum(jahr: number): Tag {
  return freitagDerKw(jahr, 27);
}

/** Testanmeldung inkl. 300 CHF bis 45 Tage vor dem Test */
export function testanmeldungBis(jahr: number): Tag {
  return plusTage(emsDatum(jahr), -45);
}

/** Voranmeldung bei swissuniversities bis 15. Februar */
export function voranmeldungBis(jahr: number): Tag {
  return `${jahr}-02-15`;
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
export const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function wochentagName(tag: Tag, kurz = false): string {
  return (kurz ? WOCHENTAGE_KURZ : WOCHENTAGE)[wochentag(tag) - 1];
}

/** «Fr, 9. Juli 2027» bzw. «9.7.2027» */
export function formatTag(tag: Tag, art: "lang" | "kurz" | "mittel" = "lang"): string {
  const [j, m, d] = tag.split("-").map(Number);
  if (art === "kurz") return `${d}.${m}.${j}`;
  if (art === "mittel") return `${wochentagName(tag, true)}, ${d}.${m}.`;
  return `${wochentagName(tag, true)}, ${d}. ${MONATE[m - 1]} ${j}`;
}

export function zwischen(tag: Tag, von: Tag, bis: Tag): boolean {
  return tag >= von && tag <= bis;
}

export function tageListe(von: Tag, anzahl: number): Tag[] {
  return Array.from({ length: anzahl }, (_, i) => plusTage(von, i));
}

/** Minuten seit Mitternacht aus «HH:MM» */
export function zeitZuMinuten(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return h * 60 + m;
}

export function minutenZuZeit(minuten: number): string {
  const m = ((minuten % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
