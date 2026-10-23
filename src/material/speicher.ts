/**
 * Privater Material-Speicher: Bucket «material» in Lovable Cloud, Pfad immer «<user_id>/…».
 * Dazu ein Offline-Cache in IndexedDB, damit importierte Sets ohne Netz laufen.
 */
import { openDB } from "idb";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { dateiCacheLesen, dateiCacheSchreiben } from "@/daten/ablage";
import type { AbrufQuelle } from "./katalog";

export const BUCKET = "material";
export const MAX_BYTES = 50 * 1024 * 1024;
export const ERLAUBTE_TYPEN = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;

export class MaterialFehler extends Error {}

function client() {
  if (!supabase) throw new MaterialFehler("Lovable Cloud ist nicht verbunden.");
  return supabase;
}

export async function nutzerId(): Promise<string> {
  const { data } = await client().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new MaterialFehler("Bitte melde dich zuerst an.");
  return id;
}

/** Dateiname ohne Sonderzeichen, Umlaute werden zu ae/oe/ue */
export function sichererName(name: string): string {
  const punkt = name.lastIndexOf(".");
  const basis = punkt > 0 ? name.slice(0, punkt) : name;
  const endung = punkt > 0 ? name.slice(punkt + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const b =
    basis
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/Ä/g, "Ae")
      .replace(/Ö/g, "Oe")
      .replace(/Ü/g, "Ue")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80) || "datei";
  return endung ? `${b}.${endung.slice(0, 5)}` : b;
}

export function typErlaubt(typ: string): boolean {
  return (ERLAUBTE_TYPEN as readonly string[]).includes(typ);
}

export interface GespeicherteDatei {
  pfad: string;
  bytes: number;
  contentType: string;
}

/** Eigene Datei (PDF oder Bild) hochladen nach «<uid>/eigen/<setId>/<name>» */
export async function eigeneDateiHochladen(file: File, setId: string, index = 0): Promise<GespeicherteDatei> {
  const typ = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!typErlaubt(typ)) throw new MaterialFehler(`«${file.name}»: Nur PDF, PNG, JPEG oder WebP.`);
  if (file.size > MAX_BYTES) throw new MaterialFehler(`«${file.name}» ist grösser als 50 MB.`);
  const uid = await nutzerId();
  const pfad = `${uid}/eigen/${sichererName(setId)}/${String(index + 1).padStart(2, "0")}-${sichererName(file.name)}`;
  const { error } = await client().storage.from(BUCKET).upload(pfad, file, { contentType: typ, upsert: true });
  if (error) throw new MaterialFehler(`Hochladen fehlgeschlagen: ${error.message}`);
  await cacheSchreiben(pfad, file);
  return { pfad, bytes: file.size, contentType: typ };
}

/**
 * Katalog-Datei serverseitig abrufen lassen (Edge Function «material-abrufen»), weil Google Drive,
 * NCWiki und swissuniversities keinen direkten Abruf aus dem Browser erlauben (CORS).
 * ziel = Pfad unterhalb des eigenen Ordners, z. B. «ncwiki/<setId>/1-aufgaben.pdf».
 */
export async function katalogDateiAbrufen(quelle: AbrufQuelle, ref: string, ziel: string): Promise<GespeicherteDatei> {
  const { data, error } = await client().functions.invoke<GespeicherteDatei>("material-abrufen", { body: { quelle, ref, ziel } });
  if (error) {
    let text = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const j = (await error.context.json()) as { fehler?: string };
        if (j.fehler) text = j.fehler;
      } catch {
        /* keine JSON-Antwort */
      }
    }
    throw new MaterialFehler(text);
  }
  if (!data?.pfad) throw new MaterialFehler("Leere Antwort vom Server.");
  return data;
}

async function cacheSchreiben(pfad: string, blob: Blob) {
  try {
    await dateiCacheSchreiben(pfad, blob);
  } catch {
    /* privater Modus: ohne Cache weiter */
  }
}

/** Datei als Blob: zuerst aus dem Offline-Cache, sonst aus dem privaten Speicher (und dann cachen). */
export async function dateiLaden(pfad: string): Promise<Blob> {
  try {
    const c = await dateiCacheLesen(pfad);
    if (c) return c;
  } catch {
    /* kein IndexedDB */
  }
  const { data, error } = await client().storage.from(BUCKET).download(pfad);
  if (error || !data) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new MaterialFehler(offline ? "Offline und noch nicht auf diesem Gerät gespeichert." : `Datei nicht gefunden: ${error?.message ?? pfad}`);
  }
  await cacheSchreiben(pfad, data);
  return data;
}

export async function istOffline(pfad: string): Promise<boolean> {
  try {
    return !!(await dateiCacheLesen(pfad));
  } catch {
    return false;
  }
}

async function cacheEntfernen(pfade: string[]) {
  try {
    const d = await openDB("munggi", 1);
    await Promise.all(pfade.map((p) => d.delete("dateien", p)));
  } catch {
    /* egal */
  }
}

/** Dateien aus dem privaten Speicher und dem Cache löschen */
export async function dateienLoeschen(pfade: string[]): Promise<void> {
  if (pfade.length === 0) return;
  await cacheEntfernen(pfade);
  const { error } = await client().storage.from(BUCKET).remove(pfade);
  if (error) throw new MaterialFehler(`Löschen fehlgeschlagen: ${error.message}`);
}
