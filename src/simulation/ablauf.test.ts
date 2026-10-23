import { describe, expect, it } from "vitest";
import { GRUPPEN } from "@/daten/modelle";
import { aufgabeAus } from "@/aufgaben/register";
import {
  ablaufErstellen,
  antwortSchluessel,
  fruehereAntwortGruppen,
  gesamtMinuten,
  gruppenIm,
  inhaltErzeugen,
  konzAusZahlen,
  loesungenFuer,
  miniArt,
  nachtraeglichRatenErlaubt,
  restSekunden,
  schwierigkeitFuer,
  simulationWerten,
  zielzeichen,
} from "./ablauf";

const basis = { startZeit: "08:30", heftwechselMinuten: 10 };

describe("Ablauf", () => {
  it("volle Simulation: 9 Gruppen in offizieller Reihenfolge, 3 h 55 min netto + Heftwechsel", () => {
    const a = ablaufErstellen({ ...basis, art: "voll" });
    expect(a.map((b) => b.id)).toEqual([
      "muster-zuordnen",
      "med-nat",
      "objekte-im-raum",
      "quanti",
      "figuren-lernen:einpraegen",
      "fakten-lernen:einpraegen",
      "heftwechsel",
      "textverstaendnis",
      "figuren-lernen:abruf",
      "fakten-lernen:abruf",
      "diagramme-tabellen",
      "konz",
    ]);
    expect(a.map((b) => b.minuten)).toEqual([16, 45, 10, 45, 4, 6, 10, 45, 5, 6, 45, 8]);
    expect(gesamtMinuten(a.filter((b) => b.phase !== "heftwechsel"))).toBe(235);
    expect(gesamtMinuten(a)).toBe(245);
    expect(gruppenIm(a).sort()).toEqual([...GRUPPEN].sort());
    expect(a.filter((b) => b.teil === "A" && b.phase !== "heftwechsel").reduce((s, b) => s + b.minuten, 0)).toBe(126);
    expect(a.filter((b) => b.teil === "B").reduce((s, b) => s + b.minuten, 0)).toBe(109);
  });

  it("Uhrzeiten werden ab dem Start fortgeschrieben", () => {
    const a = ablaufErstellen({ ...basis, art: "generalprobe" });
    expect(a[0].start).toBe("08:30");
    expect(a[0].ende).toBe("08:46");
    expect(a.find((b) => b.id === "heftwechsel")!.start).toBe("10:36");
    expect(a.find((b) => b.id === "textverstaendnis")!.start).toBe("10:46");
    expect(a[a.length - 1].ende).toBe("12:35");
    for (let i = 1; i < a.length; i++) expect(a[i].start).toBe(a[i - 1].ende);
  });

  it("Heftwechsel einstellbar, 0 = kein Pausenblock", () => {
    expect(gesamtMinuten(ablaufErstellen({ ...basis, heftwechselMinuten: 15, art: "voll" }))).toBe(250);
    expect(ablaufErstellen({ ...basis, heftwechselMinuten: 0, art: "voll" }).some((b) => b.phase === "heftwechsel")).toBe(false);
  });

  it("Teil A: 126 min plus Abruf als Zusatz; Teil B: Einprägen als Übungsersatz am Anfang (119 min)", () => {
    const a = ablaufErstellen({ ...basis, art: "teil-a" });
    expect(a.slice(0, 6).map((b) => b.minuten)).toEqual([16, 45, 10, 45, 4, 6]);
    expect(a.slice(6).map((b) => b.id)).toEqual(["figuren-lernen:abruf", "fakten-lernen:abruf"]);
    expect(a.slice(6).every((b) => b.hinweis)).toBe(true);
    const b = ablaufErstellen({ ...basis, art: "teil-b" });
    expect(b.map((x) => x.id)).toEqual([
      "figuren-lernen:einpraegen",
      "fakten-lernen:einpraegen",
      "textverstaendnis",
      "figuren-lernen:abruf",
      "fakten-lernen:abruf",
      "diagramme-tabellen",
      "konz",
    ]);
    expect(gesamtMinuten(b)).toBe(119);
  });

  it("Mini: gewählte Gruppen in offizieller Reihenfolge mit Originalzeit", () => {
    const a = ablaufErstellen({ ...basis, art: "mini", mini: ["konz", "figuren-lernen", "muster-zuordnen"] });
    expect(a.map((b) => b.id)).toEqual(["muster-zuordnen", "figuren-lernen:einpraegen", "figuren-lernen:abruf", "konz"]);
    expect(a.map((b) => b.minuten)).toEqual([16, 4, 5, 8]);
    expect(miniArt(["konz", "textverstaendnis", "quanti"])).toBe("teil-b");
    expect(miniArt(["quanti", "muster-zuordnen"])).toBe("teil-a");
  });

  it("weniger Texte in der Bank: 15 min pro Text", () => {
    const a = ablaufErstellen({ ...basis, art: "teil-b", texte: 1 });
    const t = a.find((b) => b.gruppe === "textverstaendnis")!;
    expect(t.minuten).toBe(15);
    expect(t.anzahl).toBe(6);
    expect(ablaufErstellen({ ...basis, art: "teil-b", texte: 0 }).some((b) => b.gruppe === "textverstaendnis")).toBe(false);
  });

  it("Restzeit und Raten-Regel", () => {
    expect(restSekunden({ minuten: 16 }, 0, 60_000)).toBe(15 * 60);
    expect(restSekunden({ minuten: 1 }, 0, 120_000)).toBe(0);
    const a = ablaufErstellen({ ...basis, art: "voll" });
    const idx = (id: string) => a.findIndex((b) => b.id === id);
    expect(nachtraeglichRatenErlaubt(a, idx("quanti"))).toBe(true);
    expect(nachtraeglichRatenErlaubt(a, idx("figuren-lernen:einpraegen"))).toBe(false);
    expect(nachtraeglichRatenErlaubt(a, idx("konz"))).toBe(false);
    expect(nachtraeglichRatenErlaubt(a, idx("diagramme-tabellen"))).toBe(true);
    expect(fruehereAntwortGruppen(a, idx("textverstaendnis"))).toEqual(["muster-zuordnen", "med-nat", "objekte-im-raum", "quanti"]);
  });

  it("Schwierigkeit steigt innerhalb der Gruppe", () => {
    const s = Array.from({ length: 18 }, (_, i) => schwierigkeitFuer(i));
    expect(s[0]).toBe(2);
    expect(s[17]).toBe(5);
    for (let i = 1; i < 18; i++) expect(s[i]).toBeGreaterThanOrEqual(s[i - 1]);
  });
});

describe("Inhalt und Wertung", () => {
  const inhalt = inhaltErzeugen("simtest1", GRUPPEN);

  it("erzeugt alle Gruppen vollständig", () => {
    for (const g of ["muster-zuordnen", "med-nat", "objekte-im-raum", "quanti", "diagramme-tabellen"] as const) expect(inhalt.aufgaben[g]?.length, g).toBe(18);
    expect(inhalt.aufgaben.textverstaendnis?.length).toBe(Math.min(3, inhalt.texte.length) * 6);
    expect(inhalt.figuren?.figuren.length).toBe(18);
    expect(inhalt.fakten?.faelle.length).toBe(15);
    expect(inhalt.fakten?.fragen.length).toBe(18);
    expect(inhalt.konz?.zeilen.length).toBe(40);
    expect(inhalt.konz?.zeilen[0].length).toBe(40);
  });

  it("ist deterministisch (gleicher Seed → gleicher Inhalt)", () => {
    const b = inhaltErzeugen("simtest1", GRUPPEN);
    expect(JSON.stringify(b)).toBe(JSON.stringify(inhalt));
    const c = inhaltErzeugen("simtest2", ["quanti"]);
    expect(JSON.stringify(c.aufgaben.quanti)).not.toBe(JSON.stringify(inhalt.aufgaben.quanti));
    // Jede Gruppe ist unabhängig von der Auswahl der anderen
    expect(JSON.stringify(inhaltErzeugen("simtest1", ["quanti"]).aufgaben.quanti)).toBe(JSON.stringify(inhalt.aufgaben.quanti));
  });

  it("keine doppelten Aufgaben innerhalb einer Gruppe", () => {
    for (const [g, liste] of Object.entries(inhalt.aufgaben)) {
      const keys = liste!.map((a) => a.aufgabe.quelle ?? JSON.stringify(a.aufgabe.daten));
      expect(new Set(keys).size, g).toBe(keys.length);
    }
  });

  it("Aufgaben lassen sich fürs Fehlerheft wiederherstellen", () => {
    for (const g of ["quanti", "textverstaendnis", "med-nat"] as const) {
      const s = inhalt.aufgaben[g]![5];
      const neu = aufgabeAus(s.aufgabe.generator, s.aufgabe.seed, s.schwierigkeit);
      expect(neu?.frage, g).toBe(s.aufgabe.frage);
      expect(neu?.loesung, g).toBe(s.aufgabe.loesung);
    }
  });

  it("wertet richtig/gesamt; leere Felder zählen als falsch ohne Abzug", () => {
    const l = loesungenFuer(inhalt, "quanti");
    const antworten: Record<string, number | null> = {};
    l.forEach((x, i) => {
      if (i < 10) antworten[antwortSchluessel("quanti", i)] = x; // 10 richtig
      else if (i < 14) antworten[antwortSchluessel("quanti", i)] = (x + 1) % 5; // 4 falsch
      else antworten[antwortSchluessel("quanti", i)] = null; // 4 leer
    });
    const w = simulationWerten(inhalt, ["quanti"], antworten);
    expect(w.quanti).toEqual({ richtig: 10, gesamt: 18, leer: 4 });
    const leer = simulationWerten(inhalt, ["figuren-lernen", "fakten-lernen"], {});
    expect(leer["figuren-lernen"]).toEqual({ richtig: 0, gesamt: 18, leer: 18 });
    expect(leer["fakten-lernen"]?.gesamt).toBe(18);
  });

  it("Gedächtnistests: Lösung folgt der Abfrage-Reihenfolge", () => {
    const f = inhalt.figuren!;
    const l = loesungenFuer(inhalt, "figuren-lernen");
    expect(l[0]).toBe(f.figuren[f.abfrage[0]].schwarz);
    const antworten = Object.fromEntries(l.map((x, i) => [antwortSchluessel("figuren-lernen", i), x]));
    expect(simulationWerten(inhalt, ["figuren-lernen"], antworten)["figuren-lernen"]?.richtig).toBe(18);
  });

  it("Konz: Rohwert und Punktwert aus Markierungen und aus Papier-Zahlen", () => {
    const blatt = inhalt.konz!;
    // erste 5 Zeilen perfekt markieren
    const markiert: number[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 40; c++) if (blatt.ziele[r][c]) markiert.push(r * 40 + c);
    const w = simulationWerten(inhalt, ["konz"], {}, { markiert }).konz!;
    const ziele5 = blatt.ziele.slice(0, 5).flat().filter(Boolean).length;
    // Wertung bis zur letzten Markierung: in Zeile 5 nach der letzten Markierung zählt nichts
    expect(w.richtig).toBe(ziele5);
    expect(w.gesamt).toBe(zielzeichen(blatt));
    expect(w.punkte).toBeGreaterThanOrEqual(0);
    expect(w.punkte).toBeLessThanOrEqual(18);
    const leer = simulationWerten(inhalt, ["konz"], {}, { markiert: [] }).konz!;
    expect(leer.richtig).toBe(0);
    expect(leer.punkte).toBe(0);

    const p = konzAusZahlen(blatt.regelId, 300, 10, 20);
    expect(p.rohwert).toBe(270);
    expect(p.punktwert).toBeGreaterThan(0);
    expect(konzAusZahlen(blatt.regelId, 5, 10, 20).rohwert).toBe(0);
    expect(konzAusZahlen(blatt.regelId, 400, 0, 0).punktwert).toBe(18);
  });
});
