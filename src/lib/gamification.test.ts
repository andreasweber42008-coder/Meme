import { describe, expect, it } from "vitest";
import { streak } from "./gamification";

describe("Streak", () => {
  const frei = (t: string) => t === "2027-01-03";
  it("zählt Tage am Stück, freie Tage unterbrechen nicht", () => {
    const tage = { "2027-01-01": { xp: 20, minuten: 10, erledigt: [], zielErreicht: true }, "2027-01-02": { xp: 5, minuten: 5, erledigt: [], zielErreicht: false }, "2027-01-04": { xp: 30, minuten: 20, erledigt: [], zielErreicht: true } };
    expect(streak(tage, "2027-01-04", frei)).toBe(3);
  });
  it("hält heute offen, bis gelernt wurde", () => {
    const tage = { "2027-01-04": { xp: 30, minuten: 20, erledigt: [], zielErreicht: true } };
    expect(streak(tage, "2027-01-05", frei)).toBe(1);
  });
  it("Schutzschild rettet einen verpassten Tag", () => {
    const tage = {
      "2027-01-05": { xp: 30, minuten: 20, erledigt: [], zielErreicht: true },
      "2027-01-06": { xp: 0, minuten: 0, erledigt: [], zielErreicht: false, streakSchutz: true },
      "2027-01-07": { xp: 10, minuten: 5, erledigt: [], zielErreicht: false },
    };
    expect(streak(tage, "2027-01-07", () => false)).toBe(2);
  });
});
