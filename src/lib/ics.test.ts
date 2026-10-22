import { describe, expect, it } from "vitest";
import { icsErzeugen } from "./ics";

describe("Kalender-Export", () => {
  const ics = icsErzeugen(
    [
      { uid: "a", titel: "Munggi: Heute 25 min", beschreibung: "Muster, Objekte; Quanti", tag: "2027-03-29", zeit: "17:30", minuten: 25, alarmMinutenVorher: 0 },
      { uid: "b", titel: "EMS", tag: "2027-07-09", alarmMinutenVorher: 900 },
    ],
    new Date("2026-10-22T08:00:00Z"),
  );

  it("ist gültiges iCalendar mit Zeitzone Zürich", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("TZID:Europe/Zurich");
    expect(ics).toContain("DTSTART;TZID=Europe/Zurich:20270329T173000");
    expect(ics).toContain("DTEND;TZID=Europe/Zurich:20270329T175500");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270709");
    expect(ics).toContain("TRIGGER:-PT900M");
  });

  it("maskiert Sonderzeichen und faltet lange Zeilen", () => {
    expect(ics).toContain("DESCRIPTION:Muster\\, Objekte\\; Quanti");
    for (const z of ics.split("\r\n")) expect(new TextEncoder().encode(z).length).toBeLessThanOrEqual(75);
  });
});
