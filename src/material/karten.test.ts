import { describe, expect, it } from "vitest";
import { istUeberschrift, kartenAusZeilen, type KartenZeile } from "./karten";

const z = (text: string, hoehe = 10): KartenZeile => ({ text, hoehe });

describe("kartenAusZeilen", () => {
  const zeilen = [
    z("Kursskript", 24),
    z("3 Muster zuordnen", 16),
    z("Beim Muster zuordnen vergleichst Du einen Ausschnitt mit dem grossen Muster und suchst"),
    z("die einzige deckungsgleiche Variante. Arbeite mit einem festen Ankerpunkt."),
    z("4.1 Quantitative Probleme", 10),
    z("Rechne mit gerundeten Zahlen und prüfe die Einheiten, bevor Du eine Antwort ankreuzt."),
    z("12"),
    z("Kurz", 16),
    z("zu kurz"),
  ];

  it("teilt an Überschriften und erkennt die Gruppe", () => {
    const k = kartenAusZeilen(zeilen, { quelle: "ncwiki", idPraefix: "kursskript" });
    expect(k.map((x) => x.daten.titel)).toEqual(["Kursskript – 3 Muster zuordnen", "4.1 Quantitative Probleme"]);
    expect(k[0].daten.gruppe).toBe("muster-zuordnen");
    expect(k[1].daten.gruppe).toBe("quanti");
    expect(k[0].daten.text).toContain("deckungsgleiche Variante");
    expect(k[0].daten.quelle).toBe("ncwiki");
    expect(k[0].id.startsWith("kursskript:")).toBe(true);
  });

  it("liefert stabile IDs", () => {
    const a = kartenAusZeilen(zeilen, { quelle: "ncwiki", idPraefix: "k" }).map((x) => x.id);
    const b = kartenAusZeilen(zeilen, { quelle: "ncwiki", idPraefix: "k" }).map((x) => x.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("teilt lange Abschnitte", () => {
    const lang = Array.from({ length: 60 }, (_, i) => z(`Satz Nummer ${i} enthält einen ganz normalen Tipp zum Lernen.`));
    const k = kartenAusZeilen([z("Tipps", 16), ...lang], { quelle: "ncwiki", idPraefix: "k" });
    expect(k.length).toBeGreaterThan(1);
    expect(k.every((x) => x.daten.text.length <= 1600)).toBe(true);
    expect(k[1].daten.titel).toBe("Tipps (2)");
  });

  it("erkennt Seitenzahlen nicht als Überschrift", () => {
    expect(istUeberschrift(z("12", 16), 10)).toBe(false);
    expect(istUeberschrift(z("Seite 3 / 119", 16), 10)).toBe(false);
    expect(istUeberschrift(z("2.3 Zeitmanagement"), 10)).toBe(true);
  });
});
