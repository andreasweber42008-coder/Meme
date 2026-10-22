import { Zufall } from "@/lib/zufall";
import { grundpruefung, type EinzelGenerator, type Option, type SchrittDrill } from "./typen";

/**
 * Objekte im Raum – Bewegungen exakt wie in den Beispielaufgaben 2026:
 *  → horizontal 90° nach rechts drehen: die linke Fläche kommt nach vorne
 *  ← horizontal 90° nach links drehen:  die rechte Fläche kommt nach vorne
 *  ↓ vertikal 90° nach unten kippen:    die obere Fläche kommt nach vorne
 *  ↑ vertikal 90° nach oben kippen:     die untere Fläche kommt nach vorne
 * Koordinaten: x nach rechts, y nach oben, z zum Betrachter (vorne). Bewegungen um feste Achsen des Betrachters.
 */
export type Bewegung = "→" | "←" | "↑" | "↓";
export type Paar = [Bewegung, Bewegung];
export type Matrix = [number, number, number, number, number, number, number, number, number];

export const BEWEGUNGEN: Record<Bewegung, Matrix> = {
  "→": [0, 0, 1, 0, 1, 0, -1, 0, 0], // R_y(+90°): x' = z, z' = −x
  "←": [0, 0, -1, 0, 1, 0, 1, 0, 0], // R_y(−90°)
  "↓": [1, 0, 0, 0, 0, -1, 0, 1, 0], // R_x(+90°): y' = −z, z' = y
  "↑": [1, 0, 0, 0, 0, 1, 0, -1, 0], // R_x(−90°)
};

export const BEWEGUNG_TEXT: Record<Bewegung, string> = {
  "→": "nach rechts drehen",
  "←": "nach links drehen",
  "↓": "nach unten kippen",
  "↑": "nach oben kippen",
};

export function mal(a: Matrix, b: Matrix): Matrix {
  const r = new Array(9).fill(0) as Matrix;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

export function anwenden(m: Matrix, v: [number, number, number]): [number, number, number] {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

export const EINHEIT: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Erst die erste, dann die zweite Bewegung (beide um die Achsen des Betrachters). */
export function paarMatrix([a, b]: Paar): Matrix {
  return mal(BEWEGUNGEN[b], BEWEGUNGEN[a]);
}

const GEGENTEIL: Record<Bewegung, Bewegung> = { "→": "←", "←": "→", "↑": "↓", "↓": "↑" };
const dreh = (b: Bewegung) => b === "→" || b === "←";

/** Alle 12 möglichen Paare (ohne Hin-und-zurück) */
export const ALLE_PAARE: Paar[] = (["→", "←", "↑", "↓"] as Bewegung[]).flatMap((a) =>
  (["→", "←", "↑", "↓"] as Bewegung[]).filter((b) => b !== GEGENTEIL[a]).map((b) => [a, b] as Paar),
);

export const paarText = (p: Paar) => `${p[0]}, ${p[1]}`;
const gleich = (a: Matrix, b: Matrix) => a.every((x, i) => x === b[i]);
export const istSpiegelPaar = (p: Paar) => p[0] === p[1];

/* ------------------------------------------------------------------ Szene */

export type Form = "kugel" | "wuerfel" | "zylinder" | "kegel" | "torus" | "kapsel" | "stab" | "pyramide" | "winkel";
export type Material = "matt" | "glas" | "metall" | "noppen" | "dunkel";

export interface Objekt {
  form: Form;
  material: Material;
  position: [number, number, number];
  groesse: number;
  /** Eigene Drehung (Euler in Radiant) – macht Formen unsymmetrisch */
  drehung: [number, number, number];
  farbe: string;
  name: string;
}

export interface ObjekteDaten {
  objekte: Objekt[];
  paare: Paar[];
  ziel: Matrix;
  referenz: number;
}

const FORMEN: Array<{ form: Form; name: string }> = [
  { form: "kugel", name: "Kugel" },
  { form: "wuerfel", name: "Würfel" },
  { form: "zylinder", name: "Zylinder" },
  { form: "kegel", name: "Kegel" },
  { form: "torus", name: "Ring" },
  { form: "kapsel", name: "Kapsel" },
  { form: "stab", name: "Stab" },
  { form: "pyramide", name: "Pyramide" },
  { form: "winkel", name: "Winkel" },
];
const MATERIALIEN: Material[] = ["matt", "glas", "metall", "noppen", "dunkel"];
const FARBEN = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f59f00", "#e03131"];
const FARBNAMEN: Record<string, string> = { "#e8590c": "orange", "#1c7ed6": "blaue", "#2f9e44": "grüne", "#ae3ec9": "violette", "#f59f00": "gelbe", "#e03131": "rote" };

function region([x, y, z]: [number, number, number]): string {
  return `${z >= 0 ? "vorne" : "hinten"} ${y >= 0 ? "oben" : "unten"} ${x >= 0 ? "rechts" : "links"}`;
}

function rund(v: number) {
  return Math.round(v * 100);
}

/** Ist die Szene unter der Drehung q (bis auf Rundung) unverändert? Dann wären zwei Antworten gleich. */
export function invariant(objekte: Objekt[], q: Matrix): boolean {
  const schluessel = (o: Objekt, p: [number, number, number]) => `${o.form}|${o.material}|${o.groesse.toFixed(2)}|${p.map(rund).join(",")}`;
  const vorher = new Set(objekte.map((o) => schluessel(o, o.position)));
  return objekte.every((o) => vorher.has(schluessel(o, anwenden(q, o.position))));
}

function transponiert(m: Matrix): Matrix {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/* ------------------------------------------------------------------ Distraktoren */

function denkfehlerFuer(falsch: Paar, richtig: Paar): { text: string; schritt: number } {
  if (falsch[0] === richtig[1] && falsch[1] === richtig[0]) return { text: "Reihenfolge der Bewegungen vertauscht – die Reihenfolge zählt.", schritt: 3 };
  if (istSpiegelPaar(richtig) && istSpiegelPaar(falsch)) return { text: "Spiegelachse verwechselt: senkrecht (→→) vs. waagrecht (↑↑).", schritt: 1 };
  if (istSpiegelPaar(richtig) !== istSpiegelPaar(falsch)) return { text: "Spiegel-Check übersprungen oder falsch eingeschätzt.", schritt: 1 };
  if (falsch[0] === richtig[0]) return { text: "Erste Bewegung richtig, die zweite nicht zu Ende gedacht.", schritt: 3 };
  if (falsch[0] === GEGENTEIL[richtig[0]] || falsch[1] === GEGENTEIL[richtig[1]]) return { text: "Richtung verwechselt (rechts/links bzw. oben/unten).", schritt: 3 };
  if (dreh(falsch[0]) !== dreh(richtig[0])) return { text: "Drehen und Kippen verwechselt.", schritt: 2 };
  return { text: "Nicht konsequent ausgeschlossen – ein Merkmal passt nicht.", schritt: 2 };
}

/** Distraktoren nach Schwierigkeit: schwer = typische Fallen (Reihenfolge, Spiegelachse, Richtung). */
function distraktorenWaehlen(richtig: Paar, z: Zufall, schwierigkeit: number): Paar[] {
  const zm = paarMatrix(richtig);
  const kandidaten = ALLE_PAARE.filter((p) => !gleich(paarMatrix(p), zm));
  const gewicht = (p: Paar) => {
    const f = denkfehlerFuer(p, richtig).text;
    const falle = f.startsWith("Reihenfolge") || f.startsWith("Spiegelachse") || f.startsWith("Richtung") || f.startsWith("Erste");
    return falle ? schwierigkeit : 6 - schwierigkeit;
  };
  const gewaehlt: Paar[] = [];
  const pool = [...kandidaten];
  while (gewaehlt.length < 4 && pool.length) {
    const summe = pool.reduce((s, p) => s + gewicht(p), 0);
    let r = z.zahl() * summe;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= gewicht(pool[idx]);
      if (r <= 0) break;
    }
    const p = pool.splice(idx, 1)[0];
    // keine zwei gleichwertigen Paare (→→ und ←← führen zur selben Lage)
    if (gewaehlt.some((g) => gleich(paarMatrix(g), paarMatrix(p)))) continue;
    gewaehlt.push(p);
  }
  return gewaehlt;
}

/* ------------------------------------------------------------------ Generator */

function szeneErzeugen(z: Zufall, schwierigkeit: number): Objekt[] {
  const anzahl = Math.min(5, 2 + Math.floor(schwierigkeit / 2) + (z.chance(0.4) ? 1 : 0));
  const formen = z.stichprobe(FORMEN, anzahl);
  const farben = z.stichprobe(FARBEN, anzahl);
  const objekte: Objekt[] = [];
  let versuche = 0;
  while (objekte.length < anzahl && versuche++ < 400) {
    const groesse = Number(z.bereich(0.22, schwierigkeit >= 4 ? 0.36 : 0.44).toFixed(2));
    const grenze = 0.92 - groesse;
    const p: [number, number, number] = [z.bereich(-grenze, grenze), z.bereich(-grenze, grenze), z.bereich(-grenze, grenze)].map((v) => Number(v.toFixed(2))) as [number, number, number];
    // nicht in der Mitte, nicht überlappend
    if (Math.hypot(...p) < 0.3) continue;
    if (objekte.some((o) => Math.hypot(o.position[0] - p[0], o.position[1] - p[1], o.position[2] - p[2]) < o.groesse + groesse + 0.08)) continue;
    const f = formen[objekte.length];
    objekte.push({
      form: f.form,
      name: f.name,
      material: z.waehle(MATERIALIEN),
      position: p,
      groesse,
      drehung: [z.bereich(0, Math.PI), z.bereich(0, Math.PI), z.bereich(0, Math.PI)].map((v) => Number(v.toFixed(2))) as [number, number, number],
      farbe: farben[objekte.length],
    });
  }
  return objekte;
}

function drillsErzeugen(richtig: Paar, distraktoren: Paar[], objekte: Objekt[], referenz: number, z: Zufall): SchrittDrill[] {
  const ref = objekte[referenz];
  const refName = `die ${FARBNAMEN[ref.farbe] ?? ""} ${ref.name}`.replace("  ", " ");
  const spiegelOptionen = ["Ja: an der senkrechten Achse gespiegelt (→→ = ←←)", "Ja: an der waagrechten Achse gespiegelt (↑↑ = ↓↓)", "Nein: gemischte Bewegung"];
  const spiegelLoesung = istSpiegelPaar(richtig) ? (dreh(richtig[0]) ? 0 : 1) : 2;
  const weit = distraktoren.find((d) => !denkfehlerFuer(d, richtig).text.startsWith("Reihenfolge")) ?? distraktoren[0];
  const zweier = z.mischen([paarText(richtig), paarText(weit)]);
  const nach1 = anwenden(BEWEGUNGEN[richtig[0]], ref.position);
  const regionen = new Set<string>([region(nach1)]);
  const alle = ["vorne oben rechts", "vorne oben links", "vorne unten rechts", "vorne unten links", "hinten oben rechts", "hinten oben links", "hinten unten rechts", "hinten unten links"];
  for (const r of z.mischen(alle)) if (regionen.size < 4) regionen.add(r);
  const regionOptionen = z.mischen([...regionen]);
  return [
    {
      schritt: 1,
      frage: "Spiegel-Check: Lässt sich die Silhouette rechts ungefähr spiegeln?",
      optionen: spiegelOptionen,
      loesung: spiegelLoesung,
      erklaerung: istSpiegelPaar(richtig)
        ? `Ja – zwei gleiche Bewegungen (${paarText(richtig)}) wirken wie eine Spiegelung ${dreh(richtig[0]) ? "an der senkrechten" : "an der waagrechten"} Achse.`
        : "Nein – hier sind zwei verschiedene Bewegungen kombiniert. Weiter mit Ausschliessen.",
    },
    {
      schritt: 2,
      frage: "Ausschliessen: Welches dieser beiden Paare passt sicher nicht?",
      optionen: zweier,
      loesung: zweier.indexOf(paarText(weit)),
      erklaerung: `${paarText(weit)} passt nicht: ${denkfehlerFuer(weit, richtig).text}`,
    },
    {
      schritt: 3,
      frage: `Merkmal-Check: Wo liegt ${refName} nach der ersten Bewegung (${richtig[0]} ${BEWEGUNG_TEXT[richtig[0]]})?`,
      optionen: regionOptionen,
      loesung: regionOptionen.indexOf(region(nach1)),
      erklaerung: `Nach ${richtig[0]} liegt ${refName} ${region(nach1)}; nach ${richtig[1]} dann ${region(anwenden(paarMatrix(richtig), ref.position))} – wie im rechten Bild.`,
    },
    {
      schritt: 4,
      frage: "Du bist dir nach dem Merkmal-Check sicher. Was tust du?",
      optionen: ["Sofort ankreuzen und weiter", "Zur Sicherheit alle Möglichkeiten nochmals prüfen"],
      loesung: 0,
      erklaerung: "Bist du sicher, kreuzt du sofort an – keine Zeit mit den restlichen Möglichkeiten verschwenden (NCWiki).",
    },
  ];
}

export const objekteGenerator: EinzelGenerator<ObjekteDaten> = {
  id: "objekte",
  erzeugen(seed, schwierigkeit, methodeId = "objekte-im-raum") {
    for (let versuch = 0; versuch < 50; versuch++) {
      const z = new Zufall(`objekte:${seed}:${schwierigkeit}:${versuch}`);
      const objekte = szeneErzeugen(z, schwierigkeit);
      if (objekte.length < 2) continue;
      // Spiegelpaare seltener, sonst wäre Schritt 1 zu oft die Lösung
      const richtig = z.chance(0.18) ? z.waehle(ALLE_PAARE.filter(istSpiegelPaar)) : z.waehle(ALLE_PAARE.filter((p) => !istSpiegelPaar(p)));
      const distraktoren = distraktorenWaehlen(richtig, z, schwierigkeit);
      if (distraktoren.length < 4) continue;
      const ziel = paarMatrix(richtig);
      // Mehrdeutigkeit: Szene darf unter keiner «Differenz-Drehung» gleich aussehen
      if (distraktoren.some((d) => invariant(objekte, mal(transponiert(paarMatrix(d)), ziel)))) continue;
      const referenz = objekte.reduce((best, o, i) => (o.groesse > objekte[best].groesse ? i : best), 0);
      const richtigeOption: Option = { text: paarText(richtig) };
      const falsche: Option[] = distraktoren.map((d) => {
        const f = denkfehlerFuer(d, richtig);
        return { text: paarText(d), denkfehler: f.text, schritt: f.schritt };
      });
      const gemischt = z.mischen([richtigeOption, ...falsche]);
      const paare = gemischt.map((o) => o.text.split(", ") as Paar);
      const ref = objekte[referenz];
      const loesungsweg = [
        {
          schritt: 1,
          text: istSpiegelPaar(richtig)
            ? `Spiegel-Check: Die Silhouette ist ${dreh(richtig[0]) ? "an der senkrechten" : "an der waagrechten"} Achse gespiegelt → ${dreh(richtig[0]) ? "→→ (= ←←)" : "↑↑ (= ↓↓)"}.`
            : "Spiegel-Check: keine Spiegelung – also zwei verschiedene Bewegungen.",
        },
        { schritt: 2, text: `Ausschliessen: ${falsche.map((f) => `${f.text} (${f.denkfehler})`).join("; ")}` },
        {
          schritt: 3,
          text: `Merkmal-Check mit der ${FARBNAMEN[ref.farbe] ?? ""} ${ref.name}: Start ${region(ref.position)} → nach ${richtig[0]} ${region(anwenden(BEWEGUNGEN[richtig[0]], ref.position))} → nach ${richtig[1]} ${region(anwenden(ziel, ref.position))}.`,
        },
        { schritt: 4, text: `Ankreuzen: ${paarText(richtig)} – erst ${BEWEGUNG_TEXT[richtig[0]]}, dann ${BEWEGUNG_TEXT[richtig[1]]}.` },
      ];
      return {
        generator: "objekte",
        seed,
        schwierigkeit,
        gruppe: "objekte-im-raum",
        methodeId,
        frage: "Wie wurde der Würfel gedreht bzw. gekippt?",
        daten: { objekte, paare, ziel, referenz },
        optionen: gemischt,
        loesung: gemischt.indexOf(richtigeOption),
        loesungsweg,
        drills: drillsErzeugen(richtig, distraktoren, objekte, referenz, z),
        zielSekunden: 33,
      };
    }
    throw new Error(`Objekte im Raum: keine eindeutige Aufgabe für Seed ${seed}`);
  },
  pruefen(a) {
    const p = grundpruefung(a);
    const { objekte, paare, ziel } = a.daten;
    const matrizen = paare.map(paarMatrix);
    if (!gleich(matrizen[a.loesung], ziel)) p.push("richtige Option erzeugt nicht das Zielbild");
    matrizen.forEach((m, i) => {
      if (i !== a.loesung && gleich(m, ziel)) p.push(`Option ${i} führt zur selben Lage`);
      if (i !== a.loesung && invariant(objekte, mal(transponiert(m), ziel))) p.push(`Option ${i} sieht wegen Symmetrie gleich aus`);
    });
    for (let i = 0; i < matrizen.length; i++) for (let j = i + 1; j < matrizen.length; j++) if (gleich(matrizen[i], matrizen[j])) p.push(`Optionen ${i}/${j} gleichwertig`);
    for (const o of objekte) if (o.position.some((v) => Math.abs(v) + o.groesse > 1)) p.push(`${o.name} ragt aus dem Würfel`);
    return p;
  },
};
