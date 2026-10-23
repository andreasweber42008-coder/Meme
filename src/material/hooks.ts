import { useEffect, useMemo, useState } from "react";
import { useDokument, useSammlung } from "@/daten/DatenProvider";
import type { Lauf, MaterialDatei, MaterialSet } from "@/daten/modelle";
import type { PdfDokument } from "./pdf";
import { dateiLaden } from "./speicher";
import { istBildDatei } from "./import";
import type { LaufMitId } from "./set";

export type SetMitId = MaterialSet & { id: string };

export function useMaterialSets(): SetMitId[] {
  return useSammlung<MaterialSet>("material");
}

export function useMaterialSet(id: string | undefined): SetMitId | undefined {
  return useDokument<MaterialSet>("material", id ?? "");
}

export function useLaeufe(setId?: string): LaufMitId[] {
  const alle = useSammlung<Lauf>("laeufe");
  return useMemo(() => (setId ? alle.filter((l) => l.setId === setId) : alle), [alle, setId]);
}

/** Eine Seite im Viewer: global durchnummeriert über alle Dateien eines Teils */
export interface SeitenInfo {
  /** 1-basiert, global */
  nr: number;
  dateiIndex: number;
  seiteInDatei: number;
  art: "pdf" | "bild";
  doc?: PdfDokument;
  bildUrl?: string;
  rolle?: MaterialDatei["rolle"];
  dateiTitel?: string;
}

export type SetTeil = "aufgaben" | "loesungen";

/** Welche Dateien gehören zu einem Teil? Aufgaben: aufgaben + gesamt; Lösungen: loesungen (+ gesamt) */
export function dateienFuerTeil(dateien: MaterialDatei[], teil: SetTeil): number[] {
  return dateien
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => (teil === "aufgaben" ? d.art !== "loesungen" : d.art === "loesungen" || d.art === "gesamt"))
    .map(({ i }) => i);
}

/** Lädt alle Dateien eines Teils (offline aus dem Cache) und liefert die Seitenliste. */
export function useSeiten(set: SetMitId | undefined, teil: SetTeil): { seiten: SeitenInfo[]; laedt: boolean; fehler: string | null } {
  const [zustand, setZustand] = useState<{ seiten: SeitenInfo[]; laedt: boolean; fehler: string | null }>({ seiten: [], laedt: true, fehler: null });
  // Das Set-Objekt ändert sich bei jeder Bearbeitung; massgebend sind nur die Dateien.
  const dateiSchluessel = set ? JSON.stringify(set.dateien.map((d) => ({ pfad: d.pfad, art: d.art, rolle: d.rolle, contentType: d.contentType, titel: d.titel }))) : "";

  useEffect(() => {
    if (!dateiSchluessel) return;
    let aktiv = true;
    const urls: string[] = [];
    const dateien = JSON.parse(dateiSchluessel) as MaterialDatei[];
    setZustand({ seiten: [], laedt: true, fehler: null });
    (async () => {
      const pdf = await import("./pdf");
      const seiten: SeitenInfo[] = [];
      for (const i of dateienFuerTeil(dateien, teil)) {
        const d = dateien[i];
        const blob = await dateiLaden(d.pfad);
        const basis = { dateiIndex: i, rolle: d.rolle, dateiTitel: d.titel };
        if (istBildDatei(d) || blob.type.startsWith("image/")) {
          const url = URL.createObjectURL(blob);
          urls.push(url);
          seiten.push({ ...basis, nr: seiten.length + 1, seiteInDatei: 1, art: "bild", bildUrl: url });
        } else {
          const doc = await pdf.pdfOeffnen(d.pfad, blob);
          for (let s = 1; s <= doc.numPages; s++) seiten.push({ ...basis, nr: seiten.length + 1, seiteInDatei: s, art: "pdf", doc });
        }
      }
      if (aktiv) setZustand({ seiten, laedt: false, fehler: null });
    })().catch((e: unknown) => {
      if (aktiv) setZustand({ seiten: [], laedt: false, fehler: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      aktiv = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [dateiSchluessel, teil]);

  return zustand;
}

/** Text einer Seite (für die Textansicht), lazy */
export function useSeitenText(seite: SeitenInfo | undefined, aktiv: boolean): { text: string | null; laedt: boolean } {
  const [text, setText] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  useEffect(() => {
    setText(null);
    if (!aktiv || !seite) return;
    if (seite.art === "bild" || !seite.doc) {
      setText("");
      return;
    }
    let an = true;
    setLaedt(true);
    import("./pdf")
      .then((pdf) => pdf.seitenText(seite.doc!, seite.seiteInDatei))
      .then((t) => an && setText(t))
      .catch(() => an && setText(""))
      .finally(() => an && setLaedt(false));
    return () => {
      an = false;
    };
  }, [seite, aktiv]);
  return { text, laedt };
}
