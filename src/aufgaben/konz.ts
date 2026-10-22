import { Zufall } from "@/lib/zufall";

/**
 * Konz – Regelfamilien nach den offiziellen Konz-Beispielen K1–K6 (swissuniversities),
 * jede in drei Varianten, plus eine Buchstaben-Familie. Jede Übung nutzt eine neue Regel.
 */
export type Familie = "K1" | "K2" | "K3" | "K4" | "K5" | "K6" | "B1";

export type Zelle =
  | { f: "K1"; zahl: number; seiten: [boolean, boolean, boolean, boolean] } // oben, rechts, unten, links
  | { f: "K2"; zahl: number }
  | { f: "K3"; dreh: number; spiegel: boolean }
  | { f: "K4"; linien: [boolean, boolean, boolean, boolean] } // true = durchgehend
  | { f: "K5"; teile: number; muster: number }
  | { f: "K6"; dick: [boolean, boolean, boolean, boolean] } // oben, rechts, unten, links
  | { f: "B1"; buchstabe: "d" | "b" | "p" | "q"; oben: number; unten: number };

export interface KonzRegel {
  id: string;
  familie: Familie;
  titel: string;
  anweisung: string;
  /** zählt die Regel das folgende Zeichen? (dann nie am Zeilenende markieren) */
  folgend: boolean;
  /** offizielle Umrechnungstabelle als Näherung */
  tabelle: "K1" | "K2" | "K3" | "K4" | "K5" | "K6";
  ziel: (z: Zelle, naechste: Zelle | undefined) => boolean;
}

const zahlSeiten = (s: boolean[]) => s.filter(Boolean).length;
const istK1 = (z: Zelle): z is Extract<Zelle, { f: "K1" }> => z.f === "K1";
const istK2 = (z: Zelle): z is Extract<Zelle, { f: "K2" }> => z.f === "K2";
const istK3 = (z: Zelle): z is Extract<Zelle, { f: "K3" }> => z.f === "K3";
const istK4 = (z: Zelle): z is Extract<Zelle, { f: "K4" }> => z.f === "K4";
const istK5 = (z: Zelle): z is Extract<Zelle, { f: "K5" }> => z.f === "K5";
const istK6 = (z: Zelle): z is Extract<Zelle, { f: "K6" }> => z.f === "K6";
const istB1 = (z: Zelle): z is Extract<Zelle, { f: "B1" }> => z.f === "B1";

export const KONZ_REGELN: KonzRegel[] = [
  {
    id: "K1a", familie: "K1", tabelle: "K1", folgend: false, titel: "Zahl = Anzahl Seiten",
    anweisung: "Jedes Quadrat hat 2, 3 oder 4 Seiten und eine Zahl in der Mitte. Markiere jedes Quadrat, bei dem die Zahl mit der Anzahl seiner Seiten übereinstimmt.",
    ziel: (z) => istK1(z) && z.zahl === zahlSeiten(z.seiten),
  },
  {
    id: "K1b", familie: "K1", tabelle: "K1", folgend: false, titel: "Zahl = Seiten + 1",
    anweisung: "Markiere jedes Quadrat, bei dem die Zahl in der Mitte um 1 grösser ist als die Anzahl seiner Seiten.",
    ziel: (z) => istK1(z) && z.zahl === zahlSeiten(z.seiten) + 1,
  },
  {
    id: "K1c", familie: "K1", tabelle: "K1", folgend: false, titel: "Zahl = fehlende Seiten",
    anweisung: "Markiere jedes Quadrat, bei dem die Zahl in der Mitte mit der Anzahl der fehlenden Seiten übereinstimmt.",
    ziel: (z) => istK1(z) && z.zahl === 4 - zahlSeiten(z.seiten),
  },
  {
    id: "K2a", familie: "K2", tabelle: "K2", folgend: true, titel: "Folgende Zahl doppelt",
    anweisung: "Markiere jede Zahl, wenn die darauf folgende Zahl den doppelten Wert hat (1 vor 2, 2 vor 4, 3 vor 6, 4 vor 8). Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK2(z) && !!n && istK2(n) && n.zahl === 2 * z.zahl,
  },
  {
    id: "K2b", familie: "K2", tabelle: "K2", folgend: true, titel: "Folgende Zahl um 1 grösser",
    anweisung: "Markiere jede Zahl, wenn die darauf folgende Zahl um genau 1 grösser ist. Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK2(z) && !!n && istK2(n) && n.zahl === z.zahl + 1,
  },
  {
    id: "K2c", familie: "K2", tabelle: "K2", folgend: true, titel: "Summe mit der folgenden = 10",
    anweisung: "Markiere jede Zahl, die zusammen mit der darauf folgenden Zahl 10 ergibt. Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK2(z) && !!n && istK2(n) && z.zahl + n.zahl === 10,
  },
  {
    id: "K3a", familie: "K3", tabelle: "K3", folgend: true, titel: "Folgendes Zeichen um 180° gedreht",
    anweisung: "Markiere ein Zeichen, wenn das darauf folgende Zeichen um 180 Grad gedreht ist. Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK3(z) && !!n && istK3(n) && n.spiegel === z.spiegel && n.dreh === (z.dreh + 2) % 4,
  },
  {
    id: "K3b", familie: "K3", tabelle: "K3", folgend: true, titel: "Folgendes Zeichen gespiegelt",
    anweisung: "Markiere ein Zeichen, wenn das darauf folgende Zeichen sein Spiegelbild (links–rechts) ist. Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK3(z) && !!n && istK3(n) && n.spiegel !== z.spiegel && n.dreh === (4 - z.dreh) % 4,
  },
  {
    id: "K3c", familie: "K3", tabelle: "K3", folgend: true, titel: "Folgendes Zeichen gleich",
    anweisung: "Markiere ein Zeichen, wenn das darauf folgende Zeichen genau gleich aussieht. Die Regel gilt nur innerhalb der Zeile.",
    ziel: (z, n) => istK3(z) && !!n && istK3(n) && n.spiegel === z.spiegel && n.dreh === z.dreh,
  },
  {
    id: "K4a", familie: "K4", tabelle: "K4", folgend: false, titel: "Linien abwechselnd",
    anweisung: "Jedes Kästchen enthält vier waagrechte Linien, durchgehend oder unterbrochen. Markiere die Kästchen, in denen sich durchgehende und unterbrochene Linien abwechseln.",
    ziel: (z) => istK4(z) && z.linien[0] !== z.linien[1] && z.linien[1] !== z.linien[2] && z.linien[2] !== z.linien[3],
  },
  {
    id: "K4b", familie: "K4", tabelle: "K4", folgend: false, titel: "Genau zwei unterbrochen",
    anweisung: "Markiere die Kästchen mit genau zwei unterbrochenen Linien.",
    ziel: (z) => istK4(z) && z.linien.filter((l) => !l).length === 2,
  },
  {
    id: "K4c", familie: "K4", tabelle: "K4", folgend: false, titel: "Oben und unten unterbrochen",
    anweisung: "Markiere die Kästchen, bei denen die oberste und die unterste Linie unterbrochen und die beiden mittleren durchgehend sind.",
    ziel: (z) => istK4(z) && !z.linien[0] && z.linien[1] && z.linien[2] && !z.linien[3],
  },
  {
    id: "K5a", familie: "K5", tabelle: "K5", folgend: false, titel: "Genau drei Teile",
    anweisung: "Jedes Kästchen ist durch Linien in 2, 3 oder 4 Teile aufgeteilt. Markiere die Kästchen, die aus genau drei Teilen bestehen.",
    ziel: (z) => istK5(z) && z.teile === 3,
  },
  {
    id: "K5b", familie: "K5", tabelle: "K5", folgend: false, titel: "Genau zwei Teile",
    anweisung: "Markiere die Kästchen, die aus genau zwei Teilen bestehen.",
    ziel: (z) => istK5(z) && z.teile === 2,
  },
  {
    id: "K5c", familie: "K5", tabelle: "K5", folgend: false, titel: "Genau vier Teile",
    anweisung: "Markiere die Kästchen, die aus genau vier Teilen bestehen.",
    ziel: (z) => istK5(z) && z.teile === 4,
  },
  {
    id: "K6a", familie: "K6", tabelle: "K6", folgend: false, titel: "Gegenüberliegende Seiten gleich",
    anweisung: "Jede Seite eines Kästchens ist dick oder dünn. Markiere die Kästchen, bei denen jede Seite gleich gedruckt ist wie die gegenüberliegende Seite.",
    ziel: (z) => istK6(z) && z.dick[0] === z.dick[2] && z.dick[1] === z.dick[3],
  },
  {
    id: "K6b", familie: "K6", tabelle: "K6", folgend: false, titel: "Genau eine Seite dick",
    anweisung: "Markiere die Kästchen mit genau einer dicken Seite.",
    ziel: (z) => istK6(z) && z.dick.filter(Boolean).length === 1,
  },
  {
    id: "K6c", familie: "K6", tabelle: "K6", folgend: false, titel: "Nebeneinanderliegende dicke Seiten",
    anweisung: "Markiere die Kästchen mit genau zwei dicken Seiten, die eine Ecke bilden (nebeneinander liegen).",
    ziel: (z) => istK6(z) && z.dick.filter(Boolean).length === 2 && z.dick[0] !== z.dick[2],
  },
  {
    id: "B1a", familie: "B1", tabelle: "K1", folgend: false, titel: "d mit genau zwei Strichen",
    anweisung: "Markiere jedes «d» mit genau zwei Strichen (oben und unten zusammengezählt).",
    ziel: (z) => istB1(z) && z.buchstabe === "d" && z.oben + z.unten === 2,
  },
  {
    id: "B1b", familie: "B1", tabelle: "K1", folgend: false, titel: "p mit genau drei Strichen",
    anweisung: "Markiere jedes «p» mit genau drei Strichen (oben und unten zusammengezählt).",
    ziel: (z) => istB1(z) && z.buchstabe === "p" && z.oben + z.unten === 3,
  },
  {
    id: "B1c", familie: "B1", tabelle: "K1", folgend: false, titel: "b mit zwei Strichen oben",
    anweisung: "Markiere jedes «b» mit genau zwei Strichen oben (unten egal).",
    ziel: (z) => istB1(z) && z.buchstabe === "b" && z.oben === 2,
  },
];

export const KONZ_REGEL_IDS = KONZ_REGELN.map((r) => r.id);

export function konzRegel(id: string): KonzRegel {
  const r = KONZ_REGELN.find((x) => x.id === id);
  if (!r) throw new Error(`Unbekannte Konz-Regel ${id}`);
  return r;
}

/* ------------------------------------------------------------------ Zellen erzeugen */

function zufallsZelle(f: Familie, z: Zufall): Zelle {
  switch (f) {
    case "K1": {
      const fehlend = z.ganz(0, 2);
      const seiten: [boolean, boolean, boolean, boolean] = [true, true, true, true];
      for (const i of z.stichprobe([0, 1, 2, 3], fehlend)) seiten[i] = false;
      return { f, zahl: z.ganz(0, 4), seiten };
    }
    case "K2":
      return { f, zahl: z.waehle([1, 2, 3, 4, 5, 6, 7, 8, 9]) };
    case "K3":
      return { f, dreh: z.ganz(0, 3), spiegel: z.chance(0.5) };
    case "K4":
      return { f, linien: [z.chance(0.5), z.chance(0.5), z.chance(0.5), z.chance(0.5)] };
    case "K5": {
      const teile = z.ganz(2, 4);
      return { f, teile, muster: z.ganz(0, 3) };
    }
    case "K6":
      return { f, dick: [z.chance(0.5), z.chance(0.5), z.chance(0.5), z.chance(0.5)] };
    case "B1":
      return { f, buchstabe: z.waehle(["d", "b", "p", "q"] as const), oben: z.ganz(0, 2), unten: z.ganz(0, 2) };
  }
}

/** Zahlenvorrat je Variante – damit die Zielquote um 25 % liegt. */
function zahlenFuer(regel: KonzRegel): number[] {
  if (regel.id === "K2a") return [1, 2, 3, 4, 6, 8];
  if (regel.id === "K2b") return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

/** Eine Zelle gezielt als Treffer oder Nicht-Treffer erzeugen (für nicht-folgende Regeln). */
function zelleMitZiel(regel: KonzRegel, z: Zufall, treffer: boolean): Zelle {
  for (let i = 0; i < 200; i++) {
    let c = zufallsZelle(regel.familie, z);
    if (regel.familie === "K1") {
      const k = c as Extract<Zelle, { f: "K1" }>;
      const s = zahlSeiten(k.seiten);
      const passend = regel.id === "K1a" ? s : regel.id === "K1b" ? s + 1 : 4 - s;
      // Zahlen 2–4 bzw. 0–2 wie im Original
      const vorrat = regel.id === "K1c" ? [0, 1, 2] : regel.id === "K1b" ? [3, 4, 5] : [2, 3, 4];
      k.zahl = treffer ? passend : z.waehle(vorrat.filter((v) => v !== passend));
      c = k;
    }
    if (regel.ziel(c, undefined) === treffer) return c;
  }
  throw new Error(`Konz: keine Zelle für ${regel.id}`);
}

export interface KonzBlatt {
  regelId: string;
  seed: string;
  zeilen: Zelle[][];
  ziele: boolean[][];
}

export const ZIELQUOTE = 0.25;

export function erzeugeBlatt(regelId: string, seed: string, anzahlZeilen = 40, spalten = 40): KonzBlatt {
  const regel = konzRegel(regelId);
  const z = new Zufall(`konz:${regelId}:${seed}`);
  const zeilen: Zelle[][] = [];
  for (let r = 0; r < anzahlZeilen; r++) {
    const zeile: Zelle[] = [];
    if (!regel.folgend) {
      for (let c = 0; c < spalten; c++) zeile.push(zelleMitZiel(regel, z, z.chance(ZIELQUOTE)));
    } else {
      // Folge-Regeln: Zeichen für Zeichen; Treffer entstehen über das nächste Zeichen
      const vorrat = zahlenFuer(regel);
      let aktuell: Zelle = regel.familie === "K2" ? { f: "K2", zahl: z.waehle(vorrat) } : zufallsZelle(regel.familie, z);
      zeile.push(aktuell);
      let treffer = 0;
      for (let c = 1; c < spalten; c++) {
        // Quote nachsteuern: Manche Zeichen haben keinen passenden Nachfolger (z. B. 8 beim Doppelten)
        const sollTreffer = z.chance(treffer < ZIELQUOTE * c ? 0.45 : 0.12);
        let naechste: Zelle | undefined;
        for (let i = 0; i < 100; i++) {
          const kandidat: Zelle = regel.familie === "K2" ? { f: "K2", zahl: z.waehle(vorrat) } : zufallsZelle(regel.familie, z);
          if (regel.ziel(aktuell, kandidat) === sollTreffer) {
            naechste = kandidat;
            break;
          }
        }
        // Falls kein Treffer möglich (z. B. 8 hat kein Doppeltes): beliebig weiter
        naechste ??= regel.familie === "K2" ? { f: "K2", zahl: z.waehle(vorrat) } : zufallsZelle(regel.familie, z);
        if (regel.ziel(aktuell, naechste)) treffer++;
        zeile.push(naechste);
        aktuell = naechste;
      }
    }
    zeilen.push(zeile);
  }
  const ziele = zeilen.map((zeile) => zeile.map((c, i) => (regel.folgend && i === zeile.length - 1 ? false : regel.ziel(c, zeile[i + 1]))));
  return { regelId, seed, zeilen, ziele };
}

/* ------------------------------------------------------------------ Wertung */

export interface KonzWertung {
  richtig: number;
  falsch: number;
  uebersehen: number;
  rohwert: number;
  /** letzte Markierung (Zeile, Spalte), null = nichts markiert */
  letzte: { zeile: number; spalte: number } | null;
  bearbeitet: number;
  punktwert: number;
}

/**
 * Offizielle Wertung (Test-Info 2026): Bis zur letzten Markierung +1 pro richtig markiertem Zeichen,
 * −1 pro fälschlich markiertem und −1 pro fälschlich nicht markiertem Zeichen.
 */
export function bewerten(blatt: KonzBlatt, markiert: boolean[][]): KonzWertung {
  let letzte: { zeile: number; spalte: number } | null = null;
  markiert.forEach((zeile, r) => zeile.forEach((m, c) => m && (letzte = { zeile: r, spalte: c })));
  let richtig = 0;
  let falsch = 0;
  let uebersehen = 0;
  let bearbeitet = 0;
  if (letzte) {
    const l = letzte as { zeile: number; spalte: number };
    for (let r = 0; r <= l.zeile; r++) {
      const ende = r === l.zeile ? l.spalte : blatt.zeilen[r].length - 1;
      for (let c = 0; c <= ende; c++) {
        bearbeitet++;
        const ziel = blatt.ziele[r][c];
        const m = !!markiert[r]?.[c];
        if (m && ziel) richtig++;
        else if (m && !ziel) falsch++;
        else if (!m && ziel) uebersehen++;
      }
    }
  }
  const rohwert = Math.max(0, richtig - falsch - uebersehen);
  return { richtig, falsch, uebersehen, rohwert, letzte, bearbeitet, punktwert: punktwert(rohwert, konzRegel(blatt.regelId).tabelle) };
}

/**
 * Umrechnungstabellen der offiziellen Konz-Beispiele (Anhang BeispielaufgabenKonz.pdf):
 * Untergrenze des Rohwerts für 1 … 18 Punkte. Für neue Regeln nur eine Näherung –
 * die echte Skala wird jedes Jahr aus den Ergebnissen aller Teilnehmenden berechnet.
 */
export const UMRECHNUNG: Record<KonzRegel["tabelle"], number[]> = {
  K1: [43, 52, 62, 71, 81, 91, 100, 110, 120, 129, 139, 149, 158, 168, 178, 187, 197, 207],
  K2: [53, 63, 74, 85, 96, 106, 117, 128, 139, 149, 160, 171, 182, 192, 203, 214, 225, 236],
  K3: [3, 16, 29, 42, 55, 68, 82, 95, 108, 121, 134, 147, 161, 174, 187, 200, 213, 227],
  K4: [1, 14, 27, 41, 54, 67, 81, 94, 107, 121, 134, 147, 161, 174, 187, 201, 214, 228],
  K5: [132, 144, 157, 170, 183, 196, 209, 222, 235, 248, 261, 274, 287, 300, 313, 326, 339, 352],
  K6: [1, 19, 38, 56, 75, 94, 112, 131, 150, 168, 187, 206, 224, 243, 262, 280, 299, 318],
};

export function punktwert(rohwert: number, tabelle: KonzRegel["tabelle"]): number {
  const grenzen = UMRECHNUNG[tabelle];
  let p = 0;
  for (const g of grenzen) if (rohwert >= g) p++;
  return p;
}

/** Kurze Ja/Nein-Entscheide für die Stufen «Einzelschritte» und «Geführt». */
export function entscheidAufgaben(regelId: string, seed: string, anzahl: number): Array<{ zelle: Zelle; naechste?: Zelle; ziel: boolean }> {
  const blatt = erzeugeBlatt(regelId, seed, Math.ceil(anzahl / 8) + 1, 10);
  const regel = konzRegel(regelId);
  const out: Array<{ zelle: Zelle; naechste?: Zelle; ziel: boolean }> = [];
  blatt.zeilen.forEach((zeile, r) =>
    zeile.forEach((c, i) => {
      if (regel.folgend && i === zeile.length - 1) return;
      out.push({ zelle: c, naechste: regel.folgend ? zeile[i + 1] : undefined, ziel: blatt.ziele[r][i] });
    }),
  );
  // ausgewogen: etwa die Hälfte Treffer
  const z = new Zufall(`entscheid:${seed}`);
  const treffer = z.mischen(out.filter((o) => o.ziel));
  const nicht = z.mischen(out.filter((o) => !o.ziel));
  const mix: typeof out = [];
  for (let i = 0; i < anzahl; i++) mix.push((i % 2 === 0 ? treffer : nicht)[Math.floor(i / 2)] ?? nicht[i] ?? treffer[i]);
  return z.mischen(mix.filter(Boolean));
}

export function zielquote(blatt: KonzBlatt): number {
  const alle = blatt.ziele.flat();
  return alle.filter(Boolean).length / alle.length;
}
