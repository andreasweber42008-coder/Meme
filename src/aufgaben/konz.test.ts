import { describe, expect, it } from "vitest";
import { bewerten, entscheidAufgaben, erzeugeBlatt, KONZ_REGELN, konzRegel, punktwert, zielquote } from "./konz";

describe("Konz: Blätter", () => {
  it("hat für jede der 21 Regeln 40×40 Zeichen mit rund 25 % Zielen", () => {
    expect(KONZ_REGELN).toHaveLength(21);
    for (const r of KONZ_REGELN) {
      for (const seed of ["a", "b", "c"]) {
        const b = erzeugeBlatt(r.id, seed);
        expect(b.zeilen).toHaveLength(40);
        expect(b.zeilen.every((z) => z.length === 40)).toBe(true);
        const q = zielquote(b);
        expect(q, `${r.id}/${seed}: ${q}`).toBeGreaterThan(0.17);
        expect(q, `${r.id}/${seed}: ${q}`).toBeLessThan(0.33);
      }
    }
  });

  it("markiert bei Folge-Regeln nie das letzte Zeichen einer Zeile", () => {
    for (const r of KONZ_REGELN.filter((x) => x.folgend)) {
      const b = erzeugeBlatt(r.id, "x");
      expect(b.ziele.every((z) => z[39] === false)).toBe(true);
    }
  });

  it("speichert Ziele, die zur Regel passen", () => {
    for (const r of KONZ_REGELN) {
      const b = erzeugeBlatt(r.id, "pruef", 6, 40);
      b.zeilen.forEach((zeile, i) =>
        zeile.forEach((c, j) => {
          const erwartet = r.folgend && j === zeile.length - 1 ? false : r.ziel(c, zeile[j + 1]);
          expect(b.ziele[i][j]).toBe(erwartet);
        }),
      );
    }
  });

  it("ist reproduzierbar", () => {
    expect(erzeugeBlatt("K4a", "s")).toEqual(erzeugeBlatt("K4a", "s"));
    expect(erzeugeBlatt("K4a", "s")).not.toEqual(erzeugeBlatt("K4a", "t"));
  });
});

describe("Konz: Wertung wie in der Test-Info", () => {
  const b = erzeugeBlatt("K5a", "wertung", 3, 10);
  const leer = () => b.zeilen.map((z) => z.map(() => false));

  it("zählt bis zur letzten Markierung: +1 richtig, −1 falsch, −1 übersehen", () => {
    const m = leer();
    // Zeile 0 komplett richtig bearbeiten
    b.ziele[0].forEach((ziel, i) => (m[0][i] = ziel));
    // in Zeile 1 nur ein falsches Zeichen markieren
    const falschIdx = b.ziele[1].findIndex((z) => !z);
    m[1][falschIdx] = true;
    const w = bewerten(b, m);
    const ziele0 = b.ziele[0].filter(Boolean).length;
    const uebersehen1 = b.ziele[1].slice(0, falschIdx).filter(Boolean).length;
    expect(w.richtig).toBe(ziele0);
    expect(w.falsch).toBe(1);
    expect(w.uebersehen).toBe(uebersehen1);
    expect(w.rohwert).toBe(Math.max(0, ziele0 - 1 - uebersehen1));
    expect(w.letzte).toEqual({ zeile: 1, spalte: falschIdx });
  });

  it("ohne Markierung ist alles 0", () => {
    expect(bewerten(b, leer())).toMatchObject({ rohwert: 0, bearbeitet: 0, letzte: null, punktwert: 0 });
  });

  it("rechnet mit den offiziellen Umrechnungstabellen", () => {
    expect(punktwert(42, "K1")).toBe(0);
    expect(punktwert(43, "K1")).toBe(1);
    expect(punktwert(206, "K1")).toBe(17);
    expect(punktwert(207, "K1")).toBe(18);
    expect(punktwert(131, "K5")).toBe(0);
    expect(punktwert(352, "K5")).toBe(18);
    expect(punktwert(0, "K4")).toBe(0);
    expect(punktwert(1, "K6")).toBe(1);
  });
});

describe("Konz: Entscheid-Drills", () => {
  it("liefert ausgewogene Ja/Nein-Fälle passend zur Regel", () => {
    const d = entscheidAufgaben("K2a", "d", 12);
    expect(d.length).toBe(12);
    const r = konzRegel("K2a");
    for (const x of d) expect(r.ziel(x.zelle, x.naechste)).toBe(x.ziel);
    const ja = d.filter((x) => x.ziel).length;
    expect(ja).toBeGreaterThanOrEqual(4);
    expect(ja).toBeLessThanOrEqual(8);
  });
});
