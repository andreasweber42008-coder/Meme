import { describe, expect, it } from "vitest";
import { MEDNAT_BANK, TEXT_BANK, mednatGenerator, pruefeEintrag, textAufgaben, haeufigsteAussage } from "./bank";

describe("Med-Nat-Bank", () => {
  it("hat 60 gültige, eindeutige Aufgaben", () => {
    expect(MEDNAT_BANK.length).toBe(60);
    expect(new Set(MEDNAT_BANK.map((e) => e.id)).size).toBe(60);
    for (const e of MEDNAT_BANK) expect(pruefeEintrag(e)).toEqual([]);
  });
  it("Generator liefert gültige Aufgaben mit Denkfehler und Schritt", () => {
    for (let i = 0; i < 40; i++) {
      const a = mednatGenerator.erzeugen(`s${i}`, 1 + (i % 5));
      expect(mednatGenerator.pruefen(a)).toEqual([]);
      a.optionen.forEach((o, j) => {
        if (j !== a.loesung) expect(o.schritt).toBeGreaterThan(0);
      });
      expect(a.drills.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("Kombi: häufigste Aussage", () => {
    expect(haeufigsteAussage(["Nur I", "Nur II", "Nur I und III", "Nur II und III", "I, II und III"])).toBe(0);
  });
  it("Lösungen gleichmässig verteilt", () => {
    const z = [0, 0, 0, 0, 0];
    MEDNAT_BANK.forEach((e) => z[e.loesung]++);
    expect(Math.max(...z)).toBeLessThan(30);
  });
});

describe("Text-Bank", () => {
  it("hat 8 Texte mit je 6 gültigen Fragen", () => {
    expect(TEXT_BANK.length).toBe(8);
    for (const t of TEXT_BANK) {
      expect(t.fragen.length).toBe(6);
      for (const f of t.fragen) expect(pruefeEintrag(f)).toEqual([]);
      const aufgaben = textAufgaben(t, "x");
      expect(aufgaben).toHaveLength(6);
      for (const a of aufgaben) expect(mednatGenerator.pruefen(a as never)).toEqual([]);
    }
  });
});
