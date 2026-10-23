/**
 * pdf.js (pdfjs-dist 4.10): PDFs öffnen, Seitenzahl, Text pro Seite, Seite auf Canvas zeichnen.
 * Wird nur dynamisch geladen (import("@/material/pdf")), damit pdf.js nicht im Start-Bundle landet.
 */
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { KartenZeile } from "./karten";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDokument = PDFDocumentProxy;

const offen = new Map<string, Promise<PDFDocumentProxy>>();

/** PDF öffnen; dasselbe Dokument (gleicher Schlüssel, z. B. Speicherpfad) wird nur einmal geladen. */
export function pdfOeffnen(schluessel: string, blob: Blob): Promise<PDFDocumentProxy> {
  let p = offen.get(schluessel);
  if (!p) {
    p = blob.arrayBuffer().then((buf) => pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise);
    p.catch(() => offen.delete(schluessel));
    offen.set(schluessel, p);
  }
  return p;
}

export async function pdfSchliessen(schluessel: string): Promise<void> {
  const p = offen.get(schluessel);
  offen.delete(schluessel);
  if (p) await (await p).destroy().catch(() => undefined);
}

export function seitenzahl(doc: PDFDocumentProxy): number {
  return doc.numPages;
}

const istTextItem = (x: unknown): x is TextItem => typeof x === "object" && x !== null && "str" in x && "transform" in x;

/** Text einer Seite als Zeilen (mit Schrifthöhe für die Überschriften-Erkennung) */
export async function seitenZeilen(doc: PDFDocumentProxy, seite: number): Promise<KartenZeile[]> {
  const page = await doc.getPage(seite);
  const inhalt = await page.getTextContent();
  const zeilen: KartenZeile[] = [];
  let aktuell: { text: string; hoehe: number; y: number; xEnde: number } | null = null;
  for (const it of inhalt.items) {
    if (!istTextItem(it)) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const hoehe = Math.abs(it.height || it.transform[3] || 0);
    const neueZeile = !aktuell || Math.abs(y - aktuell.y) > Math.max(2, hoehe * 0.5);
    if (neueZeile) {
      if (aktuell) zeilen.push({ text: aktuell.text.trim(), hoehe: aktuell.hoehe, seite });
      aktuell = { text: it.str, hoehe, y, xEnde: x + it.width };
    } else if (aktuell) {
      const luecke = x - aktuell.xEnde;
      const trenner = luecke > Math.max(1, hoehe * 0.15) && !aktuell.text.endsWith(" ") && !it.str.startsWith(" ") ? " " : "";
      aktuell.text += trenner + it.str;
      aktuell.hoehe = Math.max(aktuell.hoehe, hoehe);
      aktuell.xEnde = x + it.width;
    }
    if (it.hasEOL && aktuell) {
      zeilen.push({ text: aktuell.text.trim(), hoehe: aktuell.hoehe, seite });
      aktuell = null;
    }
  }
  if (aktuell) zeilen.push({ text: aktuell.text.trim(), hoehe: aktuell.hoehe, seite });
  page.cleanup();
  return zeilen.filter((z) => z.text.length > 0);
}

export async function seitenText(doc: PDFDocumentProxy, seite: number): Promise<string> {
  return (await seitenZeilen(doc, seite)).map((z) => z.text).join("\n");
}

/** Texte aller Seiten (höchstens maxSeiten) */
export async function alleSeitenTexte(doc: PDFDocumentProxy, maxSeiten = 400): Promise<string[]> {
  const out: string[] = [];
  for (let s = 1; s <= Math.min(doc.numPages, maxSeiten); s++) out.push(await seitenText(doc, s));
  return out;
}

export async function alleZeilen(doc: PDFDocumentProxy, maxSeiten = 400): Promise<KartenZeile[]> {
  const out: KartenZeile[] = [];
  for (let s = 1; s <= Math.min(doc.numPages, maxSeiten); s++) out.push(...(await seitenZeilen(doc, s)));
  return out;
}

/** Seitenverhältnis (Höhe / Breite) einer Seite */
export async function seitenVerhaeltnis(doc: PDFDocumentProxy, seite: number): Promise<number> {
  const page = await doc.getPage(seite);
  const v = page.getViewport({ scale: 1 });
  return v.height / v.width;
}

/** Grösste Canvas-Fläche, die auch iOS Safari noch zeichnet */
const MAX_PIXEL = 16_000_000;

export interface Gerendert {
  breite: number;
  hoehe: number;
  abbrechen: () => void;
  fertig: Promise<void>;
}

/**
 * Seite in CSS-Breite «breite» auf das Canvas zeichnen (scharf dank devicePixelRatio).
 * abbrechen() stoppt ein laufendes Rendern, z. B. beim schnellen Blättern oder Zoomen.
 */
export async function seiteRendern(doc: PDFDocumentProxy, seite: number, canvas: HTMLCanvasElement, breite: number): Promise<Gerendert> {
  const page = await doc.getPage(seite);
  const basis = page.getViewport({ scale: 1 });
  const scale = breite / basis.width;
  const viewport = page.getViewport({ scale });
  let dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (viewport.width * viewport.height * dpr * dpr > MAX_PIXEL) dpr = Math.sqrt(MAX_PIXEL / (viewport.width * viewport.height));
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  const task: RenderTask = page.render({
    canvasContext: ctx,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  });
  const fertig = task.promise.catch((e: unknown) => {
    if (e instanceof Error && e.name === "RenderingCancelledException") return;
    throw e;
  });
  return { breite: viewport.width, hoehe: viewport.height, abbrechen: () => task.cancel(), fertig };
}
