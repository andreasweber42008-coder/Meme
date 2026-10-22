import { describe, expect, it } from "vitest";
import { standardEinstellungen, type Einstellungen } from "@/daten/modelle";
import { plusTage, tageListe, wochentag } from "@/lib/datum";
import { budgetFuer, festeTermine, istKonzTag, naechsteKonzRegel, phaseFuer, planeTag, planeTage, type PlanStand } from "./plan";

function stand(teil: Partial<PlanStand> = {}, e: Partial<Einstellungen> = {}): PlanStand {
  return {
    einstellungen: { ...standardEinstellungen(), onboardingFertig: true, maturajahr: 2027, ...e },
    heute: "2026-10-22",
    fortschritt: {},
    schwaeche: {},
    konzVerlauf: [],
    konzRegeln: ["K1a", "K2a", "K3a", "K4a"],
    fehlerFaellig: 0,
    sets: [],
    erledigteSets: [],
    simulationen: [],
    termine: [],
    ...teil,
  };
}

const minuten = (t: ReturnType<typeof planeTag>) => t.aufgaben.filter((a) => !a.fest).reduce((s, a) => s + a.minuten, 0);

describe("Lernplan", () => {
  it("plant heute konkret mit kleinen und grossen Untertests", () => {
    const t = planeTag("2026-10-22", stand());
    expect(t.frei).toBe(false);
    const gruppen = t.aufgaben.map((a) => a.gruppe);
    for (const g of ["muster-zuordnen", "objekte-im-raum", "figuren-lernen", "fakten-lernen"]) expect(gruppen).toContain(g);
    expect(minuten(t)).toBeLessThanOrEqual(t.budget);
  });

  it("hält sich in allen Wochen an das Tagesbudget", () => {
    for (const t of planeTage("2026-10-22", 250, stand())) {
      if (!t.aufgaben.some((a) => a.fest && a.minuten > 0)) expect(minuten(t), t.tag).toBeLessThanOrEqual(Math.max(t.budget, 0));
    }
  });

  it("lässt den freien Tag, den Vortag und den Testtag frei", () => {
    expect(planeTag("2026-10-25", stand()).frei).toBe(true); // Sonntag
    expect(planeTag("2027-07-08", stand()).frei).toBe(true); // Vortag
    expect(planeTag("2027-07-09", stand()).frei).toBe(true); // Testtag
    expect(phaseFuer("2027-07-09", stand())).toBe("testtag");
  });

  it("halbiert das Volumen in der letzten Woche und lässt Figuren/Fakten ab 3 Tagen vorher weg", () => {
    expect(budgetFuer("2027-07-05", stand())).toBe(15); // Mo, 30 → 15
    const t = planeTag("2027-07-06", stand());
    expect(t.aufgaben.some((a) => a.gruppe === "figuren-lernen" || a.gruppe === "fakten-lernen")).toBe(false);
  });

  it("plant Konz höchstens 2× pro Woche, jedes Mal mit der am längsten ungeübten Regel", () => {
    const tage = tageListe("2027-05-03", 7);
    expect(tage.filter((t) => istKonzTag(t, stand())).length).toBeLessThanOrEqual(2);
    const s = stand({ konzVerlauf: [{ tag: "2027-01-05", regel: "K1a" }, { tag: "2027-01-12", regel: "K2a" }] });
    expect(naechsteKonzRegel(s, "2027-01-19")).toBe("K3a");
  });

  it("Matura-Modus: Prüfungstag frei, Prüfungswoche reduziert, danach Intensivphase", () => {
    const s = stand({}, {
      maturapruefungen: [{ id: "1", fach: "Mathematik", datum: "2027-06-01" }],
      zeitraeume: [{ id: "z", art: "pruefungswoche", von: "2027-05-31", bis: "2027-06-04" }],
    });
    expect(budgetFuer("2027-06-01", s)).toBe(0);
    expect(budgetFuer("2027-06-03", s)).toBe(Math.round(30 * 0.35));
    expect(budgetFuer("2027-06-08", s)).toBe(Math.round(30 * 1.3));
    expect(planeTag("2027-06-01", s).frei).toBe(true);
  });

  it("setzt Fristen mit Vorwarnung", () => {
    const f = festeTermine(stand(), "2027-01-01", "2027-06-01").filter((x) => x.aufgabe.art === "frist");
    const tage = f.map((x) => x.tag);
    expect(tage).toContain("2027-02-01");
    expect(tage).toContain("2027-02-15");
    expect(tage).toContain("2027-05-25");
    expect(f.find((x) => x.tag === "2027-05-25")?.aufgabe.titel).toMatch(/Heute: Testanmeldung/);
  });

  it("plant die Generalprobe 1–2 Wochen vorher und Simulationen in den letzten Wochen", () => {
    const f = festeTermine(stand(), "2027-05-01", "2027-07-09");
    const gp = f.find((x) => x.aufgabe.art === "generalprobe");
    expect(gp?.tag).toBe("2027-06-26");
    expect(f.find((x) => x.aufgabe.art === "fehler-generalprobe")?.tag).toBe("2027-07-03");
    const voll = f.filter((x) => x.aufgabe.simArt === "voll" && x.aufgabe.art === "simulation");
    expect(voll.length).toBeGreaterThanOrEqual(2);
    for (const x of f.filter((y) => y.aufgabe.art === "simulation")) expect(wochentag(x.tag)).toBe(6);
  });

  it("verwendet NCWiki-Serien, sobald eine Methode frei sitzt", () => {
    const s = stand(
      {
        heute: "2027-04-01",
        fortschritt: { "objekte-im-raum": { stufe: 7 }, "muster-grundverfahren": { stufe: 7 }, kreuzblick: { stufe: 7 }, "figuren-unikat": { stufe: 7 }, "fakten-loci": { stufe: 7 }, "quanti-drei-runden": { stufe: 7 }, "mednat-ableiten": { stufe: 7 }, "text-markieren": { stufe: 7 }, "diatab-ableiten": { stufe: 7 }, "konz-zeilenweise": { stufe: 7 } },
        sets: [{ id: "ncwiki-objekte-im-raum-2026-2", gruppe: "objekte-im-raum", titel: "Objekte im Raum – Serie 2 (2026)", zeitMinuten: 10, quelle: "ncwiki", jahr: 2026 }],
      },
      { minutenProTag: [60, 60, 60, 60, 60, 60, 0] },
    );
    const tage = tageListe("2027-04-05", 7).map((t) => planeTag(t, s));
    expect(tage.some((t) => t.aufgaben.some((a) => a.art === "serie"))).toBe(true);
  });

  it("legt externe Termine fest in den Plan", () => {
    const s = stand({ termine: [{ id: "p", titel: "Probelauf an der Kanti", datum: "2027-04-17", art: "probelauf" }] });
    const t = planeTag("2027-04-17", s);
    expect(t.aufgaben[0]).toMatchObject({ art: "termin", titel: "Probelauf an der Kanti" });
    expect(plusTage("2027-04-17", 0)).toBe("2027-04-17");
  });
});
