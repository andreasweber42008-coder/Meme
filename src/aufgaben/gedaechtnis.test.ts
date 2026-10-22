import { describe, expect, it } from "vitest";
import { erzeugeFigurenSet, figurenDenkfehler, pruefeFigurenSet } from "./figuren";
import { erzeugeFaktenSet, fallText, pruefeFaktenSet } from "./fakten";

describe("Figuren lernen", () => {
  it("erzeugt 18 Figuren mit je 5 deutlich sichtbaren Flächen", () => {
    for (let i = 0; i < 40; i++) {
      const s = erzeugeFigurenSet(`f${i}`, 18, (i % 5) + 1);
      expect(s.figuren).toHaveLength(18);
      expect(pruefeFigurenSet(s), `f${i}`).toEqual([]);
    }
  });
  it("fragt in neuer Reihenfolge ab", () => {
    const s = erzeugeFigurenSet("r", 18, 3);
    expect(s.abfrage.some((x, i) => x !== i)).toBe(true);
  });
  it("erkennt Verwechslungen mit ähnlichen Figuren", () => {
    const s = erzeugeFigurenSet("v", 18, 5);
    const f = s.figuren[0];
    const partner = s.figuren.find((x) => x.gruppe === f.gruppe && x.id !== f.id && x.schwarz !== f.schwarz);
    if (partner) expect(figurenDenkfehler(s, 0, partner.schwarz).schritt).toBe(1);
  });
});

describe("Fakten lernen", () => {
  it("erzeugt 15 Fälle in 5 Gruppen und 18 eindeutige Fragen", () => {
    for (let i = 0; i < 60; i++) {
      const s = erzeugeFaktenSet(`k${i}`);
      expect(s.faelle).toHaveLength(15);
      expect(s.fragen).toHaveLength(18);
      expect(pruefeFaktenSet(s), `k${i}`).toEqual([]);
    }
  });
  it("formuliert Fälle und Fragen wie die Beispielaufgaben", () => {
    const s = erzeugeFaktenSet("stil");
    expect(fallText(s.faelle[0])).toMatch(/^[\p{L}' -]+: ca\. \d+ Jahre, .+, .+ – .+$/u);
    for (const q of s.fragen) expect(q.frage).toMatch(/(ist …|ist von Beruf:|lautet:)$/);
  });
  it("jede Frage passt auf genau eine Person", () => {
    const s = erzeugeFaktenSet("eindeutig");
    for (const q of s.fragen) {
      const f = s.faelle[q.fall];
      const passend = s.faelle.filter((x) => {
        if (q.frage.includes(`Namen ${x.name} `) || q.frage.includes(`Namen ${x.name}`)) return x.name === f.name;
        return true;
      });
      expect(passend.length).toBeGreaterThanOrEqual(1);
    }
  });
});
