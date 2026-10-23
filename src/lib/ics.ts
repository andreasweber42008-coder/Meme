import { plusTage, zeitZuMinuten, minutenZuZeit, type Tag } from "./datum";

export interface IcsEreignis {
  uid: string;
  titel: string;
  beschreibung?: string;
  tag: Tag;
  /** «HH:MM»; ohne Zeit = ganztägig */
  zeit?: string;
  minuten?: number;
  /** Erinnerung so viele Minuten vor Beginn (ganztägig: vor 00:00); negativ = nach Beginn, z. B. −540 = 09:00 am Tag */
  alarmMinutenVorher?: number;
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Zurich",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:MESZ",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:MEZ",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function text(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Zeilen auf 75 Oktette falten (RFC 5545). */
function falten(zeile: string): string {
  const enc = new TextEncoder();
  if (enc.encode(zeile).length <= 75) return zeile;
  const teile: string[] = [];
  let aktuell = "";
  for (const z of zeile) {
    if (enc.encode(aktuell + z).length > (teile.length ? 74 : 75)) {
      teile.push(aktuell);
      aktuell = z;
    } else aktuell += z;
  }
  teile.push(aktuell);
  return teile.join("\r\n ");
}

const kompakt = (tag: Tag) => tag.replace(/-/g, "");
const zeitKompakt = (zeit: string) => zeit.replace(":", "") + "00";

export function icsErzeugen(ereignisse: IcsEreignis[], jetzt = new Date()): string {
  const stempel = jetzt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const zeilen = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Munggi//EMS-Lernplan//DE", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Munggi EMS", ...VTIMEZONE];
  for (const e of ereignisse) {
    zeilen.push("BEGIN:VEVENT", `UID:${e.uid}@munggi`, `DTSTAMP:${stempel}`);
    if (e.zeit) {
      const ende = zeitZuMinuten(e.zeit) + (e.minuten ?? 30);
      const endTag = ende >= 1440 ? plusTage(e.tag, 1) : e.tag;
      zeilen.push(`DTSTART;TZID=Europe/Zurich:${kompakt(e.tag)}T${zeitKompakt(e.zeit)}`, `DTEND;TZID=Europe/Zurich:${kompakt(endTag)}T${zeitKompakt(minutenZuZeit(ende))}`);
    } else {
      zeilen.push(`DTSTART;VALUE=DATE:${kompakt(e.tag)}`, `DTEND;VALUE=DATE:${kompakt(plusTage(e.tag, 1))}`);
    }
    zeilen.push(`SUMMARY:${text(e.titel)}`);
    if (e.beschreibung) zeilen.push(`DESCRIPTION:${text(e.beschreibung)}`);
    if (e.alarmMinutenVorher !== undefined) {
      zeilen.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${text(e.titel)}`, e.alarmMinutenVorher >= 0 ? `TRIGGER:-PT${Math.round(e.alarmMinutenVorher)}M` : `TRIGGER:PT${Math.round(-e.alarmMinutenVorher)}M`, "END:VALARM");
    }
    zeilen.push("END:VEVENT");
  }
  zeilen.push("END:VCALENDAR");
  return zeilen.map(falten).join("\r\n") + "\r\n";
}

export function icsHerunterladen(inhalt: string, dateiname = "munggi-lernplan.ics") {
  const blob = new Blob([inhalt], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
