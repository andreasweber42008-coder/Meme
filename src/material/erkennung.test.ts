import { describe, expect, it } from "vitest";
import {
  bereichAusSchluessel,
  erkenneGruppe,
  erkenneLoesungswege,
  erkenneSchluessel,
  erkenneSeiten,
  erkenneZeit,
  schluesselAlsListe,
  seitenFuellen,
} from "./erkennung";

describe("erkenneSchluessel", () => {
  it("liest «1) E», «2. A», «3: C», «4 - B» und «5.D»", () => {
    const text = "Lösungen Serie 1\n1) E\n2. A\n3: C\n4 - B\n5.D\n";
    expect(erkenneSchluessel(text)).toEqual({ 1: "E", 2: "A", 3: "C", 4: "B", 5: "D" });
  });

  it("liest «Aufgabe 1: E» und mehrere Einträge pro Zeile", () => {
    expect(erkenneSchluessel("Aufgabe 1: E   Aufgabe 2: B   Aufgabe 3: A")).toEqual({ 1: "E", 2: "B", 3: "A" });
    expect(erkenneSchluessel("1. C    7. A\n2. D    8. B\n3. E")).toMatchObject({ 1: "C", 2: "D", 3: "E", 7: "A", 8: "B" });
  });

  it("liest Einträge nur mit Leerzeichen («1 E 2 A»)", () => {
    expect(erkenneSchluessel("1 E 2 A 3 C 4 B")).toEqual({ 1: "E", 2: "A", 3: "C", 4: "B" });
  });

  it("liest Tabellen mit Zahlen- und Buchstabenzeile", () => {
    const text = "Aufgabe 1 2 3 4 5 6\nLösung E A C B D A\n\nAufgabe 7 8 9\nLösung B B C";
    expect(erkenneSchluessel(text)).toEqual({ 1: "E", 2: "A", 3: "C", 4: "B", 5: "D", 6: "A", 7: "B", 8: "B", 9: "C" });
  });

  it("liest Tabellen ohne Kopfspalte und Zahl/Buchstabe in einer Zeile", () => {
    expect(erkenneSchluessel("1 2 3\nE A C")).toEqual({ 1: "E", 2: "A", 3: "C" });
    expect(erkenneSchluessel("10 11 12 D E A")).toEqual({ 10: "D", 11: "E", 12: "A" });
  });

  it("liest «Aufgabe 3» mit «Lösung: B» in der nächsten Zeile", () => {
    const text = "Aufgabe 3\nLösung: B\nWeil ...\nAufgabe 4\nLösung: D";
    expect(erkenneSchluessel(text)).toEqual({ 3: "B", 4: "D" });
  });

  it("ignoriert vereinzelte Zufallstreffer im Fliesstext", () => {
    const text = "Im Jahr 2026 gilt 1 A als Regel. Danach Erklärungen.\n12) C\n13) A\n14) E";
    expect(erkenneSchluessel(text)).toEqual({ 12: "C", 13: "A", 14: "E" });
  });

  it("beachtet erwartete Nummern", () => {
    const text = "1) A\n2) B\n3) C\n19) D\n20) E";
    expect(erkenneSchluessel(text, { ersteNr: 1, anzahl: 3 })).toEqual({ 1: "A", 2: "B", 3: "C" });
  });

  it("nimmt bei Widerspruch den ersten Treffer der stärkeren Stufe", () => {
    expect(erkenneSchluessel("1) A\n2) B\n3) C\n2 E")).toEqual({ 1: "A", 2: "B", 3: "C" });
  });

  it("baut Listen und Bereiche aus dem Schlüssel", () => {
    const s = { 2: "B", 3: "C", 5: "E" } as const;
    expect(schluesselAlsListe(s, 1, 5)).toEqual([null, "B", "C", null, "E"]);
    expect(bereichAusSchluessel(s)).toEqual({ ersteNr: 2, anzahl: 4 });
    expect(bereichAusSchluessel({})).toBeNull();
  });
});

describe("erkenneSeiten", () => {
  it("ordnet Aufgaben-Nummern ihren Seiten zu", () => {
    const seiten = [
      "Muster zuordnen\nBearbeitungshinweise",
      "1. Welches Muster ...\nA) x B) y\n2. Welches ...",
      "3. Welches ...\nSeite 3",
      "Aufgabe 4\nText ...\nAufgabe 5",
    ];
    expect(erkenneSeiten(seiten)).toEqual({ 1: 2, 2: 2, 3: 3, 4: 4, 5: 4 });
  });

  it("überspringt Nummern, die nicht zur Reihenfolge passen", () => {
    const seiten = ["1. erste\n2. zweite", "7. Liste im Text\n3. dritte", "4. vierte\n1. Unterpunkt"];
    expect(erkenneSeiten(seiten)).toEqual({ 1: 1, 2: 1, 3: 2, 4: 3 });
  });

  it("füllt Lücken mit der vorherigen Seite", () => {
    expect(seitenFuellen({ 1: 2, 3: 4 }, 1, 4)).toEqual({ "1": 2, "2": 2, "3": 4, "4": 4 });
  });

  it("beginnt bei ersteNr", () => {
    expect(erkenneSeiten(["19. a", "20. b"], { ersteNr: 19, anzahl: 2 })).toEqual({ 19: 1, 20: 2 });
  });
});

describe("erkenneZeit", () => {
  it("liest Bearbeitungszeit und Kurzformen", () => {
    expect(erkenneZeit("Bearbeitungszeit: 45 Minuten")).toBe(45);
    expect(erkenneZeit("Zeit: 16 min")).toBe(16);
    expect(erkenneZeit("Du hast 10 Min. Zeit")).toBe(10);
    expect(erkenneZeit("Dauer 1 h 30 min")).toBe(90);
    expect(erkenneZeit("Gesamtzeit ca. 8 Minuten")).toBe(8);
  });

  it("liefert null ohne Angabe", () => {
    expect(erkenneZeit("Aufgabe 1: Welche Aussage stimmt?")).toBeNull();
  });
});

describe("erkenneGruppe", () => {
  it("erkennt Gruppen aus dem Titel", () => {
    expect(erkenneGruppe("Muster zuordnen – Serie 2")).toBe("muster-zuordnen");
    expect(erkenneGruppe("Med-nat Grundverständnis 1")).toBe("med-nat");
    expect(erkenneGruppe("Quantitat + formale Probleme 1")).toBe("quanti");
    expect(erkenneGruppe("Textverständnis 2")).toBe("textverstaendnis");
    expect(erkenneGruppe("Diagramme & Tabellen 2")).toBe("diagramme-tabellen");
    expect(erkenneGruppe("Konzentrationstest 3")).toBe("konz");
    expect(erkenneGruppe("Figuren reproduzieren 1")).toBe("figuren-lernen");
    expect(erkenneGruppe("Fakten lernen 4")).toBe("fakten-lernen");
    expect(erkenneGruppe("Objekte im Raum 3")).toBe("objekte-im-raum");
    expect(erkenneGruppe("NCWiki-Testsimulation 2026")).toBe("simulation");
  });

  it("nutzt den Text, wenn der Titel nichts sagt", () => {
    expect(erkenneGruppe("Scan 0012", "Diagramme und Tabellen. Welche Aussage lässt sich aus der Tabelle ableiten?")).toBe("diagramme-tabellen");
    expect(erkenneGruppe("Scan 0013", "")).toBeNull();
  });

  it("verwechselt Schlauchfiguren nicht mit Figuren lernen und Konzeptpapier nicht mit Konz", () => {
    expect(erkenneGruppe("Schlauchfiguren")).toBeNull();
    expect(erkenneGruppe("Hinweis", "Nutze das Konzeptpapier")).toBeNull();
  });
});

describe("erkenneLoesungswege", () => {
  it("schneidet Blöcke pro Aufgabe aus", () => {
    const text = [
      "Lösungen",
      "1) E – Die Zahl der Zellen verdoppelt sich alle 20 Minuten, also 2^3 = 8.",
      "Daher ist E richtig.",
      "2) A",
      "3) C Aus dem zweiten Satz folgt, dass nur Aussage II zutrifft.",
    ].join("\n");
    const w = erkenneLoesungswege(text);
    expect(Object.keys(w)).toEqual(["1", "3"]);
    expect(w[1]).toContain("verdoppelt");
    expect(w[1]).toContain("Daher ist E richtig.");
    expect(w[1].startsWith("Die Zahl")).toBe(true);
    expect(w[3].startsWith("Aus dem zweiten Satz")).toBe(true);
  });

  it("liefert nichts bei reinem Schlüssel", () => {
    expect(erkenneLoesungswege("1) A\n2) B\n3) C")).toEqual({});
  });
});
