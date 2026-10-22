import { describe, expect, it } from "vitest";
import { quantiGenerator, QUANTI_TYPEN, zahl } from "./quanti";

describe("Quanti", () => {
  it("schreibt Zahlen schweizerisch", () => {
    expect(zahl(64000, 0)).toBe("64’000");
    expect(zahl(3.5)).toBe("3,5");
    expect(zahl(1234.567)).toBe("1’234,57");
  });

  it("erzeugt für 600 Seeds gültige Aufgaben mit 5 verschiedenen Antworten", () => {
    const typen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const a = quantiGenerator.erzeugen(`q${i}`, (i % 5) + 1);
      expect(quantiGenerator.pruefen(a), `q${i}: ${a.daten.text}`).toEqual([]);
      expect(a.drills.map((d) => d.schritt)).toEqual([1, 2, 3, 4]);
      typen.add(a.daten.typ);
    }
    expect([...typen].sort()).toEqual([...QUANTI_TYPEN].sort());
  });

  it("rechnet Milans Mischungsbeispiel richtig (1:4 → 1:16, 50 ml → 120 ml Zugabe)", () => {
    let gefunden = false;
    for (let i = 0; i < 3000 && !gefunden; i++) {
      const a = quantiGenerator.erzeugen(`m${i}`, 3);
      if (a.daten.text.startsWith("50 ml einer Lösung") && a.daten.text.includes("1 : 4") && a.daten.text.includes("1 : 16")) {
        expect(a.optionen[a.loesung].text).toBe("120 ml");
        gefunden = true;
      }
    }
    expect(gefunden).toBe(true);
  });
});
