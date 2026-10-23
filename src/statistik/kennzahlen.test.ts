import { describe, expect, it } from "vitest";
import { gruppenStand } from "./kennzahlen";
import { standardEinstellungen, type Versuch } from "@/daten/modelle";

const v = (richtig: boolean, tag = "2026-10-20"): Versuch => ({ zeit: 0, tag, gruppe: "quanti", quelle: "lektion", methodeId: "quanti-drei-runden", antwort: 0, loesung: 0, richtig, dauerMs: 100_000, zielMs: 150_000, schrittFehler: richtig ? [] : [2] });

describe("Bereitschafts-Ampel", () => {
  it("grau ohne genug Daten", () => {
    const s = gruppenStand([v(true)], {}, standardEinstellungen(), "2026-10-22").find((x) => x.gruppe === "quanti")!;
    expect(s.ampel).toBe("grau");
  });
  it("rot bei tiefer Genauigkeit und tiefer Stufe, Schwach-Schritt erkannt", () => {
    const s = gruppenStand([v(false), v(false), v(false), v(false), v(true)], {}, standardEinstellungen(), "2026-10-22").find((x) => x.gruppe === "quanti")!;
    expect(s.ampel).toBe("rot");
    expect(s.schwachSchritt?.schritt).toBe(2);
  });
  it("grün bei Ziel erreicht und Stufe ≥ 7", () => {
    const s = gruppenStand(Array.from({ length: 10 }, () => v(true)), { "quanti-drei-runden": { stufe: 8 } }, standardEinstellungen(), "2026-10-22").find((x) => x.gruppe === "quanti")!;
    expect(s.ampel).toBe("gruen");
    expect(s.tempo).toBeCloseTo(100 / 150);
  });
  it("alte Versuche zählen nicht", () => {
    const s = gruppenStand(Array.from({ length: 10 }, () => v(true, "2026-01-01")), {}, standardEinstellungen(), "2026-10-22").find((x) => x.gruppe === "quanti")!;
    expect(s.anzahl).toBe(0);
  });
});
