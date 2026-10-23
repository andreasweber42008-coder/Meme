import { GRUPPEN, type AufgabenGruppe, type Einstellungen, type Fortschritt, type Versuch } from "@/daten/modelle";
import { einheitenFuer } from "@/lernpfad/einheiten";
import { plusTage, type Tag } from "@/lib/datum";

export type Ampel = "gruen" | "gelb" | "rot" | "grau";

export interface GruppenStand {
  gruppe: AufgabenGruppe;
  anzahl: number;
  genauigkeit: number | null;
  /** Median Bearbeitungszeit / Zielzeit (1 = EMS-Tempo) */
  tempo: number | null;
  stufe: number;
  ampel: Ampel;
  /** häufigster Schritt-Fehler */
  schwachSchritt?: { methodeId: string; schritt: number; anzahl: number };
}

function median(z: number[]): number | null {
  if (!z.length) return null;
  const s = [...z].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Bereitschaft pro Gruppe aus den letzten 3 Wochen – gemessen an deinen eigenen Zielen.
 * Keine Prognose über die Zulassung.
 */
export function gruppenStand(versuche: Versuch[], fortschritt: Record<string, Fortschritt | undefined>, e: Einstellungen, tag: Tag, tageZurueck = 21): GruppenStand[] {
  const ab = plusTage(tag, -tageZurueck);
  return GRUPPEN.map((g) => {
    const liste = versuche.filter((v) => v.gruppe === g && v.tag >= ab && v.quelle !== "drill");
    const genauigkeit = liste.length ? liste.filter((v) => v.richtig).length / liste.length : null;
    const tempo = median(liste.filter((v) => v.zielMs && v.dauerMs).map((v) => v.dauerMs / v.zielMs!));
    const einheiten = einheitenFuer(g);
    const stufe = Math.min(...einheiten.map((x) => (fortschritt[x.methodeId]?.beherrschtAm ? 8 : (fortschritt[x.methodeId]?.stufe ?? 1))));
    const ziel = e.ziele[g] ?? { genauigkeit: 0.75, tempo: 1 };
    let ampel: Ampel = "grau";
    if (liste.length >= 5 && genauigkeit !== null) {
      const tempoOk = tempo === null || tempo <= ziel.tempo * 1.05;
      if (genauigkeit >= ziel.genauigkeit && tempoOk && stufe >= 7) ampel = "gruen";
      else if (genauigkeit >= ziel.genauigkeit - 0.15 || stufe >= 5) ampel = "gelb";
      else ampel = "rot";
    }
    const zaehler = new Map<string, number>();
    for (const v of liste) for (const s of v.schrittFehler ?? []) if (v.methodeId) zaehler.set(`${v.methodeId}|${s}`, (zaehler.get(`${v.methodeId}|${s}`) ?? 0) + 1);
    const top = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      gruppe: g,
      anzahl: liste.length,
      genauigkeit,
      tempo,
      stufe,
      ampel,
      schwachSchritt: top ? { methodeId: top[0].split("|")[0], schritt: Number(top[0].split("|")[1]), anzahl: top[1] } : undefined,
    };
  });
}

/** Wochenverlauf der Genauigkeit pro Gruppe (für Trends) */
export function wochenTrend(versuche: Versuch[], tag: Tag, wochen = 8): Array<Record<string, number | string | null>> {
  const out: Array<Record<string, number | string | null>> = [];
  for (let w = wochen - 1; w >= 0; w--) {
    const bis = plusTage(tag, -7 * w);
    const von = plusTage(bis, -6);
    const zeile: Record<string, number | string | null> = { woche: von.slice(5).split("-").reverse().join(".") };
    for (const g of GRUPPEN) {
      const l = versuche.filter((v) => v.gruppe === g && v.tag >= von && v.tag <= bis && v.quelle !== "drill");
      zeile[g] = l.length >= 3 ? Math.round((l.filter((v) => v.richtig).length / l.length) * 100) : null;
    }
    out.push(zeile);
  }
  return out;
}
