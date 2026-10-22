import { describe, expect, it } from "vitest";
import { Datenspeicher } from "./store";
import { speicherAblage } from "./ablage";

describe("Datenspeicher", () => {
  it("speichert, findet und löscht", async () => {
    const s = new Datenspeicher(speicherAblage());
    await s.laden();
    await s.speichern("termine", "a", { titel: "Probelauf" });
    expect(s.hole("termine", "a")).toEqual({ id: "a", titel: "Probelauf" });
    expect(s.alle("termine")).toHaveLength(1);
    await s.loeschen("termine", "a");
    expect(s.alle("termine")).toHaveLength(0);
    expect(s.nichtSynchron()).toHaveLength(1);
  });

  it("überlebt einen Neustart (Ablage)", async () => {
    const ablage = speicherAblage();
    const a = new Datenspeicher(ablage);
    await a.laden();
    await a.speichern("einstellungen", "profil", { maturajahr: 2027 });
    const b = new Datenspeicher(ablage);
    await b.laden();
    expect(b.hole("einstellungen", "profil")).toMatchObject({ maturajahr: 2027 });
  });

  it("mischt nach «letzte Änderung gewinnt»", async () => {
    const s = new Datenspeicher(speicherAblage());
    await s.laden();
    await s.speichern("termine", "x", { titel: "lokal" });
    const lokal = s.exportieren()[0];
    expect(await s.einmischen([{ ...lokal, daten: { titel: "alt" }, geaendert: lokal.geaendert - 10 }])).toBe(0);
    expect(s.hole("termine", "x")).toMatchObject({ titel: "lokal" });
    expect(await s.einmischen([{ ...lokal, daten: { titel: "neu" }, geaendert: lokal.geaendert + 10 }])).toBe(1);
    expect(s.hole("termine", "x")).toMatchObject({ titel: "neu" });
  });

  it("markiert nur unveränderte Stände als synchron", async () => {
    const s = new Datenspeicher(speicherAblage());
    await s.laden();
    await s.speichern("termine", "y", { n: 1 });
    const gesendet = s.nichtSynchron();
    await s.speichern("termine", "y", { n: 2 });
    await s.alsSynchronMarkieren(gesendet);
    expect(s.nichtSynchron()).toHaveLength(1);
  });

  it("benachrichtigt Abonnenten", async () => {
    const s = new Datenspeicher(speicherAblage());
    await s.laden();
    let n = 0;
    s.abonnieren("tage", () => n++);
    await s.speichern("tage", "2027-01-01", { xp: 10 });
    expect(n).toBe(1);
  });
});
