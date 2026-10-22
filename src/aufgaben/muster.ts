import { Zufall } from "@/lib/zufall";
import { grundpruefung, type EinzelGenerator, type Option, type SchrittDrill } from "./typen";

/** Muster zuordnen: Strichmuster + 5 Ausschnitte, genau einer deckungsgleich (nicht skaliert, gedreht, gespiegelt). */
export type Primitiv =
  | { t: "linie"; x1: number; y1: number; x2: number; y2: number; dick?: boolean }
  | { t: "kreis"; cx: number; cy: number; r: number; voll?: boolean };

export interface Fenster {
  x: number;
  y: number;
  g: number; // Kantenlänge
}

export type Fehlerart = "entfernt" | "hinzugefuegt" | "verschoben" | "veraendert" | "rand" | "ausserhalb";

export interface Ausschnitt {
  fenster: Fenster;
  primitive: Primitiv[];
  fehler?: { art: Fehlerart; x: number; y: number }; // Ort relativ zum Fenster (0–1)
}

export interface MusterDaten {
  stil: "zellen" | "netz" | "punkte";
  groesse: number;
  primitive: Primitiv[];
  ausschnitte: Ausschnitt[];
}

export const MUSTER_GROESSE = 100;
const FENSTER = 38;

/* ------------------------------------------------------------------ Geometrie */

function clipLinie(l: Extract<Primitiv, { t: "linie" }>, f: Fenster): Extract<Primitiv, { t: "linie" }> | null {
  // Liang–Barsky
  let t0 = 0;
  let t1 = 1;
  const dx = l.x2 - l.x1;
  const dy = l.y2 - l.y1;
  const p = [-dx, dx, -dy, dy];
  const q = [l.x1 - f.x, f.x + f.g - l.x1, l.y1 - f.y, f.y + f.g - l.y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  if (t0 > t1) return null;
  return { ...l, x1: l.x1 + t0 * dx - f.x, y1: l.y1 + t0 * dy - f.y, x2: l.x1 + t1 * dx - f.x, y2: l.y1 + t1 * dy - f.y };
}

function kreisImFenster(k: Extract<Primitiv, { t: "kreis" }>, f: Fenster): boolean {
  return k.cx + k.r > f.x && k.cx - k.r < f.x + f.g && k.cy + k.r > f.y && k.cy - k.r < f.y + f.g;
}

/** Primitive auf ein Fenster zuschneiden (Koordinaten relativ zum Fenster). Kreise werden per clipPath abgeschnitten. */
export function zuschneiden(prim: Primitiv[], f: Fenster): Primitiv[] {
  const out: Primitiv[] = [];
  for (const p of prim) {
    if (p.t === "linie") {
      const c = clipLinie(p, f);
      if (c && Math.hypot(c.x2 - c.x1, c.y2 - c.y1) > 0.3) out.push(c);
    } else if (kreisImFenster(p, f)) out.push({ ...p, cx: p.cx - f.x, cy: p.cy - f.y });
  }
  return out;
}

/* ------------------------------------------------------------------ Muster erzeugen */

function zellenMuster(z: Zufall, s: number): Primitiv[] {
  const n = 5 + Math.min(3, s);
  const schritt = MUSTER_GROESSE / n;
  const pkt: Array<Array<[number, number]>> = [];
  for (let i = 0; i <= n; i++) {
    pkt.push([]);
    for (let j = 0; j <= n; j++) {
      const rand = i === 0 || j === 0 || i === n || j === n;
      const jx = rand && (i === 0 || i === n) ? 0 : z.bereich(-0.3, 0.3) * schritt;
      const jy = rand && (j === 0 || j === n) ? 0 : z.bereich(-0.3, 0.3) * schritt;
      pkt[i].push([Math.min(MUSTER_GROESSE, Math.max(0, i * schritt + jx)), Math.min(MUSTER_GROESSE, Math.max(0, j * schritt + jy))]);
    }
  }
  const out: Primitiv[] = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const [x, y] = pkt[i][j];
      if (i < n && !(j === 0 || j === n) ? z.chance(0.92) : i < n) out.push({ t: "linie", x1: x, y1: y, x2: pkt[i + 1][j][0], y2: pkt[i + 1][j][1] });
      if (j < n && !(i === 0 || i === n) ? z.chance(0.92) : j < n) out.push({ t: "linie", x1: x, y1: y, x2: pkt[i][j + 1][0], y2: pkt[i][j + 1][1] });
      if (i < n && j < n && z.chance(0.35)) {
        const diag = z.chance(0.5);
        out.push(diag ? { t: "linie", x1: x, y1: y, x2: pkt[i + 1][j + 1][0], y2: pkt[i + 1][j + 1][1] } : { t: "linie", x1: pkt[i + 1][j][0], y1: pkt[i + 1][j][1], x2: pkt[i][j + 1][0], y2: pkt[i][j + 1][1] });
      }
      if (i < n && j < n && z.chance(0.12 + s * 0.03)) {
        const cx = (x + pkt[i + 1][j + 1][0]) / 2;
        const cy = (y + pkt[i + 1][j + 1][1]) / 2;
        out.push({ t: "kreis", cx, cy, r: z.bereich(1.2, schritt * 0.22), voll: z.chance(0.3) });
      }
    }
  return out;
}

function netzMuster(z: Zufall, s: number): Primitiv[] {
  const out: Primitiv[] = [];
  const anzahl = 18 + s * 6;
  for (let i = 0; i < anzahl; i++) {
    const art = z.zahl();
    if (art < 0.55) {
      // lange Linie quer durchs Bild
      const winkel = z.bereich(0, Math.PI);
      const cx = z.bereich(10, 90);
      const cy = z.bereich(10, 90);
      const len = z.bereich(25, 90);
      out.push({ t: "linie", x1: cx - Math.cos(winkel) * len / 2, y1: cy - Math.sin(winkel) * len / 2, x2: cx + Math.cos(winkel) * len / 2, y2: cy + Math.sin(winkel) * len / 2, dick: z.chance(0.12) });
    } else if (art < 0.8) {
      const x = z.bereich(5, 85);
      const y = z.bereich(5, 85);
      const w = z.bereich(6, 25);
      const h = z.bereich(6, 25);
      out.push({ t: "linie", x1: x, y1: y, x2: x + w, y2: y }, { t: "linie", x1: x + w, y1: y, x2: x + w, y2: y + h }, { t: "linie", x1: x + w, y1: y + h, x2: x, y2: y + h }, { t: "linie", x1: x, y1: y + h, x2: x, y2: y });
    } else {
      out.push({ t: "kreis", cx: z.bereich(8, 92), cy: z.bereich(8, 92), r: z.bereich(2, 9), voll: z.chance(0.2) });
    }
  }
  return out.map((p) =>
    p.t === "linie"
      ? { ...p, x1: Math.max(0, Math.min(100, p.x1)), y1: Math.max(0, Math.min(100, p.y1)), x2: Math.max(0, Math.min(100, p.x2)), y2: Math.max(0, Math.min(100, p.y2)) }
      : p,
  );
}

function punkteMuster(z: Zufall, s: number): Primitiv[] {
  const out: Primitiv[] = [];
  // Ketten aus Punkten wie im offiziellen Beispiel 2
  for (let k = 0; k < 4 + s; k++) {
    let x = z.bereich(5, 95);
    let y = z.bereich(5, 95);
    let w = z.bereich(0, Math.PI * 2);
    for (let i = 0; i < 6 + z.ganz(0, 6); i++) {
      out.push({ t: "kreis", cx: x, cy: y, r: z.bereich(1.3, 2.2), voll: true });
      const nx = x + Math.cos(w) * 5;
      const ny = y + Math.sin(w) * 5;
      if (nx < 3 || nx > 97 || ny < 3 || ny > 97) break;
      out.push({ t: "linie", x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
      w += z.bereich(-0.5, 0.5);
    }
  }
  // geschwungene Begrenzungslinien
  for (let k = 0; k < 3 + s; k++) {
    let x = z.bereich(0, 100);
    let y = z.bereich(0, 100);
    let w = z.bereich(0, Math.PI * 2);
    for (let i = 0; i < 10; i++) {
      const nx = x + Math.cos(w) * 7;
      const ny = y + Math.sin(w) * 7;
      if (nx < 0 || nx > 100 || ny < 0 || ny > 100) break;
      out.push({ t: "linie", x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
      w += z.bereich(-0.6, 0.6);
    }
  }
  for (let i = 0; i < 25 + s * 8; i++) out.push({ t: "kreis", cx: z.bereich(1, 99), cy: z.bereich(1, 99), r: 0.6, voll: true });
  return out;
}

/* ------------------------------------------------------------------ Fehler einbauen */

function laenge(p: Primitiv) {
  return p.t === "linie" ? Math.hypot(p.x2 - p.x1, p.y2 - p.y1) : p.r * 2;
}

function mitte(p: Primitiv): [number, number] {
  return p.t === "linie" ? [(p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2] : [p.cx, p.cy];
}

function innen(p: Primitiv, g: number, rand = 4) {
  const [x, y] = mitte(p);
  return x > rand && x < g - rand && y > rand && y < g - rand;
}

function fehlerEinbauen(basis: Primitiv[], art: Fehlerart, z: Zufall, g: number): { prim: Primitiv[]; ort: [number, number] } | null {
  const kandidaten = basis.map((p, i) => ({ p, i })).filter(({ p }) => laenge(p) > 4 && innen(p, g, 5));
  if (art === "rand") {
    const seite = z.ganz(0, 3);
    const a = z.bereich(3, g * 0.4);
    const b = a + z.bereich(g * 0.3, g * 0.55);
    const d = 1.2;
    const l: Primitiv =
      seite === 0 ? { t: "linie", x1: a, y1: d, x2: b, y2: d } : seite === 1 ? { t: "linie", x1: g - d, y1: a, x2: g - d, y2: b } : seite === 2 ? { t: "linie", x1: a, y1: g - d, x2: b, y2: g - d } : { t: "linie", x1: d, y1: a, x2: d, y2: b };
    return { prim: [...basis, l], ort: mitte(l) };
  }
  if (art === "hinzugefuegt") {
    for (let v = 0; v < 30; v++) {
      const x = z.bereich(6, g - 12);
      const y = z.bereich(6, g - 12);
      const w = z.bereich(0, Math.PI);
      const len = z.bereich(6, 11);
      const neu: Primitiv = z.chance(0.75) ? { t: "linie", x1: x, y1: y, x2: x + Math.cos(w) * len, y2: y + Math.sin(w) * len } : { t: "kreis", cx: x, cy: y, r: z.bereich(1.5, 3) };
      const [mx, my] = mitte(neu);
      if (basis.every((p) => Math.hypot(mitte(p)[0] - mx, mitte(p)[1] - my) > 4)) return { prim: [...basis, neu], ort: [mx, my] };
    }
    return null;
  }
  if (!kandidaten.length) return null;
  const { p, i } = z.waehle(kandidaten);
  const rest = basis.filter((_, j) => j !== i);
  if (art === "entfernt") return { prim: rest, ort: mitte(p) };
  if (art === "verschoben") {
    const dx = z.waehle([-1, 1]) * z.bereich(2.5, 4.5);
    const dy = z.waehle([-1, 1]) * z.bereich(2.5, 4.5);
    const neu: Primitiv = p.t === "linie" ? { ...p, x1: p.x1 + dx, y1: p.y1 + dy, x2: p.x2 + dx, y2: p.y2 + dy } : { ...p, cx: p.cx + dx, cy: p.cy + dy };
    return { prim: [...rest, neu], ort: mitte(neu) };
  }
  // verändert: Linie um die Mitte drehen bzw. Kreis vergrössern
  if (p.t === "linie") {
    const [mx, my] = mitte(p);
    const w = Math.atan2(p.y2 - p.y1, p.x2 - p.x1) + z.waehle([-1, 1]) * z.bereich(0.35, 0.6);
    const h = laenge(p) / 2;
    return { prim: [...rest, { ...p, x1: mx - Math.cos(w) * h, y1: my - Math.sin(w) * h, x2: mx + Math.cos(w) * h, y2: my + Math.sin(w) * h }], ort: [mx, my] };
  }
  return { prim: [...rest, { ...p, r: p.r * z.bereich(1.6, 2.2), voll: !p.voll }], ort: [p.cx, p.cy] };
}

const FEHLER_TEXT: Record<Fehlerart, string> = {
  entfernt: "Ein Element fehlt – nur auf Vorhandenes geachtet.",
  hinzugefuegt: "Ein zusätzliches Element übersehen.",
  verschoben: "Ein leicht verschobenes Element nicht bemerkt.",
  veraendert: "Ein gedrehtes oder verändertes Element übersehen.",
  rand: "Den Rand nicht geprüft – dort werden Fehler leicht übersehen.",
  ausserhalb: "Der Ausschnitt liegt teilweise ausserhalb des Musters.",
};

const BEREICH = (x: number, y: number) => `${y < 1 / 3 ? "oben" : y > 2 / 3 ? "unten" : "Mitte"}${x < 1 / 3 ? " links" : x > 2 / 3 ? " rechts" : ""}`.replace("Mitte ", "mittig ").replace(/^Mitte$/, "Mitte");

/** Schritt-Nummern je Methode: Grundverfahren (3 Schritte) oder Kreuzblick (7 Schritte) */
function schritte(methodeId: string) {
  return methodeId === "kreuzblick"
    ? { grob: 2, suchen: 5, rand: 5, alle: 7, markieren: 7 }
    : { grob: 1, suchen: 2, rand: 2, alle: 2, markieren: 3 };
}

/* ------------------------------------------------------------------ Generator */

export const musterGenerator: EinzelGenerator<MusterDaten> = {
  id: "muster",
  erzeugen(seed, schwierigkeit, methodeId = "muster-grundverfahren") {
    const st = schritte(methodeId);
    for (let versuch = 0; versuch < 30; versuch++) {
      const z = new Zufall(`muster:${seed}:${schwierigkeit}:${versuch}`);
      const stil = z.waehle(["zellen", "netz", "punkte"] as const);
      const primitive = stil === "zellen" ? zellenMuster(z, schwierigkeit) : stil === "netz" ? netzMuster(z, schwierigkeit) : punkteMuster(z, schwierigkeit);
      const g = FENSTER;
      const richtigesFenster: Fenster = { x: z.ganz(2, 100 - g - 2), y: z.ganz(2, 100 - g - 2), g };
      const basis = zuschneiden(primitive, richtigesFenster);
      if (basis.length < 10) continue;
      // Fehlerarten: schwer = kleine Fehler am gleichen Ort; leicht = auch grobe (anderer Ort, ausserhalb)
      const arten: Fehlerart[] = z.mischen(["entfernt", "hinzugefuegt", "verschoben", "veraendert", "rand"] as Fehlerart[]).slice(0, 4);
      if (schwierigkeit <= 2) arten[3] = "ausserhalb";
      const falsche: Ausschnitt[] = [];
      let ok = true;
      for (const art of arten) {
        if (art === "ausserhalb") {
          const f: Fenster = { x: z.chance(0.5) ? -Math.round(g * 0.3) : 100 - Math.round(g * 0.7), y: z.ganz(5, 100 - g - 5), g };
          const prim = zuschneiden(primitive, f).filter((p) => (p.t === "linie" ? Math.min(p.x1, p.x2) >= Math.max(0, -f.x) - 0.01 : true));
          // sichtbar machen: die «Aussenseite» füllt sich mit erfundenen Linien
          const aussenVon = f.x < 0 ? 1 : 100 - f.x + 1;
          const aussenBis = f.x < 0 ? -f.x - 1 : g - 1;
          const extra: Primitiv[] = [{ t: "linie", x1: aussenVon, y1: z.bereich(4, g - 4), x2: aussenBis, y2: z.bereich(4, g - 4) }];
          falsche.push({ fenster: f, primitive: [...prim, ...extra], fehler: { art, x: f.x < 0 ? 0.15 : 0.85, y: 0.5 } });
          continue;
        }
        // Gleicher Ort (schwer) oder anderer Ort (leichter)
        const gleicherOrt = schwierigkeit >= 3 ? z.chance(0.8) : z.chance(0.4);
        const f: Fenster = gleicherOrt ? richtigesFenster : { x: z.ganz(2, 100 - g - 2), y: z.ganz(2, 100 - g - 2), g };
        const vorlage = zuschneiden(primitive, f);
        if (vorlage.length < 10) {
          ok = false;
          break;
        }
        let r: ReturnType<typeof fehlerEinbauen> = null;
        for (let v = 0; v < 8 && !r; v++) {
          const kandidat = fehlerEinbauen(vorlage, art, z.ableiten(`${art}:${v}`), g);
          // Nur sichtbare Fehler zählen (z. B. keine Linie entfernen, die auf einer anderen liegt)
          if (kandidat && ausschnittUnterschied(kandidat.prim, vorlage, g) >= 14) r = kandidat;
        }
        if (!r) {
          ok = false;
          break;
        }
        const kandidat: Ausschnitt = { fenster: f, primitive: r.prim, fehler: { art, x: r.ort[0] / g, y: r.ort[1] / g } };
        if (nahUnterschied(primitive, kandidat) < 10) {
          ok = false;
          break;
        }
        falsche.push(kandidat);
      }
      if (!ok) continue;
      const richtig: Ausschnitt = { fenster: richtigesFenster, primitive: basis };
      const gemischt = z.mischen([richtig, ...falsche]);
      const loesung = gemischt.indexOf(richtig);
      const optionen: Option[] = gemischt.map((a) => (a === richtig ? { text: "deckungsgleich" } : { text: `Fehler: ${a.fehler!.art}`, denkfehler: FEHLER_TEXT[a.fehler!.art], schritt: a.fehler!.art === "ausserhalb" ? st.grob : a.fehler!.art === "rand" ? st.rand : st.suchen }));
      // Optionstexte eindeutig halten (Grundprüfung), Anzeige erfolgt grafisch
      optionen.forEach((o, i) => (o.text = `${o.text} (${"ABCDE"[i]})`));
      const B = (i: number) => "ABCDE"[i];
      const grobIdx = gemischt.findIndex((a) => a.fehler?.art === "ausserhalb" || (a.fehler && a.fenster !== richtigesFenster));
      const fehlerBeispiel = gemischt.findIndex((a) => a.fehler && a.fehler.art !== "ausserhalb");
      const fb = gemischt[fehlerBeispiel];
      const bereiche = ["oben links", "oben rechts", "unten links", "unten rechts", "Mitte"];
      const richtigerBereich = (() => {
        const b = BEREICH(fb.fehler!.x, fb.fehler!.y);
        return bereiche.includes(b) ? b : b.startsWith("oben") ? (fb.fehler!.x < 0.5 ? "oben links" : "oben rechts") : b.startsWith("unten") ? (fb.fehler!.x < 0.5 ? "unten links" : "unten rechts") : "Mitte";
      })();
      const drills: SchrittDrill[] = [];
      if (grobIdx >= 0)
        drills.push({
          schritt: st.grob,
          frage: "Grober Blick: Welcher Ausschnitt fällt sofort weg?",
          optionen: gemischt.map((_, i) => B(i)),
          loesung: grobIdx,
          erklaerung: `${B(grobIdx)}: ${FEHLER_TEXT[gemischt[grobIdx].fehler!.art]}${gemischt[grobIdx].fehler!.art !== "ausserhalb" ? " (anderer Ort im Muster)" : ""}`,
        });
      drills.push({
        schritt: st.suchen,
        frage: `Fehlersuche: Wo liegt der Fehler in Ausschnitt ${B(fehlerBeispiel)}?`,
        optionen: bereiche,
        loesung: bereiche.indexOf(richtigerBereich),
        erklaerung: `${B(fehlerBeispiel)}: ${FEHLER_TEXT[fb.fehler!.art]} (${richtigerBereich}).`,
      });
      drills.push(
        methodeId === "kreuzblick"
          ? { schritt: st.alle, frage: "Du hast einen passenden Ausschnitt gefunden. Was jetzt?", optionen: ["Trotzdem alle Ausschnitte prüfen", "Sofort ankreuzen, die anderen ignorieren"], loesung: 0, erklaerung: "Nicht beim ersten passenden aufhören – alle prüfen (Flüchtigkeitsfehler vermeiden)." }
          : { schritt: st.markieren, frage: "Du hast in einem Ausschnitt einen Fehler gefunden. Was tust du?", optionen: ["Ihn mit dem Bleistift durchstreichen und nicht mehr prüfen", "Weiter vergleichen, um sicher zu sein", "Nichts – gleich zum nächsten Muster"], loesung: 0, erklaerung: "Fehler im Ausschnitt durchstreichen, damit du ihn nicht erneut prüfst (NCWiki)." },
      );
      return {
        generator: "muster",
        seed,
        schwierigkeit,
        gruppe: "muster-zuordnen",
        methodeId,
        frage: "Welcher Ausschnitt ist deckungsgleich mit einem Teil des Musters?",
        daten: { stil, groesse: MUSTER_GROESSE, primitive, ausschnitte: gemischt },
        optionen,
        loesung,
        loesungsweg: [
          { schritt: st.grob, text: grobIdx >= 0 ? `Grober Blick: ${B(grobIdx)} fällt sofort weg (${FEHLER_TEXT[gemischt[grobIdx].fehler!.art]}).` : "Grober Blick: Alle Ausschnitte wirken plausibel – genau prüfen." },
          ...gemischt
            .map((a, i) => ({ a, i }))
            .filter(({ a }) => a.fehler && a.fehler.art !== "ausserhalb")
            .map(({ a, i }) => ({ schritt: a.fehler!.art === "rand" ? st.rand : st.suchen, text: `${B(i)}: ${FEHLER_TEXT[a.fehler!.art]} (${BEREICH(a.fehler!.x, a.fehler!.y)}).` })),
          { schritt: st.markieren, text: `Übrig bleibt ${B(loesung)} – deckungsgleich mit dem Muster.` },
        ],
        drills,
        zielSekunden: 53,
      };
    }
    throw new Error(`Muster: keine Aufgabe für Seed ${seed}`);
  },
  pruefen(a) {
    const p = grundpruefung(a);
    const r = a.daten.ausschnitte[a.loesung];
    if (r.fehler) p.push("richtiger Ausschnitt hat einen Fehler");
    a.daten.ausschnitte.forEach((x, i) => {
      if (i !== a.loesung && !x.fehler) p.push(`Ausschnitt ${i} ohne Fehler`);
      if (x.fenster.g !== r.fenster.g) p.push("Ausschnitte unterschiedlich gross");
    });
    return p;
  },
};

/* ------------------------------------------------------------------ Raster-Prüfung (Tests) */

/** Primitive in ein Graustufenraster zeichnen (für die Eindeutigkeitsprüfung in Tests). */
export function rastern(prim: Primitiv[], breite: number, hoehe: number, skala: number, dicke = 1.1): Uint8Array {
  const bild = new Uint8Array(breite * hoehe);
  const setze = (x: number, y: number) => {
    const r = Math.ceil(dicke);
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && py >= 0 && px < breite && py < hoehe && dx * dx + dy * dy <= dicke * dicke) bild[py * breite + px] = 1;
      }
  };
  for (const p of prim) {
    if (p.t === "linie") {
      const n = Math.max(2, Math.ceil(Math.hypot(p.x2 - p.x1, p.y2 - p.y1) * skala * 2));
      for (let i = 0; i <= n; i++) setze((p.x1 + ((p.x2 - p.x1) * i) / n) * skala, (p.y1 + ((p.y2 - p.y1) * i) / n) * skala);
    } else {
      const n = Math.max(8, Math.ceil(p.r * skala * 7));
      for (let i = 0; i < n; i++) setze((p.cx + Math.cos((i / n) * Math.PI * 2) * p.r) * skala, (p.cy + Math.sin((i / n) * Math.PI * 2) * p.r) * skala);
      if (p.voll) for (let rr = 0; rr < p.r; rr += 0.5 / skala) for (let i = 0; i < n; i++) setze((p.cx + Math.cos((i / n) * Math.PI * 2) * rr) * skala, (p.cy + Math.sin((i / n) * Math.PI * 2) * rr) * skala);
    }
  }
  return bild;
}

/** Pixel, die im einen Bild gesetzt sind und im anderen nicht einmal in der Nachbarschaft (1 px) – robust gegen Rundung. */
export function toleranterUnterschied(a: Uint8Array, b: Uint8Array, w: number, h: number, ax = 0, ay = 0, aw = w, grenze = Infinity): number {
  let d = 0;
  const A = (x: number, y: number) => a[(ay + y) * aw + ax + x];
  const nahA = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && A(xx, yy)) return true;
    }
    return false;
  };
  const nahB = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && b[yy * w + xx]) return true;
    }
    return false;
  };
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (b[y * w + x] && !nahA(x, y)) d++;
      else if (A(x, y) && !nahB(x, y)) d++;
    }
    if (d >= grenze) return d;
  }
  return d;
}

/** Sichtbarer Unterschied zweier Ausschnitte gleicher Grösse */
export function ausschnittUnterschied(p1: Primitiv[], p2: Primitiv[], g: number, skala = 2): number {
  const G = Math.round(g * skala);
  return toleranterUnterschied(rastern(p1, G, G, skala), rastern(p2, G, G, skala), G, G);
}

/** Kleinster Unterschied in der Nachbarschaft des eigenen Fensters (fängt «verschobenes Fenster» ab). */
export function nahUnterschied(primitive: Primitiv[], a: Ausschnitt, radius = 6, skala = 2): number {
  const R = Math.round(radius * skala);
  const G = Math.round(a.fenster.g * skala);
  const breite = G + 2 * R;
  const umgebung: Fenster = { x: a.fenster.x - radius, y: a.fenster.y - radius, g: a.fenster.g + 2 * radius };
  const bild = rastern(zuschneiden(primitive, umgebung), breite, breite, skala);
  const aus = rastern(a.primitive, G, G, skala);
  let min = Infinity;
  for (let oy = 0; oy <= 2 * R; oy++)
    for (let ox = 0; ox <= 2 * R; ox++) {
      min = Math.min(min, toleranterUnterschied(bild, aus, G, G, ox, oy, breite, min));
      if (min === 0) return 0;
    }
  return min;
}

/** Kleinster Pixel-Unterschied eines Ausschnitts zu allen Positionen im Muster */
export function minimalerUnterschied(daten: MusterDaten, a: Ausschnitt, skala = 2): number {
  const B = Math.round(daten.groesse * skala);
  const G = Math.round(a.fenster.g * skala);
  const muster = rastern(daten.primitive, B, B, skala);
  const aus = rastern(a.primitive, G, G, skala);
  let min = Infinity;
  for (let oy = 0; oy <= B - G; oy++)
    for (let ox = 0; ox <= B - G; ox++) {
      const d = toleranterUnterschied(muster, aus, G, G, ox, oy, B, min);
      if (d < min) min = d;
      if (min === 0) return 0;
    }
  return min;
}
