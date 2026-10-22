import { describe, expect, it } from "vitest";
import { ALLE_PAARE, anwenden, BEWEGUNGEN, objekteGenerator, paarMatrix } from "./objekte";

const vorne: [number, number, number] = [0, 0, 1];

describe("Objekte im Raum: Bewegungen wie in den Beispielaufgaben 2026", () => {
  it("→ bringt die linke Fläche nach vorne, ← die rechte", () => {
    expect(anwenden(BEWEGUNGEN["→"], [-1, 0, 0])).toEqual(vorne);
    expect(anwenden(BEWEGUNGEN["←"], [1, 0, 0])).toEqual(vorne);
  });
  it("↓ bringt die obere Fläche nach vorne, ↑ die untere", () => {
    expect(anwenden(BEWEGUNGEN["↓"], [0, 1, 0])).toEqual(vorne);
    expect(anwenden(BEWEGUNGEN["↑"], [0, -1, 0])).toEqual(vorne);
  });
  it("hat genau 10 verschiedene Endlagen, →→ = ←← und ↑↑ = ↓↓", () => {
    const lagen = new Set(ALLE_PAARE.map((p) => paarMatrix(p).join(",")));
    expect(lagen.size).toBe(10);
    expect(paarMatrix(["→", "→"])).toEqual(paarMatrix(["←", "←"]));
    expect(paarMatrix(["↑", "↑"])).toEqual(paarMatrix(["↓", "↓"]));
    expect(paarMatrix(["→", "↑"])).not.toEqual(paarMatrix(["↑", "→"]));
  });
  it("Beispiel aus der Broschüre: → dann ↑ – die vordere Kugel wandert nach oben rechts", () => {
    // Vorne-unten-links liegende Kugel: nach → rechts unten, nach ↑ ...
    const pos: [number, number, number] = [-0.4, -0.3, 0.5];
    const nach = anwenden(paarMatrix(["→", "↑"]), pos);
    expect(nach[0]).toBeGreaterThan(0); // rechts
  });
});

describe("Objekte im Raum: Generator", () => {
  it("erzeugt für 300 Seeds gültige, eindeutige Aufgaben", () => {
    for (let i = 0; i < 300; i++) {
      const a = objekteGenerator.erzeugen(`t${i}`, (i % 5) + 1);
      expect(objekteGenerator.pruefen(a), `Seed t${i}`).toEqual([]);
    }
  });
  it("ist reproduzierbar", () => {
    expect(objekteGenerator.erzeugen("abc", 3)).toEqual(objekteGenerator.erzeugen("abc", 3));
  });
});
