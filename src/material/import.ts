/**
 * Import und Analyse von Material-Sets: Dateien in den privaten Speicher holen, mit pdf.js lesen,
 * Schlüssel, Seiten, Zeit und Lösungswege erkennen und das Set im Datenspeicher ablegen.
 */
import type { Datenspeicher } from "@/daten/store";
import type { Lernkarte, MaterialDatei, MaterialSet } from "@/daten/modelle";
import { neueId } from "@/lib/zufall";
import {
  bereichAusSchluessel,
  erkenneLoesungswege,
  erkenneSchluessel,
  erkenneSeiten,
  erkenneZeit,
  seitenFuellen,
} from "./erkennung";
import { artUebersetzen, katalogDateienFuerImport, KURSSKRIPT, urlErlaubt, type KatalogSet, type OffiziellEintrag } from "./katalog";
import { kartenAusZeilen } from "./karten";
import { dateiLaden, dateienLoeschen, eigeneDateiHochladen, katalogDateiAbrufen, MaterialFehler, nutzerId } from "./speicher";
import { schluesselAnpassen, setAusKatalog, setAusOffiziell, setAusUpload, type EigeneAngaben } from "./set";

export const istBildDatei = (d: Pick<MaterialDatei, "contentType" | "pfad">) =>
  (d.contentType ?? "").startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(d.pfad);

type Fortschritt = (text: string) => void;

/* ------------------------------------------------------------------ NCWiki-Katalog */

/** Ein Katalog-Set importieren. Fehlen einzelne Dateien, bleibt das Set mit Hinweis erhalten. */
export async function katalogSetImportieren(store: Datenspeicher, k: KatalogSet, melden?: Fortschritt): Promise<string> {
  if (store.hole<MaterialSet>("material", k.id)) return k.id;
  const liste = katalogDateienFuerImport(k);
  const dateien: MaterialDatei[] = [];
  const fehler: string[] = [];
  for (const [i, d] of liste.entries()) {
    melden?.(`${d.titel} (${i + 1}/${liste.length})`);
    try {
      const r = await katalogDateiAbrufen(d.quelle, d.ref, `ncwiki/${k.id}/${i + 1}-${d.art}.pdf`);
      dateien.push({
        pfad: r.pfad,
        ...artUebersetzen(d.art),
        titel: d.titel,
        contentType: r.contentType,
        bytes: r.bytes,
        herkunft: { quelle: d.quelle, ref: d.ref },
      });
    } catch (e) {
      fehler.push(`${d.titel}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (dateien.length === 0) throw new MaterialFehler(fehler[0] ?? "Keine Datei abrufbar.");
  const set = setAusKatalog(k, dateien, Date.now());
  if (fehler.length) set.hinweis = [set.hinweis, `Nicht abrufbar: ${fehler.join("; ")}`].filter(Boolean).join(" ");
  await store.speichern("material", k.id, set);
  melden?.("Erkennen …");
  await setAnalysierenSicher(store, k.id);
  return k.id;
}

/** Errät die Art aus dem Dateinamen: «Lösungen» → loesungen, sonst aufgaben */
export function artAusName(name: string): MaterialDatei["art"] {
  return /l(ö|oe|o)sung|solution|schl(ü|ue)ssel/i.test(name) ? "loesungen" : "aufgaben";
}

/** Katalog-Set mit selbst heruntergeladenen Dateien anlegen (wenn der Server den Abruf blockt). */
export async function katalogSetMitDateien(store: Datenspeicher, k: KatalogSet, files: File[], melden?: Fortschritt): Promise<string> {
  const dateien: MaterialDatei[] = [];
  for (const [i, f] of files.entries()) {
    melden?.(`Hochladen ${i + 1}/${files.length}`);
    const r = await eigeneDateiHochladen(f, k.id, i);
    dateien.push({ pfad: r.pfad, art: files.length === 1 ? "gesamt" : artAusName(f.name), titel: f.name, contentType: r.contentType, bytes: r.bytes });
  }
  await store.speichern("material", k.id, setAusKatalog(k, dateien, Date.now()));
  melden?.("Erkennen …");
  await setAnalysierenSicher(store, k.id);
  return k.id;
}

/* ------------------------------------------------------------------ Offiziell */

export async function offiziellDateiHolen(o: Pick<OffiziellEintrag, "id" | "url">): Promise<{ pfad: string; bytes: number; contentType: string }> {
  if (!urlErlaubt(o.url)) throw new MaterialFehler("Diese Adresse ist nicht freigegeben.");
  return katalogDateiAbrufen("url", o.url, `offiziell/${o.id}.pdf`);
}

export async function offiziellSetImportieren(store: Datenspeicher, o: OffiziellEintrag, melden?: Fortschritt): Promise<string> {
  if (store.hole<MaterialSet>("material", o.id)) return o.id;
  melden?.(o.titel);
  const r = await offiziellDateiHolen(o);
  const datei: MaterialDatei = { pfad: r.pfad, art: "gesamt", titel: o.titel, contentType: r.contentType, bytes: r.bytes, herkunft: { quelle: "url", ref: o.url } };
  await store.speichern("material", o.id, setAusOffiziell(o, [datei], Date.now()));
  melden?.("Erkennen …");
  await setAnalysierenSicher(store, o.id);
  return o.id;
}

/** Beliebige freigegebene URL (swissuniversities, unifr) als Set */
export async function urlSetImportieren(store: Datenspeicher, url: string, titel: string, gruppe: MaterialSet["gruppe"], zeitMinuten: number): Promise<string> {
  const id = `offiziell-${neueId()}`;
  return offiziellSetImportieren(store, { id, titel: titel.trim() || "Offizielles Material", url: url.trim(), art: "set", gruppe, zeitMinuten, beschreibung: "" });
}

/* ------------------------------------------------------------------ Eigene Dateien */

export async function eigenesSetAnlegen(
  store: Datenspeicher,
  files: Array<{ file: File; art: MaterialDatei["art"] }>,
  angaben: EigeneAngaben,
  melden?: Fortschritt,
): Promise<string> {
  if (files.length === 0) throw new MaterialFehler("Wähle mindestens eine Datei.");
  const id = neueId();
  const dateien: MaterialDatei[] = [];
  for (const [i, { file, art }] of files.entries()) {
    melden?.(`Hochladen ${i + 1}/${files.length}`);
    const r = await eigeneDateiHochladen(file, id, i);
    dateien.push({ pfad: r.pfad, art, titel: file.name, contentType: r.contentType, bytes: r.bytes, ...(r.contentType.startsWith("image/") ? { seiten: 1 } : {}) });
  }
  await store.speichern("material", id, setAusUpload(angaben, dateien, Date.now()));
  melden?.("Erkennen …");
  await setAnalysierenSicher(store, id);
  return id;
}

export async function setLoeschen(store: Datenspeicher, set: MaterialSet & { id: string }): Promise<void> {
  try {
    await dateienLoeschen(set.dateien.map((d) => d.pfad));
  } catch {
    /* Dateien evtl. schon weg – das Set trotzdem entfernen */
  }
  await store.loeschen("material", set.id);
}

/* ------------------------------------------------------------------ Analyse */

async function setAnalysierenSicher(store: Datenspeicher, id: string) {
  try {
    // Beim Import ist kein Viewer offen: pdf.js-Dokumente danach freigeben (spart Speicher beim Sammel-Import)
    await setAnalysieren(store, id, false, true);
  } catch (e) {
    await store.aendern<MaterialSet>("material", id, {
      analyse: { am: Date.now(), schluessel: 0, seiten: 0, loesungswege: 0, fehler: e instanceof Error ? e.message : String(e) },
    });
  }
}

/**
 * Dateien lesen und erkennen. Bei geprüften Sets ändert sich nur die Seitenzahl der Dateien,
 * ausser mit erzwingen = true.
 */
export async function setAnalysieren(store: Datenspeicher, id: string, erzwingen = false, schliessen = false): Promise<MaterialSet["analyse"]> {
  const set = store.hole<MaterialSet>("material", id);
  if (!set) throw new MaterialFehler("Set nicht gefunden.");
  const pdf = await import("./pdf");
  const dateien = [...set.dateien];
  const texte: string[][] = [];
  for (const [i, d] of dateien.entries()) {
    if (istBildDatei(d)) {
      dateien[i] = { ...d, seiten: 1 };
      texte.push([""]);
      continue;
    }
    const doc = await pdf.pdfOeffnen(d.pfad, await dateiLaden(d.pfad));
    dateien[i] = { ...d, seiten: doc.numPages };
    texte.push(await pdf.alleSeitenTexte(doc));
    if (schliessen) await pdf.pdfSchliessen(d.pfad);
  }

  const aufgabenTexte = dateien.flatMap((d, i) => (d.art !== "loesungen" ? texte[i] : []));
  const loesungen = dateien.map((d, i) => (d.art === "loesungen" && !d.rolle ? texte[i].join("\n") : "")).filter(Boolean);
  const loesText = loesungen.length ? loesungen.join("\n") : dateien.map((d, i) => (d.art === "gesamt" ? texte[i].join("\n") : "")).join("\n");

  let { ersteNr, anzahl } = set;
  const konz = set.gruppe === "konz";
  const schluessel = konz ? {} : erkenneSchluessel(loesText, anzahl > 0 ? { ersteNr, anzahl } : {});
  if (anzahl === 0 && !konz) {
    const b = bereichAusSchluessel(schluessel);
    if (b) ({ ersteNr, anzahl } = b);
  }
  const seiten = anzahl > 0 ? erkenneSeiten(aufgabenTexte, { ersteNr, anzahl }) : {};
  const wege = anzahl > 0 ? erkenneLoesungswege(loesText, { ersteNr, anzahl }) : {};
  const zeit = erkenneZeit(aufgabenTexte.slice(0, 3).join("\n"));

  const analyse: NonNullable<MaterialSet["analyse"]> = {
    am: Date.now(),
    schluessel: Object.keys(schluessel).length,
    seiten: Object.keys(seiten).length,
    loesungswege: Object.keys(wege).length,
    ...(zeit ? { zeitMinuten: zeit } : {}),
  };
  const teil: Partial<MaterialSet> = { dateien, analyse };
  if (set.status !== "geprueft" || erzwingen) {
    const basis = schluesselAnpassen(set, ersteNr, anzahl);
    teil.ersteNr = ersteNr;
    teil.anzahl = anzahl;
    teil.schluessel = basis.map((alt, i) => schluessel[ersteNr + i] ?? alt);
    if (anzahl > 0) teil.seiten = seitenFuellen(seiten, ersteNr, anzahl);
    if (analyse.loesungswege) teil.loesungswege = Object.fromEntries(Object.entries(wege).map(([k, v]) => [k, v]));
    if (!set.zeitMinuten && zeit) teil.zeitMinuten = zeit;
  }
  await store.aendern<MaterialSet>("material", id, teil);
  return analyse;
}

/* ------------------------------------------------------------------ Lernkarten */

/** Karten speichern; bestehende Karten behalten ihren Wiederholungsstand. */
async function kartenSpeichern(store: Datenspeicher, karten: Array<{ id: string; daten: Lernkarte }>): Promise<number> {
  const jetzt = Date.now();
  const eintraege = karten.map(({ id, daten }) => {
    const alt = store.hole<Lernkarte>("karten", id);
    const d = { ...daten, ...(alt?.srs ? { srs: alt.srs } : {}) };
    return { sammlung: "karten", id, daten: d, geloescht: false, geaendert: jetzt };
  });
  return store.einmischen(eintraege, false);
}

async function kartenAusPfad(store: Datenspeicher, pfad: string, quelle: Lernkarte["quelle"], idPraefix: string, melden?: Fortschritt): Promise<number> {
  const pdf = await import("./pdf");
  melden?.("PDF lesen …");
  const doc = await pdf.pdfOeffnen(pfad, await dateiLaden(pfad));
  const zeilen = await pdf.alleZeilen(doc);
  await pdf.pdfSchliessen(pfad);
  const karten = kartenAusZeilen(zeilen, { quelle, idPraefix });
  melden?.(`${karten.length} Karten speichern …`);
  await kartenSpeichern(store, karten);
  return karten.length;
}

/** Kursskript abrufen (falls noch nicht im Speicher) und in Lernkarten aufteilen */
export async function kursskriptImportieren(store: Datenspeicher, melden?: Fortschritt): Promise<number> {
  const uid = await nutzerId();
  const ziel = "ncwiki/kursskript/kursskript-2026.pdf";
  let pfad = `${uid}/${ziel}`;
  try {
    await dateiLaden(pfad);
  } catch {
    const d = KURSSKRIPT.dateien[0];
    melden?.("Kursskript abrufen …");
    pfad = (await katalogDateiAbrufen(d.quelle, d.ref, ziel)).pfad;
  }
  return kartenAusPfad(store, pfad, "ncwiki", "kursskript-2026", melden);
}

/** Offizielles Info-Dokument (Test-Info) in Lernkarten aufteilen */
export async function infoKartenImportieren(store: Datenspeicher, o: OffiziellEintrag, melden?: Fortschritt): Promise<number> {
  const uid = await nutzerId();
  let pfad = `${uid}/offiziell/${o.id}.pdf`;
  try {
    await dateiLaden(pfad);
  } catch {
    melden?.(`${o.titel} abrufen …`);
    pfad = (await offiziellDateiHolen(o)).pfad;
  }
  return kartenAusPfad(store, pfad, "test-info", o.id, melden);
}

/** Lernkarten aus einer Datei eines importierten Sets (z. B. NCWiki-Tipps in einem Lösungsheft) */
export async function kartenAusSetDatei(store: Datenspeicher, set: MaterialSet & { id: string }, dateiIndex: number, melden?: Fortschritt): Promise<number> {
  const d = set.dateien[dateiIndex];
  if (!d || istBildDatei(d)) throw new MaterialFehler("Nur PDFs lassen sich in Karten aufteilen.");
  if (set.quelle === "eigen") throw new MaterialFehler("Karten gibt es nur aus NCWiki- und offiziellem Material.");
  return kartenAusPfad(store, d.pfad, set.quelle === "offiziell" ? "test-info" : "ncwiki", `${set.id}-${dateiIndex}`, melden);
}
