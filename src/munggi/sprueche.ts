import type { MunggiZustand } from "@/components/maskottchen/Munggi";

/** Kurze Sätze für Munggis Sprechblase – je nach Lage */
export interface Lage {
  stunde: number;
  serie: number;
  offen: number;
  erledigt: number;
  tageBisTest: number;
  zielErreicht: boolean;
}

export function spruch(l: Lage, zufall = 0): { text: string; zustand: MunggiZustand } {
  const w = <T,>(liste: T[]) => liste[Math.abs(Math.floor(zufall)) % liste.length];
  if (l.zielErreicht && l.offen === 0) return { text: w(["Alles erledigt – stark! Gönn dir eine Pause.", "Tagespfad geschafft! Morgen geht's weiter.", "Heute hast du alles gegeben."]), zustand: "feiert" };
  if (l.tageBisTest === 0) return { text: "Heute ist EMS. Du hast trainiert – vertrau deinen Methoden!", zustand: "fokussiert" };
  if (l.tageBisTest === 1) return { text: "Morgen ist Testtag. Heute nichts mehr lernen, früh schlafen.", zustand: "ermutigt" };
  if (l.serie > 0 && l.erledigt === 0 && l.stunde >= 17) return { text: `Deine Serie von ${l.serie} ${l.serie === 1 ? "Tag" : "Tagen"} wartet – eine Station reicht!`, zustand: "muede" };
  if (l.erledigt === 0)
    return {
      text: w(
        l.stunde < 11
          ? ["Guete Morge! Auf geht's zur ersten Station.", "Ein frischer Kopf lernt am besten – los!"]
          : l.stunde < 17
            ? ["Hoi! Dein Pfad für heute ist bereit.", "Eine Station nach der anderen."]
            : ["Guete Abig! Noch kurz auf den Pfad?", "Ein paar Minuten heute zählen."],
      ),
      zustand: "freut",
    };
  if (l.offen === 1) return { text: "Nur noch eine Station!", zustand: "ermutigt" };
  return { text: w([`Super, schon ${l.erledigt} geschafft. Weiter so!`, "Du bist im Fluss – nächste Station!", "Schritt für Schritt zum Ziel."]), zustand: "freut" };
}

export const TIPP_SPRUECHE = [
  "Kitzel mich nicht – ich lerne gerade Fakten!",
  "Wusstest du? Murmeltiere schlafen bis zu 6 Monate.",
  "Bei Konz: zeilenweise, nicht springen.",
  "Fragen zuerst lesen, dann den Text.",
  "Absolute Wörter wie «immer» sind verdächtig.",
  "Lieber sauber als hastig.",
  "Ich glaub an dich!",
  "Pause machen ist auch Training.",
];
