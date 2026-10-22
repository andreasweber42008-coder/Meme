/** Reproduzierbarer Zufall: gleicher Seed → gleiche Aufgabe. */

export function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class Zufall {
  private zustand: number;

  constructor(seed: string | number) {
    this.zustand = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  }

  /** Gleichverteilt in [0, 1) – mulberry32 */
  zahl(): number {
    let t = (this.zustand = (this.zustand + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganze Zahl in [min, max] (beide inklusive) */
  ganz(min: number, max: number): number {
    return min + Math.floor(this.zahl() * (max - min + 1));
  }

  bereich(min: number, max: number): number {
    return min + this.zahl() * (max - min);
  }

  chance(p: number): boolean {
    return this.zahl() < p;
  }

  waehle<T>(liste: readonly T[]): T {
    if (liste.length === 0) throw new Error("Leere Liste");
    return liste[Math.floor(this.zahl() * liste.length)];
  }

  mischen<T>(liste: readonly T[]): T[] {
    const kopie = [...liste];
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(this.zahl() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
  }

  stichprobe<T>(liste: readonly T[], anzahl: number): T[] {
    return this.mischen(liste).slice(0, anzahl);
  }

  /** Abgeleiteter, unabhängiger Zufall für Teilaufgaben */
  ableiten(zusatz: string): Zufall {
    return new Zufall(`${this.zustand}:${zusatz}`);
  }
}

export function neuerSeed(): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return (bytes[0].toString(36) + bytes[1].toString(36)).slice(0, 10);
}

export function neueId(): string {
  return crypto.randomUUID();
}
