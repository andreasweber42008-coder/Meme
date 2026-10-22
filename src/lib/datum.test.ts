import { describe, expect, it } from "vitest";
import {
  emsDatum,
  formatTag,
  heute,
  isoWoche,
  plusTage,
  tageZwischen,
  testanmeldungBis,
  uhrzeit,
  voranmeldungBis,
  wochentag,
} from "./datum";

describe("EMS-Termine (Freitag der ISO-KW 27)", () => {
  it("trifft die bekannten Termine", () => {
    expect(emsDatum(2026)).toBe("2026-07-03");
    expect(emsDatum(2027)).toBe("2027-07-09");
    expect(emsDatum(2028)).toBe("2028-07-07");
  });

  it("ist immer ein Freitag in KW 27", () => {
    for (let jahr = 2024; jahr <= 2040; jahr++) {
      const d = emsDatum(jahr);
      expect(wochentag(d), d).toBe(5);
      expect(isoWoche(d), d).toEqual({ jahr, woche: 27 });
    }
  });

  it("Testanmeldung 45 Tage vorher", () => {
    expect(testanmeldungBis(2027)).toBe("2027-05-25");
    expect(testanmeldungBis(2028)).toBe("2028-05-23");
    expect(tageZwischen(testanmeldungBis(2029), emsDatum(2029))).toBe(45);
  });

  it("Voranmeldung bis 15. Februar", () => {
    expect(voranmeldungBis(2027)).toBe("2027-02-15");
  });
});

describe("Zeitzone Europe/Zurich", () => {
  it("wechselt den Tag um Mitternacht Zürcher Zeit, auch bei Sommerzeit", () => {
    expect(heute(new Date("2026-10-24T21:59:00Z"))).toBe("2026-10-24"); // 23:59 MESZ
    expect(heute(new Date("2026-10-24T22:00:00Z"))).toBe("2026-10-25"); // 00:00 MESZ
    expect(heute(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31"); // 23:59 MEZ
    expect(heute(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
    expect(heute(new Date("2027-03-27T23:30:00Z"))).toBe("2027-03-28");
  });

  it("zeigt die Zürcher Uhrzeit", () => {
    expect(uhrzeit(new Date("2027-07-09T06:30:00Z"))).toBe("08:30");
    expect(uhrzeit(new Date("2027-01-15T07:30:00Z"))).toBe("08:30");
  });

  it("rechnet Tage ohne Sommerzeit-Fehler", () => {
    expect(tageZwischen("2026-10-22", "2027-07-09")).toBe(260);
    expect(plusTage("2027-03-27", 2)).toBe("2027-03-29");
    expect(tageZwischen("2027-03-27", "2027-03-29")).toBe(2);
  });

  it("formatiert schweizerisch", () => {
    expect(formatTag("2027-07-09")).toBe("Fr, 9. Juli 2027");
    expect(formatTag("2027-07-09", "kurz")).toBe("9.7.2027");
  });
});
