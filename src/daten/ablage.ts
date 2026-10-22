import { openDB, type IDBPDatabase } from "idb";
import type { Ablage, Dokument } from "./typen";

/** IndexedDB-Ablage: funktioniert offline, bleibt auf dem Gerät. */
export function indexedDbAblage(name = "munggi"): Ablage {
  let db: Promise<IDBPDatabase> | null = null;
  const oeffnen = () =>
    (db ??= openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore("dokumente", { keyPath: ["sammlung", "id"] });
        d.createObjectStore("meta");
        d.createObjectStore("dateien");
      },
    }));
  return {
    async alleLaden() {
      return (await (await oeffnen()).getAll("dokumente")) as Dokument[];
    },
    async schreiben(doks) {
      const tx = (await oeffnen()).transaction("dokumente", "readwrite");
      await Promise.all([...doks.map((d) => tx.store.put(d)), tx.done]);
    },
    async metaLesen(schluessel) {
      return (await (await oeffnen()).get("meta", schluessel)) as string | undefined;
    },
    async metaSchreiben(schluessel, wert) {
      await (await oeffnen()).put("meta", wert, schluessel);
    },
    async leeren() {
      const d = await oeffnen();
      await Promise.all([d.clear("dokumente"), d.clear("meta"), d.clear("dateien")]);
    },
  };
}

/** Dateien (PDFs) offline auf dem Gerät zwischenspeichern. */
export async function dateiCacheLesen(pfad: string): Promise<Blob | undefined> {
  const d = await openDB("munggi", 1);
  return (await d.get("dateien", pfad)) as Blob | undefined;
}

export async function dateiCacheSchreiben(pfad: string, blob: Blob): Promise<void> {
  const d = await openDB("munggi", 1);
  await d.put("dateien", blob, pfad);
}

export function speicherAblage(): Ablage {
  const doks = new Map<string, Dokument>();
  const meta = new Map<string, string>();
  return {
    async alleLaden() {
      return [...doks.values()].map((d) => structuredClone(d));
    },
    async schreiben(liste) {
      for (const d of liste) doks.set(`${d.sammlung}\u0000${d.id}`, structuredClone(d));
    },
    async metaLesen(k) {
      return meta.get(k);
    },
    async metaSchreiben(k, w) {
      meta.set(k, w);
    },
    async leeren() {
      doks.clear();
      meta.clear();
    },
  };
}
