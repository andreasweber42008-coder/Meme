import {
  emsDatum,
  formatTag,
  plusTage,
  tageZwischen,
  testanmeldungBis,
  voranmeldungBis,
  wochentag,
  zwischen,
  type Tag,
} from "@/lib/datum";
import type { AufgabenGruppe, Einstellungen, Fortschritt, Termin } from "@/daten/modelle";
import { EINHEITEN, lektionsMinuten, type Einheit } from "@/lernpfad/einheiten";

/* ------------------------------------------------------------------ Typen */

export type Phase =
  | "lernen"
  | "festigen"
  | "automatisieren"
  | "zeitdruck"
  | "simulationen"
  | "generalprobe"
  | "letzte-woche"
  | "vortag"
  | "testtag"
  | "nach-dem-test";

export const PHASEN_TEXT: Record<Phase, string> = {
  lernen: "Methoden lernen",
  festigen: "Festigen",
  automatisieren: "Automatisieren",
  zeitdruck: "Unter Zeitdruck",
  simulationen: "Simulationen",
  generalprobe: "Generalprobe",
  "letzte-woche": "Letzte Woche: halbes Volumen",
  vortag: "Vortag: frei",
  testtag: "Testtag",
  "nach-dem-test": "Nach dem Test",
};

export type PlanArt =
  | "lektion"
  | "wiederholung"
  | "serie"
  | "konz"
  | "simulation"
  | "generalprobe"
  | "fehler-generalprobe"
  | "fehlerheft"
  | "frist"
  | "termin"
  | "schlaf"
  | "abruf"
  | "fokus";

export interface PlanAufgabe {
  id: string;
  art: PlanArt;
  titel: string;
  beschreibung?: string;
  minuten: number;
  gruppe?: AufgabenGruppe;
  methodeId?: string;
  stufe?: number;
  setId?: string;
  konzRegel?: string;
  simArt?: "voll" | "teil-a" | "teil-b" | "mini";
  link: string;
  fest?: boolean;
}

export interface PlanTag {
  tag: Tag;
  phase: Phase;
  budget: number;
  aufgaben: PlanAufgabe[];
  hinweise: string[];
  frei: boolean;
}

export interface SetInfo {
  id: string;
  gruppe: AufgabenGruppe | "simulation";
  titel: string;
  zeitMinuten: number;
  quelle: "ncwiki" | "offiziell" | "eigen";
  jahr?: number;
}

export interface PlanStand {
  einstellungen: Einstellungen;
  heute: Tag;
  fortschritt: Record<string, Fortschritt | undefined>;
  /** 0 (stark) … 1 (schwach) pro Gruppe */
  schwaeche: Partial<Record<AufgabenGruppe, number>>;
  /** bereits bearbeitete Konz-Regeln mit Datum */
  konzVerlauf: Array<{ tag: Tag; regel: string }>;
  konzRegeln: string[];
  fehlerFaellig: number;
  sets: SetInfo[];
  erledigteSets: string[];
  simulationen: Array<{ tag: Tag; art: string }>;
  termine: Array<Termin & { id: string }>;
}

/* ------------------------------------------------------------------ Grundlagen */

export function testdatum(e: Einstellungen): Tag {
  return e.testdatum ?? emsDatum(e.maturajahr);
}

export function phaseFuer(tag: Tag, stand: PlanStand): Phase {
  const d = tageZwischen(tag, testdatum(stand.einstellungen));
  if (d < 0) return "nach-dem-test";
  if (d === 0) return "testtag";
  if (d === 1) return "vortag";
  if (d <= 7) return "letzte-woche";
  if (d <= 14) return "generalprobe";
  if (d <= 42) return "simulationen";
  if (d <= 60) return "zeitdruck";
  const stufen = EINHEITEN.map((e) => stand.fortschritt[e.methodeId]?.stufe ?? 1);
  const mittel = stufen.reduce((a, b) => a + b, 0) / stufen.length;
  if (mittel < 3.5) return "lernen";
  if (mittel < 6) return "festigen";
  return "automatisieren";
}

interface Tagesart {
  faktor: number;
  grund?: string;
  pruefungstag?: boolean;
}

/** Matura-Modus, Prüfungswochen, Ferien und Intensivphase. */
export function tagesart(tag: Tag, e: Einstellungen): Tagesart {
  const pruefung = e.maturapruefungen.find((p) => p.datum === tag);
  if (pruefung) return { faktor: 0, grund: `Maturaprüfung ${pruefung.fach} – viel Erfolg!`, pruefungstag: true };
  const inPruefungswoche = e.zeitraeume.some((z) => z.art === "pruefungswoche" && zwischen(tag, z.von, z.bis));
  const nahePruefung = e.maturapruefungen.some((p) => Math.abs(tageZwischen(tag, p.datum)) <= 2);
  if (inPruefungswoche || nahePruefung) return { faktor: 0.35, grund: "Prüfungszeit: nur kurze Einheiten" };
  const letztePruefung = [...e.maturapruefungen.map((p) => p.datum), ...e.zeitraeume.filter((z) => z.art === "pruefungswoche").map((z) => z.bis)]
    .sort()
    .at(-1);
  const ferien = e.zeitraeume.some((z) => z.art === "ferien" && zwischen(tag, z.von, z.bis));
  if (letztePruefung && tag > letztePruefung) return { faktor: ferien ? 1.6 : 1.3, grund: "Intensivphase nach der Matura" };
  // «zieht das Training nach vorne»: Die 3 Wochen vor der ersten Prüfung etwas mehr
  const erste = [...e.maturapruefungen.map((p) => p.datum), ...e.zeitraeume.filter((z) => z.art === "pruefungswoche").map((z) => z.von)].sort()[0];
  if (erste && tageZwischen(tag, erste) > 2 && tageZwischen(tag, erste) <= 21) return { faktor: ferien ? 1.5 : 1.15, grund: "Vor der Matura: Training vorziehen" };
  if (ferien) return { faktor: 1.5, grund: "Ferien: mehr Zeit" };
  return { faktor: 1 };
}

export function budgetFuer(tag: Tag, stand: PlanStand): number {
  const e = stand.einstellungen;
  const basis = e.minutenProTag[wochentag(tag) - 1] ?? 0;
  const phase = phaseFuer(tag, stand);
  if (phase === "vortag" || phase === "testtag" || phase === "nach-dem-test") return 0;
  let b = basis * tagesart(tag, e).faktor;
  if (phase === "letzte-woche") b *= 0.5;
  return Math.round(b);
}

/* ------------------------------------------------------------------ Feste Termine */

export interface FesterTermin {
  tag: Tag;
  aufgabe: PlanAufgabe;
}

function simTag(tag: Tag, e: Einstellungen) {
  return wochentag(tag) === e.wochenrhythmus.simulationstag;
}

/** Simulationen, Generalproben, Fristen und externe Termine – unabhängig vom Lernstand. */
export function festeTermine(stand: PlanStand, von: Tag, bis: Tag): FesterTermin[] {
  const e = stand.einstellungen;
  const t = testdatum(e);
  const jahr = Number(t.slice(0, 4));
  const out: FesterTermin[] = [];
  const add = (tag: Tag, a: Omit<PlanAufgabe, "id"> & { id?: string }) => {
    if (tag >= von && tag <= bis) out.push({ tag, aufgabe: { id: a.id ?? `${tag}:${a.art}`, ...a, fest: true } });
  };

  // Fristen mit Erinnerungen
  const fristen: Array<[Tag, string, string]> = [
    [voranmeldungBis(jahr), "Voranmeldung bei swissuniversities", "Frist: Voranmeldung für das Medizinstudium (swissuniversities)."],
    [testanmeldungBis(jahr), "Testanmeldung inkl. 300 CHF", "Frist: Anmeldung zum EMS und Testort wählen, Gebühr 300 CHF bezahlen."],
  ];
  for (const [frist, titel, text] of fristen) {
    for (const vorher of [14, 7, 1, 0]) {
      const tag = plusTage(frist, -vorher);
      add(tag, {
        id: `${tag}:frist:${frist}`,
        art: "frist",
        titel: vorher === 0 ? `Heute: ${titel}` : `${titel} in ${vorher} ${vorher === 1 ? "Tag" : "Tagen"}`,
        beschreibung: `${text} Bis ${formatTag(frist)}.`,
        minuten: 0,
        link: "/offiziell",
      });
    }
  }

  // Externe Termine (NCWiki-Simulation, Probelauf an der Kanti …)
  for (const termin of stand.termine) {
    add(termin.datum, {
      id: `${termin.datum}:termin:${termin.id}`,
      art: "termin",
      titel: termin.titel,
      beschreibung: termin.zeit ? `${termin.zeit} · ${termin.notiz ?? ""}`.trim() : termin.notiz,
      minuten: termin.art === "ncwiki-simulation" || termin.art === "probelauf" ? 240 : 0,
      link: "/woche",
    });
  }

  // Simulationen am Simulationstag
  let tag = von;
  let zaehler = 0;
  while (tag <= bis) {
    const d = tageZwischen(tag, t);
    if (simTag(tag, e) && d > 0 && !stand.termine.some((x) => x.datum === tag) && !e.maturapruefungen.some((p) => p.datum === tag)) {
      const woche = Math.floor(tageZwischen("2020-01-04", tag) / 7);
      if (d >= 8 && d <= 14) {
        add(tag, {
          art: "generalprobe",
          titel: "Testtag-Generalprobe",
          beschreibung: "Volle Simulation zur echten Uhrzeit, ohne Mittagspause. Anreise und Material wie am Testtag.",
          minuten: 235 + e.heftwechselMinuten,
          simArt: "voll",
          link: "/generalprobe",
        });
      } else if (d >= 4 && d <= 7) {
        add(tag, {
          art: "fehler-generalprobe",
          titel: "Generalprobe mit deinen schweren Aufgaben",
          beschreibung: "Milan: markierte schwere und falsche Aufgaben eine Woche vor dem Test – nicht kurz davor. Danach nur noch leicht.",
          minuten: 60,
          link: "/fehlerheft?generalprobe=1",
        });
      } else if (d >= 15 && d <= 42) {
        const voll = woche % 2 === 0;
        add(tag, {
          art: "simulation",
          titel: voll ? "Volle Simulation" : woche % 4 === 1 ? "Halbe Simulation: Teil A" : "Halbe Simulation: Teil B",
          beschreibung: voll ? "Alle 9 Gruppen mit exakten Zeiten. Vorher 1 Minute Fokus." : "Exakte Zeiten, kein Zurückblättern, separater Antwortbogen.",
          minuten: voll ? 235 + e.heftwechselMinuten : woche % 4 === 1 ? 126 : 119,
          simArt: voll ? "voll" : woche % 4 === 1 ? "teil-a" : "teil-b",
          link: `/simulation?art=${voll ? "voll" : woche % 4 === 1 ? "teil-a" : "teil-b"}`,
        });
      } else if (d >= 43 && d <= 60) {
        const a = woche % 2 === 0;
        add(tag, {
          art: "simulation",
          titel: a ? "Halbe Simulation: Teil A" : "Halbe Simulation: Teil B",
          beschreibung: "Simulations-Samstag (Milan): exakte Zeiten, Teile im Wochenwechsel.",
          minuten: a ? 126 : 119,
          simArt: a ? "teil-a" : "teil-b",
          link: `/simulation?art=${a ? "teil-a" : "teil-b"}`,
        });
      } else if (d > 60) {
        add(tag, {
          art: "simulation",
          titel: "Mini-Simulation",
          beschreibung: "Simulations-Samstag (Milan): einige Gruppen am Stück mit Originalzeit – so viel, wie dein Samstag hergibt.",
          minuten: Math.max(30, Math.min(budgetFuer(tag, stand), 110)),
          simArt: "mini",
          link: "/simulation?art=mini",
        });
      }
      zaehler++;
    }
    // Schlaf-Erinnerung in der letzten Woche
    if (d >= 1 && d <= 7) {
      add(tag, {
        id: `${tag}:schlaf`,
        art: "schlaf",
        titel: d === 1 ? "Heute früh ins Bett" : "Genug schlafen",
        beschreibung: d === 1 ? "Morgen ist Testtag. Tasche packen, Anreise prüfen, früh schlafen." : "Ausgeschlafen bist du am Testtag schneller und genauer.",
        minuten: 0,
        link: "/generalprobe",
      });
    }
    tag = plusTage(tag, 1);
  }
  void zaehler;
  return out;
}

/* ------------------------------------------------------------------ Tagesplan */

function aktuelleStufe(e: Einheit, stand: PlanStand): number {
  return stand.fortschritt[e.methodeId]?.stufe ?? 1;
}

/** Die Einheit, an der in einer Gruppe gerade gearbeitet wird (z. B. erst Grundverfahren, dann Kreuzblick). */
export function aktiveEinheit(gruppe: AufgabenGruppe, stand: PlanStand): Einheit {
  const liste = EINHEITEN.filter((e) => e.gruppe === gruppe).sort((a, b) => a.rang - b.rang);
  // Muster: Kreuzblick parallel, sobald das Grundverfahren Stufe 4 erreicht
  for (const e of liste) if (!stand.fortschritt[e.methodeId]?.beherrschtAm && aktuelleStufe(e, stand) < 8) {
    if (e.rang > 1) return e;
    const naechste = liste[liste.indexOf(e) + 1];
    if (naechste && aktuelleStufe(e, stand) >= 4 && aktuelleStufe(naechste, stand) < aktuelleStufe(e, stand)) return naechste;
    return e;
  }
  return liste[liste.length - 1];
}

function lektion(tag: Tag, e: Einheit, stand: PlanStand, phase: Phase, minutenMax: number, zusatz = ""): PlanAufgabe {
  const fp = stand.fortschritt[e.methodeId];
  const stufe = fp?.stufe ?? 1;
  const beherrscht = !!fp?.beherrschtAm;
  const zeitdruck = phase === "zeitdruck" || phase === "simulationen" || phase === "generalprobe" || phase === "letzte-woche";
  if (beherrscht || stufe >= 8) {
    // Training: Wiederholung bzw. unter Zeitdruck Ernstfall
    return {
      id: `${tag}:wiederholung:${e.methodeId}${zusatz}`,
      art: "wiederholung",
      titel: `${e.methode.name}: ${zeitdruck ? "Ernstfall-Training" : "Wiederholen"}`,
      beschreibung: zeitdruck ? "Originalzeit, keine Hilfen." : "Methode frisch halten (Spaced Repetition).",
      minuten: Math.min(minutenMax, lektionsMinuten(e, 8)),
      gruppe: e.gruppe,
      methodeId: e.methodeId,
      stufe: 8,
      link: `/lektion/${e.methodeId}/8`,
    };
  }
  const zielStufe = zeitdruck ? Math.max(stufe, Math.min(7, stufe)) : stufe;
  return {
    id: `${tag}:lektion:${e.methodeId}${zusatz}`,
    art: "lektion",
    titel: `${e.methode.name}: Stufe ${zielStufe}`,
    beschreibung: undefined,
    minuten: Math.min(minutenMax, lektionsMinuten(e, zielStufe)),
    gruppe: e.gruppe,
    methodeId: e.methodeId,
    stufe: zielStufe,
    link: `/lektion/${e.methodeId}/${zielStufe}`,
  };
}

const GROSSE_PAARE: AufgabenGruppe[][] = [
  ["quanti", "med-nat"],
  ["textverstaendnis", "diagramme-tabellen"],
];
const KLEINE: AufgabenGruppe[] = ["muster-zuordnen", "objekte-im-raum", "figuren-lernen", "fakten-lernen"];

function schwaechste(stand: PlanStand, auswahl: AufgabenGruppe[]): AufgabenGruppe {
  return [...auswahl].sort((a, b) => (stand.schwaeche[b] ?? 0.5) - (stand.schwaeche[a] ?? 0.5))[0];
}

/** Nächste Konz-Regel: die am längsten nicht mehr geübte (zu häufig dieselbe Regel schadet). */
export function naechsteKonzRegel(stand: PlanStand, vor: Tag): string {
  const zuletzt = new Map<string, Tag>();
  for (const v of stand.konzVerlauf) if (v.tag < vor && (zuletzt.get(v.regel) ?? "") < v.tag) zuletzt.set(v.regel, v.tag);
  return [...stand.konzRegeln].sort((a, b) => (zuletzt.get(a) ?? "0000").localeCompare(zuletzt.get(b) ?? "0000") || stand.konzRegeln.indexOf(a) - stand.konzRegeln.indexOf(b))[0];
}

/** Konz höchstens 1–2× pro Woche: Di (und ab 2 Monate vorher zusätzlich Do). */
export function istKonzTag(tag: Tag, stand: PlanStand): boolean {
  const d = tageZwischen(tag, testdatum(stand.einstellungen));
  const w = wochentag(tag);
  if (d <= 3) return false;
  if (w === 2) return true;
  return w === 4 && d <= 60;
}

function naechsteSerie(stand: PlanStand, gruppe: AufgabenGruppe, schon: Set<string>): SetInfo | undefined {
  return stand.sets
    .filter((s) => s.gruppe === gruppe && !stand.erledigteSets.includes(s.id) && !schon.has(s.id))
    .sort((a, b) => (b.jahr ?? 0) - (a.jahr ?? 0) || a.titel.localeCompare(b.titel))[0];
}

export function planeTag(tag: Tag, stand: PlanStand, feste?: FesterTermin[]): PlanTag {
  const e = stand.einstellungen;
  const phase = phaseFuer(tag, stand);
  const budget = budgetFuer(tag, stand);
  const art = tagesart(tag, e);
  const hinweise: string[] = [];
  const d = tageZwischen(tag, testdatum(e));
  const festHeute = (feste ?? festeTermine(stand, tag, tag)).filter((f) => f.tag === tag).map((f) => f.aufgabe);
  const aufgaben: PlanAufgabe[] = [...festHeute];

  if (phase === "testtag") return { tag, phase, budget: 0, aufgaben: [], hinweise: ["Heute ist EMS! Du hast trainiert – vertrau deinen Methoden."], frei: true };
  if (phase === "vortag") return { tag, phase, budget: 0, aufgaben, hinweise: ["Vortag frei: nichts mehr lernen. Tasche packen, Anreise prüfen, früh schlafen."], frei: true };
  if (phase === "nach-dem-test") return { tag, phase, budget: 0, aufgaben: [], hinweise: ["Geschafft! Die Resultate kommen meist Anfang August."], frei: true };
  if (art.grund) hinweise.push(art.grund);

  const freierTag = wochentag(tag) === e.wochenrhythmus.freierTag;
  const hatTermin = festHeute.some((a) => a.art === "termin" && a.minuten > 0);
  if (art.pruefungstag || hatTermin) return { tag, phase, budget, aufgaben, hinweise, frei: true };
  if (freierTag && !festHeute.some((a) => a.minuten > 0)) {
    hinweise.push("Freier Tag – ohne schlechtes Gewissen. Erholung bringt Konzentration.");
    return { tag, phase, budget: 0, aufgaben, hinweise, frei: true };
  }
  if (budget <= 0 && !festHeute.some((a) => a.minuten > 0)) return { tag, phase, budget, aufgaben, hinweise, frei: true };

  let rest = budget - festHeute.reduce((s, a) => s + a.minuten, 0);
  const grosseSim = festHeute.some((a) => (a.art === "simulation" && a.simArt !== "mini") || a.art === "generalprobe");
  if (grosseSim) {
    aufgaben.unshift({ id: `${tag}:fokus`, art: "fokus", titel: "1 Minute Fokus", beschreibung: "Atmen und lockern vor der Simulation.", minuten: 1, link: "/fokus" });
    return { tag, phase, budget, aufgaben, hinweise, frei: false };
  }

  const keinGedaechtnis = d <= 3;
  const kleineHeute = KLEINE.filter((g) => !(keinGedaechtnis && (g === "figuren-lernen" || g === "fakten-lernen")));
  const schwaechentag = wochentag(tag) === e.wochenrhythmus.schwaechentag;
  const geplant = new Set<string>();

  // 1) Fehlerheft-Wiedervorlagen
  if (stand.fehlerFaellig > 0 && rest >= 8) {
    const m = Math.min(10, Math.max(4, stand.fehlerFaellig * 2));
    aufgaben.push({ id: `${tag}:fehlerheft`, art: "fehlerheft", titel: `Fehlerheft: ${stand.fehlerFaellig} fällig`, beschreibung: "Wiedervorlage deiner Fehler.", minuten: m, link: "/fehlerheft" });
    rest -= m;
  }

  // 2) Kleine Untertests täglich (Milan) – Gedächtnistests: Einprägen zuerst, Abruf am Schluss
  const kleinAnteil = schwaechentag ? 0.7 : 0.6;
  const proKlein = Math.max(4, Math.floor((rest * kleinAnteil) / Math.max(1, kleineHeute.length)));
  const reihenfolge = [...kleineHeute].sort((a, b) => (a === "figuren-lernen" || a === "fakten-lernen" ? -1 : 0) - (b === "figuren-lernen" || b === "fakten-lernen" ? -1 : 0));
  for (const g of reihenfolge) {
    if (rest < 4) break;
    const einheit = aktiveEinheit(g, stand);
    const fp = stand.fortschritt[einheit.methodeId];
    const serie = (fp?.stufe ?? 1) >= 6 && (phase === "automatisieren" || phase === "zeitdruck" || phase === "simulationen") ? naechsteSerie(stand, g, geplant) : undefined;
    if (serie && serie.zeitMinuten <= rest && wochentag(tag) % 2 === 1) {
      geplant.add(serie.id);
      aufgaben.push({ id: `${tag}:serie:${serie.id}`, art: "serie", titel: serie.titel, beschreibung: "Originalzeit, Antwortbogen, Auswertung.", minuten: serie.zeitMinuten + 3, gruppe: g, setId: serie.id, link: `/material/${serie.id}` });
      rest -= serie.zeitMinuten + 3;
      continue;
    }
    const a = lektion(tag, einheit, stand, phase, Math.max(proKlein, 4));
    aufgaben.push(a);
    rest -= a.minuten;
  }

  // 3) Konz 1–2× pro Woche mit neuer Regel – nach anderen Untertests
  const konzHeute = istKonzTag(tag, stand) && rest >= 4;

  // 4) Grosse Untertests paarweise im 2-Tages-Rhythmus; am Schwächen-Tag die schwächste Gruppe
  const tagIndex = Math.floor(tageZwischen("2024-01-01", tag) / 2);
  let grosse = GROSSE_PAARE[tagIndex % 2];
  if (schwaechentag) {
    const schwach = schwaechste(stand, [...KLEINE, ...GROSSE_PAARE.flat()]);
    grosse = [schwach];
    hinweise.push("Schwächen-Tag: kleine Untertests + deine aktuelle Schwäche.");
  }
  const konzReserve = konzHeute ? 6 : 0;
  for (const g of grosse) {
    const verfuegbar = rest - konzReserve;
    if (verfuegbar < 5) break;
    const einheit = aktiveEinheit(g, stand);
    const fp = stand.fortschritt[einheit.methodeId];
    const serie = (fp?.stufe ?? 1) >= 6 && phase !== "lernen" && phase !== "festigen" ? naechsteSerie(stand, g, geplant) : undefined;
    if (serie && serie.zeitMinuten + 5 <= verfuegbar) {
      geplant.add(serie.id);
      aufgaben.push({ id: `${tag}:serie:${serie.id}`, art: "serie", titel: serie.titel, beschreibung: "Originalzeit, danach Nachbereitung am selben Tag.", minuten: serie.zeitMinuten + 5, gruppe: g, setId: serie.id, link: `/material/${serie.id}` });
      rest -= serie.zeitMinuten + 5;
      continue;
    }
    const a = lektion(tag, einheit, stand, phase, Math.floor(verfuegbar / Math.max(1, grosse.length - grosse.indexOf(g))));
    aufgaben.push(a);
    rest -= a.minuten;
  }

  if (konzHeute) {
    const regel = naechsteKonzRegel(stand, tag);
    const konz = EINHEITEN.find((x) => x.gruppe === "konz")!;
    const stufe = stand.fortschritt[konz.methodeId]?.stufe ?? 1;
    const voll = stufe >= 7 || d <= 60;
    aufgaben.push({
      id: `${tag}:konz`,
      art: "konz",
      titel: voll ? "Konz: volles Blatt (8 Min.) mit neuer Regel" : `Konz: Stufe ${stufe} mit neuer Regel`,
      beschreibung: "Nach den anderen Untertests – müde wie am Testtag.",
      minuten: voll ? 10 : lektionsMinuten(konz, stufe),
      gruppe: "konz",
      methodeId: konz.methodeId,
      stufe: voll ? 8 : stufe,
      konzRegel: regel,
      link: `/lektion/${konz.methodeId}/${voll ? 8 : stufe}?regel=${encodeURIComponent(regel)}`,
    });
    rest -= voll ? 10 : lektionsMinuten(konz, stufe);
  }

  // Verpasste Simulation: nicht anhäufen, nur anbieten
  for (let i = 1; i <= 6; i++) {
    const vorher = plusTage(tag, -i);
    if (vorher < stand.heute && wochentag(vorher) === e.wochenrhythmus.simulationstag) {
      const war = festeTermine(stand, vorher, vorher).find((f) => f.aufgabe.art === "simulation" || f.aufgabe.art === "generalprobe");
      if (war && !stand.simulationen.some((s) => s.tag >= vorher)) hinweise.push(`Die ${war.aufgabe.titel} vom ${formatTag(vorher, "mittel")} ist offen – hol sie nach, wenn du Zeit hast. Der Plan häuft nichts an.`);
      break;
    }
  }
  if (phase === "letzte-woche") hinweise.push("Letzte Woche: halbes Volumen, nur leichte Wiederholung.");
  if (keinGedaechtnis && d > 1) hinweise.push("Figuren und Fakten ruhen jetzt, damit sich nichts mit dem Test vermischt.");
  return { tag, phase, budget, aufgaben, hinweise, frei: false };
}

export function planeTage(von: Tag, anzahl: number, stand: PlanStand): PlanTag[] {
  const bis = plusTage(von, anzahl - 1);
  const feste = festeTermine(stand, von, bis);
  return Array.from({ length: anzahl }, (_, i) => planeTag(plusTage(von, i), stand, feste));
}

/** «Heute 25 min: Muster, Objekte …» */
export function kurzfassung(p: PlanTag): string {
  const min = p.aufgaben.reduce((s, a) => s + a.minuten, 0);
  if (p.frei || min === 0) return p.hinweise[0] ?? "Heute frei.";
  const namen = p.aufgaben.filter((a) => a.minuten > 0).map((a) => a.titel.split(":")[0]);
  return `Heute ${min} min: ${namen.join(", ")}`;
}
