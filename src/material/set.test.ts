import { describe, expect, it } from "vitest";
import type { MaterialSet } from "@/daten/modelle";
import { katalogSet, NCWIKI_SETS, katalogDateienFuerImport, urlErlaubt, OFFIZIELL } from "./katalog";
import {
  bewerten,
  bewertungNachGruppe,
  doppelStand,
  doppelVergleich,
  fehlerEintrag,
  gruppeFuerNr,
  loesungswegFuer,
  partnerFuerNeuenLauf,
  schluesselAnpassen,
  setAusKatalog,
  standardBereiche,
  ursacheVorschlag,
  versucheAusLauf,
  zeitLimitMs,
  type LaufMitId,
} from "./set";

function set(teil: Partial<MaterialSet> = {}): MaterialSet & { id: string } {
  return {
    id: "s1",
    titel: "Test",
    quelle: "eigen",
    gruppe: "quanti",
    zeitMinuten: 10,
    anzahl: 4,
    ersteNr: 1,
    schluessel: ["A", "B", "C", null],
    dateien: [],
    seiten: {},
    textAufgaben: false,
    status: "geprueft",
    erstellt: 0,
    ...teil,
  };
}

function lauf(id: string, modus: "zeit" | "ohne-zeit", antworten: Record<string, number | null>, ende?: number, partnerLaufId?: string): LaufMitId {
  return { id, setId: "s1", modus, start: 0, ende, antworten, partnerLaufId };
}

describe("bewerten", () => {
  it("zählt richtige Antworten und lässt Aufgaben ohne Schlüssel weg", () => {
    const b = bewerten(set(), { "1": 0, "2": 2, "3": 2, "4": 1 });
    expect(b.richtig).toBe(2);
    expect(b.gewertet).toBe(3);
    expect(b.beantwortet).toBe(4);
    expect(b.aufgaben.map((a) => a.richtig)).toEqual([true, false, true, false]);
    expect(b.aufgaben[3].gewertet).toBe(false);
  });

  it("wertet leere und ungültige Antworten als falsch", () => {
    const b = bewerten(set(), { "1": null, "2": 7 });
    expect(b.richtig).toBe(0);
    expect(b.beantwortet).toBe(0);
  });

  it("beachtet ersteNr", () => {
    const b = bewerten(set({ ersteNr: 19, anzahl: 2, schluessel: ["E", "D"] }), { "19": 4, "20": 3 });
    expect(b.richtig).toBe(2);
    expect(b.aufgaben.map((a) => a.nr)).toEqual([19, 20]);
  });

  it("teilt Simulationen nach Bereichen auf", () => {
    const s = set({
      gruppe: "simulation",
      anzahl: 4,
      schluessel: ["A", "A", "B", "B"],
      bereiche: [
        { gruppe: "muster-zuordnen", von: 1, bis: 2, minuten: 2 },
        { gruppe: "med-nat", von: 3, bis: 4, minuten: 5 },
      ],
    });
    const b = bewerten(s, { "1": 0, "2": 1, "3": 1, "4": 1 });
    expect(bewertungNachGruppe(s, b)).toEqual({ "muster-zuordnen": { richtig: 1, gesamt: 2 }, "med-nat": { richtig: 2, gesamt: 2 } });
    expect(gruppeFuerNr(s, 3)).toBe("med-nat");
    expect(gruppeFuerNr(s, 9)).toBeNull();
  });
});

describe("Doppeldurchgang", () => {
  const s = set({ anzahl: 4, schluessel: ["A", "B", "C", "D"] });

  it("trennt Zeitproblem und Verständnisproblem", () => {
    const mit = { antworten: { "1": 0, "2": 0, "3": null, "4": 3 } };
    const ohne = { antworten: { "1": 0, "2": 1, "3": 0, "4": 0 } };
    const v = doppelVergleich(s, mit, ohne);
    expect(v.aufgaben).toEqual([
      { nr: 1, kategorie: "beide-richtig" },
      { nr: 2, kategorie: "zeitproblem" },
      { nr: 3, kategorie: "verstaendnis" },
      { nr: 4, kategorie: "unsicher" },
    ]);
    expect(v.anzahl).toEqual({ "beide-richtig": 1, zeitproblem: 1, verstaendnis: 1, unsicher: 1 });
  });

  it("kennt den Stand: offen → zweiter offen → fertig", () => {
    expect(doppelStand([]).stand).toBe("offen");
    const z = lauf("z", "zeit", {}, 100);
    expect(doppelStand([z]).stand).toBe("zweiter-offen");
    expect(partnerFuerNeuenLauf([z], "s1", "ohne-zeit")).toBe("z");
    expect(partnerFuerNeuenLauf([z], "s1", "zeit")).toBeUndefined();
    const o = lauf("o", "ohne-zeit", {}, 200, "z");
    const d = doppelStand([z, o]);
    expect(d.stand).toBe("fertig");
    expect(d.mitZeit?.id).toBe("z");
    expect(d.ohneZeit?.id).toBe("o");
    // neuer Lauf mit Zeit beginnt einen neuen Doppeldurchgang
    expect(doppelStand([z, o, lauf("z2", "zeit", {}, 300)]).stand).toBe("zweiter-offen");
  });

  it("zählt offene Läufe und Läufe ohne Partner nicht", () => {
    expect(doppelStand([lauf("z", "zeit", {})]).stand).toBe("offen");
    expect(doppelStand([lauf("z", "zeit", {}, 100), lauf("o", "ohne-zeit", {}, 50)]).stand).toBe("zweiter-offen");
  });

  it("schlägt eine Ursache vor", () => {
    expect(ursacheVorschlag("zeitproblem", 1)).toBe("zeitnot");
    expect(ursacheVorschlag("verstaendnis", 1)).toBe("methodenschritt");
    expect(ursacheVorschlag(undefined, null)).toBe("zeitnot");
  });
});

describe("Versuche und Fehlerheft", () => {
  it("schreibt einen Versuch pro gewerteter Aufgabe", () => {
    const s = set();
    const l = { ...lauf("l1", "zeit", { "1": 0, "2": 0 }, 600_000), dauerMs: 600_000 };
    const v = versucheAusLauf(s, l, "2026-10-22");
    expect(v.map((x) => x.id)).toEqual(["l1:1", "l1:2", "l1:3"]);
    expect(v[0].daten).toMatchObject({ quelle: "material", setId: "s1", nr: 1, richtig: true, gruppe: "quanti", dauerMs: 150_000, zielMs: 150_000 });
    expect(v[1].daten.richtig).toBe(false);
    expect(v[2].daten.antwort).toBeNull();
    expect(v[0].daten.methodeId).toBeTruthy();
  });

  it("legt Fehler mit Material-Bezug und Wiedervorlage morgen an", () => {
    const f = fehlerEintrag(set(), 2, "zeitnot", "2026-10-22", { jetzt: 1 });
    expect(f?.id).toBe("material:s1:2");
    expect(f?.daten.ref).toEqual({ art: "material", setId: "s1", nr: 2 });
    expect(f?.daten.srs.faellig).toBe("2026-10-23");
    expect(f?.daten.ursache).toBe("zeitnot");
  });

  it("liefert den Lösungsweg aus dem Material oder als Ergänzung", () => {
    expect(loesungswegFuer(set({ loesungswege: { "1": "So geht es." } }), 1)).toEqual({ herkunft: "material", text: "So geht es." });
    const e = loesungswegFuer(set(), 2);
    expect(e?.herkunft).toBe("ergaenzung");
    expect(e?.schritte?.length).toBeGreaterThan(0);
    expect(loesungswegFuer(set({ gruppe: "simulation" }), 2)).toBeNull();
  });
});

describe("Sets anlegen", () => {
  it("baut ein Set aus dem Katalog ohne Prozentrang-Dateien", () => {
    const k = katalogSet("ncwiki-sim-2026")!;
    expect(katalogDateienFuerImport(k).some((d) => /prozentrang/i.test(d.titel))).toBe(false);
    const s = setAusKatalog(k, [], 5);
    expect(s).toMatchObject({ quelle: "ncwiki", katalogId: "ncwiki-sim-2026", anzahl: 144, status: "neu", lizenz: "CC BY-NC 4.0" });
    expect(s.schluessel).toHaveLength(144);
    expect(s.bereiche).toHaveLength(8);
    expect(standardBereiche()[7]).toMatchObject({ von: 127, bis: 144 });
  });

  it("enthält 118 Katalog-Sets mit eindeutigen IDs", () => {
    expect(NCWIKI_SETS).toHaveLength(118);
    expect(new Set(NCWIKI_SETS.map((s) => s.id)).size).toBe(118);
  });

  it("passt den Schlüssel an neue Bereiche an", () => {
    expect(schluesselAnpassen({ ersteNr: 1, schluessel: ["A", "B", "C"] }, 2, 3)).toEqual(["B", "C", null]);
  });

  it("kennt Zeitlimits", () => {
    expect(zeitLimitMs({ zeitMinuten: 16 }, "zeit")).toBe(960_000);
    expect(zeitLimitMs({ zeitMinuten: 16 }, "ohne-zeit")).toBeNull();
    expect(zeitLimitMs({ zeitMinuten: 0 }, "zeit")).toBeNull();
  });

  it("lässt nur freigegebene Hosts zu", () => {
    expect(OFFIZIELL.every((o) => urlErlaubt(o.url))).toBe(true);
    expect(urlErlaubt("https://www.unifr.ch/ztd/ems/x.pdf")).toBe(true);
    expect(urlErlaubt("http://www.swissuniversities.ch/x.pdf")).toBe(false);
    expect(urlErlaubt("https://evil.example/x.pdf")).toBe(false);
    expect(urlErlaubt("kein link")).toBe(false);
  });
});
