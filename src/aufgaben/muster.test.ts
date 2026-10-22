import { describe, expect, it } from "vitest";
import { minimalerUnterschied, musterGenerator } from "./muster";

describe("Muster zuordnen", () => {
  it("erzeugt für 80 Seeds formal gültige Aufgaben (beide Methoden)", () => {
    for (let i = 0; i < 80; i++) {
      const a = musterGenerator.erzeugen(`m${i}`, (i % 5) + 1, i % 2 ? "kreuzblick" : "muster-grundverfahren");
      expect(musterGenerator.pruefen(a), `m${i}`).toEqual([]);
    }
  }, 60_000);

  it("hat genau einen deckungsgleichen Ausschnitt (Raster-Prüfung über alle Positionen)", () => {
    for (let i = 0; i < 10; i++) {
      const a = musterGenerator.erzeugen(`r${i}`, (i % 5) + 1);
      a.daten.ausschnitte.forEach((aus, j) => {
        if (aus.fehler?.art === "ausserhalb") return;
        const d = minimalerUnterschied(a.daten, aus);
        if (j === a.loesung) expect(d, `r${i} richtig`).toBe(0);
        else expect(d, `r${i} ${aus.fehler?.art}`).toBeGreaterThanOrEqual(6);
      });
    }
  }, 240_000);

  it("ist reproduzierbar", () => {
    expect(musterGenerator.erzeugen("x", 2)).toEqual(musterGenerator.erzeugen("x", 2));
  });
});
