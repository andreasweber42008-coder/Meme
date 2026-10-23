import { describe, expect, it } from "vitest";
import { anziehen, guthaben, kaufen, MAX_SCHUTZ } from "./shop";
import type { Gamification } from "@/daten/modelle";

const g0: Gamification = { xpGesamt: 300, streakSchutz: 1, abzeichen: [] };

describe("Munggi-Shop", () => {
  it("Kaufen zieht XP vom Guthaben ab und zieht den Gegenstand an", () => {
    const r = kaufen(g0, "zipfelmuetze");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(guthaben(r.neu)).toBe(180);
    expect(r.neu.xpGesamt).toBe(300); // gesammelte XP bleiben für die Statistik
    expect(r.neu.angezogen?.kopf).toBe("zipfelmuetze");
    expect(kaufen(r.neu, "zipfelmuetze")).toEqual({ ok: false, grund: "schon-da" });
  });
  it("zu teuer und unbekannt", () => {
    expect(kaufen(g0, "krone")).toEqual({ ok: false, grund: "zu-teuer" });
    expect(kaufen(g0, "gibtsnicht")).toEqual({ ok: false, grund: "unbekannt" });
  });
  it("Serien-Schutz höchstens 3", () => {
    const voll = { ...g0, xpGesamt: 5000, streakSchutz: MAX_SCHUTZ };
    expect(kaufen(voll, "schutzschild")).toEqual({ ok: false, grund: "voll" });
    const r = kaufen({ ...voll, streakSchutz: 2 }, "schutzschild");
    expect(r.ok && r.neu.streakSchutz).toBe(3);
  });
  it("Anziehen nur mit eigenem Gegenstand, nochmals tippen zieht aus", () => {
    expect(anziehen(g0, "kopf", "krone").angezogen?.kopf).toBeUndefined();
    const g = { ...g0, inventar: ["brille"] };
    const an = anziehen(g, "augen", "brille");
    expect(an.angezogen?.augen).toBe("brille");
    expect(anziehen(an, "augen", "brille").angezogen?.augen).toBeUndefined();
  });
});
