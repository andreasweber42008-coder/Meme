import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import roh from "./methoden.json";
import videosRoh from "./videos.json";
import { methodenDateiSchema, UNTERTEST_IDS } from "./schema";
import { UNTERTESTS } from "./untertests";

const datei = methodenDateiSchema.parse(roh);
const methoden = datei.methoden;

function dateienUnter(ordner: string): string[] {
  return readdirSync(ordner).flatMap((name) => {
    const pfad = join(ordner, name);
    return statSync(pfad).isDirectory() ? dateienUnter(pfad) : [pfad];
  });
}

describe("methoden.json", () => {
  it("erfüllt das Schema", () => {
    expect(() => methodenDateiSchema.parse(roh)).not.toThrow();
  });

  it("hat eindeutige IDs", () => {
    const ids = methoden.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nummeriert Schritte lückenlos ab 1", () => {
    for (const m of methoden) {
      expect(m.schritte.map((s) => s.nr), m.id).toEqual(m.schritte.map((_, i) => i + 1));
    }
  });

  it("verweist nur auf existierende Entscheidungen, Fragen und Methoden", () => {
    const w = new Set(datei.entscheidungen.map((e) => e.id));
    const f = new Set(datei.offeneFragen.map((x) => x.id));
    const ids = new Set(methoden.map((m) => m.id));
    for (const m of methoden) {
      m.varianten.forEach((v) => expect(w.has(v), `${m.id} → ${v}`).toBe(true));
      m.unklar.forEach((u) => expect(f.has(u), `${m.id} → ${u}`).toBe(true));
      m.verwandt.forEach((v) => expect(ids.has(v), `${m.id} → ${v}`).toBe(true));
      if (m.ems.uebertragenAuf) expect(ids.has(m.ems.uebertragenAuf)).toBe(true);
    }
  });

  it("verwendet jede Entscheidung W1–W8 mindestens einmal", () => {
    const benutzt = new Set(methoden.flatMap((m) => m.varianten));
    for (const e of datei.entscheidungen) expect(benutzt.has(e.id), e.id).toBe(true);
    expect(datei.entscheidungen.map((e) => e.id)).toEqual(["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]);
  });

  it("hat für jede der 9 Aufgabengruppen mindestens eine Lern-Einheit", () => {
    for (const u of UNTERTEST_IDS.filter((x) => x !== "uebergreifend")) {
      const einheiten = methoden.filter((m) => m.untertest === u && m.art === "einheit");
      expect(einheiten.length, u).toBeGreaterThan(0);
    }
    expect(UNTERTESTS.map((u) => u.id)).toEqual([...UNTERTEST_IDS]);
  });

  it("übernimmt alle 9 Video-Notizen von Milan", () => {
    const mitNotizen = videosRoh.videos.filter((v) => v.notizen).map((v) => v.videoId);
    expect(mitNotizen).toHaveLength(9);
    const inMethoden = new Set(methoden.flatMap((m) => m.quellen.map((q) => q.videoId)).filter(Boolean));
    for (const id of mitNotizen) expect(inMethoden.has(id), id).toBe(true);
  });

  it("verlinkt nur Videos aus deiner Liste", () => {
    const bekannt = new Set(videosRoh.videos.map((v) => v.videoId));
    for (const m of methoden) {
      for (const q of m.quellen) {
        if (q.videoId) expect(bekannt.has(q.videoId), `${m.id}: ${q.videoId}`).toBe(true);
        if (q.videoId && q.url) expect(q.url).toContain(q.videoId);
      }
    }
  });

  it("enthält genau 80 Videos mit eindeutigen IDs", () => {
    const ids = videosRoh.videos.map((v) => v.videoId);
    expect(ids).toHaveLength(80);
    expect(new Set(ids).size).toBe(80);
  });
});

describe("Schweizer Rechtschreibung und privater Build", () => {
  it("verwendet nirgends das scharfe S", () => {
    const scharfS = String.fromCharCode(0xdf);
    const dateien = [...dateienUnter("src"), "index.html", ...dateienUnter("docs")].filter((p) =>
      [".ts", ".tsx", ".json", ".css", ".html", ".md"].includes(extname(p)),
    );
    for (const pfad of dateien) {
      expect(readFileSync(pfad, "utf8").includes(scharfS), pfad).toBe(false);
    }
  });

  it("legt kein Fremdmaterial in public/ oder src/ ab", () => {
    const verboten = [".pdf", ".docx", ".jpg", ".jpeg"];
    for (const pfad of [...dateienUnter("public"), ...dateienUnter("src")]) {
      expect(verboten.includes(extname(pfad).toLowerCase()), pfad).toBe(false);
    }
  });
});
