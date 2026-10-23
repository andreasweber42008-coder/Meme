import { describe, expect, it } from "vitest";
import { naechsteSchwierigkeit } from "./schwierigkeit";

describe("Schwierigkeit im freien Training", () => {
  it("fest bleibt fest", () => {
    expect(naechsteSchwierigkeit("schwer", 2, 0, true)).toBe(5);
    expect(naechsteSchwierigkeit("leicht", 4, 3, false)).toBe(2);
  });
  it("automatisch: 3 richtig → schwerer, falsch → leichter, Grenzen 1–5", () => {
    expect(naechsteSchwierigkeit("auto", 3, 3, false)).toBe(4);
    expect(naechsteSchwierigkeit("auto", 3, 2, false)).toBe(3);
    expect(naechsteSchwierigkeit("auto", 3, 0, true)).toBe(2);
    expect(naechsteSchwierigkeit("auto", 5, 6, false)).toBe(5);
    expect(naechsteSchwierigkeit("auto", 1, 0, true)).toBe(1);
  });
});
