import { describe, expect, it } from "vitest";
import { backupDatei, backupLesen } from "./backup";

describe("Backup", () => {
  it("Export und Import ergeben dieselben Dokumente; Fremdes wird verworfen", () => {
    const doks = [
      { sammlung: "fortschritt", id: "kreuzblick", daten: { stufe: 3 }, geloescht: false, geaendert: 5 },
      { sammlung: "versuche", id: "a", daten: { richtig: true }, geloescht: true, geaendert: 7 },
    ];
    const text = backupDatei(doks);
    expect(backupLesen(text)).toEqual(doks);
    const boese = JSON.stringify({ app: "munggi", dokumente: [{ sammlung: "auth", id: "x", daten: {}, geloescht: false, geaendert: 1 }] });
    expect(backupLesen(boese)).toEqual([]);
    expect(() => backupLesen("{}")).toThrow();
  });
});
