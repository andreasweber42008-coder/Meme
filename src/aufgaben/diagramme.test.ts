import { describe, expect, it } from "vitest";
import { diagrammGenerator } from "./diagramme";

describe("Diagramme und Tabellen", () => {
  it("erzeugt für 400 Seeds gültige Aufgaben in allen drei Frageformen", () => {
    const formen = new Set<string>();
    const arten = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const a = diagrammGenerator.erzeugen(`d${i}`, (i % 5) + 1);
      expect(diagrammGenerator.pruefen(a), `d${i}`).toEqual([]);
      formen.add(a.daten.frageArt);
      arten.add(a.daten.art);
    }
    expect([...formen].sort()).toEqual(["ableitbar", "kombi", "nicht-ableitbar"]);
    expect(arten.size).toBe(6);
  });

  it("Kombi-Antwort passt zu den geprüften Aussagen", () => {
    for (let i = 0; i < 300; i++) {
      const a = diagrammGenerator.erzeugen(`k${i}`, 4);
      if (a.daten.frageArt !== "kombi") continue;
      expect(a.daten.aussagen).toHaveLength(3);
      expect(["nur I", "nur II", "nur III", "I und II", "I und III", "II und III", "alle drei", "keine"]).toContain(a.optionen[a.loesung].text);
    }
  });
});
