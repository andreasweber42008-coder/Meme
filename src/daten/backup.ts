import { SAMMLUNGEN, type Dokument } from "./typen";

/** Backup: alle Dokumente als JSON (Fremdmaterial-Dateien bleiben im privaten Speicher). */
export function backupDatei(doks: Array<Omit<Dokument, "synchron">>): string {
  return JSON.stringify({ app: "munggi", version: 1, erstellt: new Date().toISOString(), dokumente: doks }, null, 1);
}

export function backupLesen(text: string): Array<Omit<Dokument, "synchron">> {
  const daten = JSON.parse(text) as { app?: string; dokumente?: unknown };
  if (daten.app !== "munggi" || !Array.isArray(daten.dokumente)) throw new Error("Keine Munggi-Sicherung");
  const erlaubt = new Set<string>(SAMMLUNGEN);
  return (daten.dokumente as Array<Omit<Dokument, "synchron">>).filter(
    (d) => d && typeof d.id === "string" && erlaubt.has(d.sammlung) && typeof d.geaendert === "number" && typeof d.geloescht === "boolean",
  );
}
