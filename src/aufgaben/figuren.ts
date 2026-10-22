import { Zufall } from "@/lib/zufall";

/** Figuren lernen: Figuren aus 5 Teilflächen, eine schwarz. Abruf in neuer Reihenfolge: Welche Fläche (A–E) war schwarz? */
export type Punkt = [number, number];

export interface Figur {
  id: number;
  gruppe: number;
  umriss: Punkt[];
  flaechen: Punkt[][];
  /** Label-Positionen der Flächen A–E (Lesereihenfolge) */
  labels: Punkt[];
  schwarz: number;
}

export interface FigurenSet {
  seed: string;
  figuren: Figur[];
  /** Reihenfolge der Abfrage (Indizes in figuren) */
  abfrage: number[];
}

function flaeche(p: Punkt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function schwerpunkt(p: Punkt[]): Punkt {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-9) return p[0];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Halbebene: Punkte, die näher an s als an t liegen (Sutherland–Hodgman) */
function clipNaeher(poly: Punkt[], s: Punkt, t: Punkt): Punkt[] {
  const mx = (s[0] + t[0]) / 2;
  const my = (s[1] + t[1]) / 2;
  const nx = t[0] - s[0];
  const ny = t[1] - s[1];
  const innen = (p: Punkt) => (p[0] - mx) * nx + (p[1] - my) * ny <= 0;
  const out: Punkt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = innen(a);
    const ib = innen(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const da = (a[0] - mx) * nx + (a[1] - my) * ny;
      const db = (b[0] - mx) * nx + (b[1] - my) * ny;
      const t0 = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0]);
    }
  }
  return out;
}

interface Grundform {
  amp: number[];
  phase: number[];
  streckung: number;
}

function umriss(g: Grundform, z: Zufall, variation: number): Punkt[] {
  const amp = g.amp.map((a) => a * (1 + z.bereich(-variation, variation)));
  const phase = g.phase.map((p) => p + z.bereich(-variation, variation));
  const pts: Punkt[] = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    let r = 1;
    amp.forEach((a, k) => (r += a * Math.cos((k + 2) * w + phase[k])));
    pts.push([50 + Math.cos(w) * r * 34 * g.streckung, 50 + Math.sin(w) * r * 34]);
  }
  return pts;
}

function figurErzeugen(id: number, gruppe: number, g: Grundform, z: Zufall, variation: number): Figur | null {
  const u = umriss(g, z, variation);
  const gesamt = flaeche(u);
  for (let versuch = 0; versuch < 40; versuch++) {
    // 5 Saatpunkte innerhalb (konservativ: um die Mitte)
    const saat: Punkt[] = [];
    for (let i = 0; i < 5; i++) {
      const w = (i / 5) * Math.PI * 2 + z.bereich(-0.5, 0.5);
      const r = z.bereich(8, 22);
      saat.push(i === 4 && z.chance(0.4) ? [50 + z.bereich(-5, 5), 50 + z.bereich(-5, 5)] : [50 + Math.cos(w) * r, 50 + Math.sin(w) * r]);
    }
    const flaechen = saat.map((s, i) => saat.reduce((poly, t, j) => (j === i ? poly : clipNaeher(poly, s, t)), u));
    const anteile = flaechen.map((f) => flaeche(f) / gesamt);
    if (anteile.some((a) => a < 0.09)) continue;
    // Lesereihenfolge (oben links → unten rechts) wie im Beispiel
    const sp = flaechen.map(schwerpunkt);
    const ordnung = sp.map((p, i) => ({ p, i })).sort((a, b) => Math.round(a.p[1] / 18) - Math.round(b.p[1] / 18) || a.p[0] - b.p[0]);
    return {
      id,
      gruppe,
      umriss: u,
      flaechen: ordnung.map((o) => flaechen[o.i]),
      labels: ordnung.map((o) => o.p),
      schwarz: z.ganz(0, 4),
    };
  }
  return null;
}

/**
 * Set aus `anzahl` Figuren. Schwieriger = mehr ähnliche Figuren pro Gruppe (NCWiki: oft Gruppen von 4–6 ähnlichen Formen).
 */
export function erzeugeFigurenSet(seed: string, anzahl = 18, schwierigkeit = 3): FigurenSet {
  const z = new Zufall(`figuren:${seed}:${anzahl}:${schwierigkeit}`);
  const proGruppe = schwierigkeit >= 4 ? 5 : schwierigkeit >= 2 ? 3 : 1;
  const variation = schwierigkeit >= 4 ? 0.18 : 0.3;
  const figuren: Figur[] = [];
  let gruppe = 0;
  while (figuren.length < anzahl) {
    const g: Grundform = {
      amp: [z.bereich(0.05, 0.22), z.bereich(0.03, 0.14), z.bereich(0, 0.08)],
      phase: [z.bereich(0, 6.28), z.bereich(0, 6.28), z.bereich(0, 6.28)],
      streckung: z.bereich(0.8, 1.15),
    };
    for (let i = 0; i < proGruppe && figuren.length < anzahl; i++) {
      const f = figurErzeugen(figuren.length, gruppe, g, z.ableiten(`${figuren.length}`), variation);
      if (f) figuren.push(f);
    }
    gruppe++;
  }
  // Abfrage in neuer Reihenfolge (keine Figur an derselben Stelle)
  let abfrage = z.mischen(figuren.map((_, i) => i));
  for (let v = 0; v < 20 && abfrage.some((x, i) => x === i); v++) abfrage = z.mischen(abfrage);
  return { seed, figuren, abfrage };
}

export function pruefeFigurenSet(set: FigurenSet): string[] {
  const p: string[] = [];
  for (const f of set.figuren) {
    if (f.flaechen.length !== 5) p.push(`Figur ${f.id}: ${f.flaechen.length} Flächen`);
    const gesamt = flaeche(f.umriss);
    const summe = f.flaechen.reduce((s, x) => s + flaeche(x), 0);
    if (Math.abs(summe - gesamt) / gesamt > 0.03) p.push(`Figur ${f.id}: Flächen decken den Umriss nicht ab`);
    if (f.flaechen.some((x) => flaeche(x) / gesamt < 0.08)) p.push(`Figur ${f.id}: zu kleine Fläche`);
    if (f.schwarz < 0 || f.schwarz > 4) p.push(`Figur ${f.id}: schwarze Fläche ungültig`);
  }
  if ([...set.abfrage].sort((a, b) => a - b).join() !== set.figuren.map((_, i) => i).join()) p.push("Abfrage-Reihenfolge unvollständig");
  return p;
}

/** Warum wurde eine falsche Fläche gewählt? (Fehleranalyse, verknüpft mit Methodenschritt) */
export function figurenDenkfehler(set: FigurenSet, index: number, gewaehlt: number): { text: string; schritt: number } {
  const f = set.figuren[index];
  const aehnliche = set.figuren.filter((x) => x.gruppe === f.gruppe && x.id !== f.id);
  const verwechselt = aehnliche.find((x) => x.schwarz === gewaehlt);
  if (verwechselt) return { text: `Mit einer ähnlichen Figur verwechselt – dort war Fläche ${"ABCDE"[gewaehlt]} schwarz. Inneres (Teilflächen) beachten, nicht nur den Umriss.`, schritt: 1 };
  return { text: "Kein eindeutiges Bild gespeichert oder nicht aktiv wiederholt.", schritt: 2 };
}
