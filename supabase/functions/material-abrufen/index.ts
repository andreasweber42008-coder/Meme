// Edge Function «material-abrufen» (Deno): holt eine Katalog-Datei serverseitig und legt sie im
// privaten Bucket «material» unter «<user_id>/<ziel>» ab. Nur für angemeldete Konten.
// Erlaubte Quellen: Google Drive / Google Docs (NCWiki-Links), nc-wiki.ch und freigegebene Hosts.
// Die Datei geht nie an Dritte und landet nie im öffentlichen Build.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_WEITERLEITUNGEN = 6;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const URL_HOSTS = new Set(["www.swissuniversities.ch", "swissuniversities.ch", "www.unifr.ch"]);
const NCWIKI_HOSTS = new Set(["www.nc-wiki.ch", "nc-wiki.ch"]);
const istGoogleHost = (h: string) =>
  h === "drive.google.com" || h === "docs.google.com" || h === "drive.usercontent.google.com" || h.endsWith(".googleusercontent.com");

type Quelle = "drive" | "gdoc" | "ncwiki" | "url";

class Fehler extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function antwort(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Start-URL und erlaubte Hosts (auch für Weiterleitungen) je Quelle */
function ziel(quelle: Quelle, ref: string): { url: URL; erlaubt: (host: string) => boolean } {
  const r = ref.trim();
  switch (quelle) {
    case "drive":
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(r)) throw new Fehler(400, "Ungültige Drive-ID.");
      return { url: new URL(`https://drive.usercontent.google.com/download?id=${r}&export=download&confirm=t`), erlaubt: istGoogleHost };
    case "gdoc":
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(r)) throw new Fehler(400, "Ungültige Docs-ID.");
      return { url: new URL(`https://docs.google.com/document/d/${r}/export?format=pdf`), erlaubt: istGoogleHost };
    case "ncwiki": {
      const url = r.startsWith("/") ? new URL(r, "https://www.nc-wiki.ch") : new URL(r);
      if (url.protocol !== "https:" || !NCWIKI_HOSTS.has(url.hostname)) throw new Fehler(400, "Nur Adressen von nc-wiki.ch.");
      return { url, erlaubt: (h) => NCWIKI_HOSTS.has(h) || istGoogleHost(h) };
    }
    case "url": {
      let url: URL;
      try {
        url = new URL(r);
      } catch {
        throw new Fehler(400, "Ungültige Adresse.");
      }
      if (url.protocol !== "https:" || !URL_HOSTS.has(url.hostname)) throw new Fehler(400, "Dieser Host ist nicht freigegeben.");
      return { url, erlaubt: (h) => URL_HOSTS.has(h) };
    }
    default:
      throw new Fehler(400, "Unbekannte Quelle.");
  }
}

/** Abruf mit eigener Weiterleitungs-Prüfung: Jeder Sprung muss auf einen erlaubten Host zeigen. */
async function holen(start: URL, erlaubt: (h: string) => boolean): Promise<Response> {
  let url = start;
  for (let i = 0; i <= MAX_WEITERLEITUNGEN; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": BROWSER_UA, Accept: "application/pdf,image/*,*/*;q=0.8", "Accept-Language": "de-CH,de;q=0.9" },
    });
    if (res.status >= 300 && res.status < 400) {
      const ort = res.headers.get("location");
      await res.body?.cancel();
      if (!ort) throw new Fehler(502, "Weiterleitung ohne Ziel.");
      url = new URL(ort, url);
      if (url.protocol !== "https:" || !erlaubt(url.hostname)) throw new Fehler(502, `Weiterleitung zu ${url.hostname} ist nicht erlaubt.`);
      continue;
    }
    return res;
  }
  throw new Fehler(502, "Zu viele Weiterleitungen.");
}

async function lesen(res: Response): Promise<Uint8Array> {
  const laenge = Number(res.headers.get("content-length") ?? "0");
  if (laenge > MAX_BYTES) throw new Fehler(413, "Datei grösser als 50 MB.");
  if (!res.body) throw new Fehler(502, "Leere Antwort.");
  const reader = res.body.getReader();
  const teile: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > MAX_BYTES) {
      await reader.cancel();
      throw new Fehler(413, "Datei grösser als 50 MB.");
    }
    teile.push(value);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const t of teile) {
    out.set(t, o);
    o += t.byteLength;
  }
  return out;
}

/** Dateityp an den ersten Bytes erkennen (zuverlässiger als der Content-Type der Quelle) */
function typ(b: Uint8Array): { contentType: string; endung: string } | null {
  const s = (i: number, txt: string) => [...txt].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (s(0, "%PDF-")) return { contentType: "application/pdf", endung: "pdf" };
  // PDF mit vorangestellten Bytes (selten): «%PDF-» in den ersten 1024 Bytes
  for (let i = 1; i < Math.min(1024, b.length - 5); i++) if (s(i, "%PDF-")) return { contentType: "application/pdf", endung: "pdf" };
  if (b[0] === 0x89 && s(1, "PNG")) return { contentType: "image/png", endung: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { contentType: "image/jpeg", endung: "jpg" };
  if (s(0, "RIFF") && s(8, "WEBP")) return { contentType: "image/webp", endung: "webp" };
  return null;
}

/** Ziel-Pfad unterhalb des eigenen Ordners: nur [A-Za-z0-9._-], keine «..», höchstens 6 Ebenen */
function sichererPfad(roh: string, endung: string): string {
  const teile = roh
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean);
  if (teile.length === 0 || teile.length > 6) throw new Fehler(400, "Ungültiges Ziel.");
  const sauber = teile.map((t) => {
    if (t === "." || t === "..") throw new Fehler(400, "Ungültiges Ziel.");
    const x = t.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(0, 100);
    if (!x) throw new Fehler(400, "Ungültiges Ziel.");
    return x;
  });
  const letzte = sauber[sauber.length - 1].replace(/\.[A-Za-z0-9]{1,5}$/, "");
  sauber[sauber.length - 1] = `${letzte || "datei"}.${endung}`;
  const pfad = sauber.join("/");
  if (pfad.length > 300) throw new Fehler(400, "Ziel zu lang.");
  return pfad;
}

/** Google Drive zeigt bei grossen Dateien eine Bestätigungsseite; das Formular enthält die Download-Adresse. */
function driveBestaetigung(html: string, id: string): URL | null {
  const uuid = html.match(/name="uuid"\s+value="([^"]+)"/)?.[1];
  const confirm = html.match(/name="confirm"\s+value="([^"]+)"/)?.[1] ?? "t";
  if (!uuid) return null;
  return new URL(
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=${encodeURIComponent(confirm)}&uuid=${encodeURIComponent(uuid)}`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST." });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Fehler(500, "Server nicht eingerichtet (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");

    // 1) Anmeldung prüfen
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Fehler(401, "Bitte melde Dich an.");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: nutzer, error: authFehler } = await admin.auth.getUser(token);
    const user = nutzer?.user;
    if (authFehler || !user) throw new Fehler(401, "Anmeldung ungültig.");
    if (user.is_anonymous) throw new Fehler(403, "Anonyme Konten sind nicht erlaubt.");

    // 2) Eingabe prüfen
    let body: { quelle?: unknown; ref?: unknown; ziel?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new Fehler(400, "JSON erwartet.");
    }
    const quelle = body.quelle as Quelle;
    if (!["drive", "gdoc", "ncwiki", "url"].includes(quelle)) throw new Fehler(400, "Unbekannte Quelle.");
    if (typeof body.ref !== "string" || body.ref.length > 2000) throw new Fehler(400, "ref fehlt.");
    if (typeof body.ziel !== "string" || body.ziel.length > 300) throw new Fehler(400, "ziel fehlt.");
    const { url, erlaubt } = ziel(quelle, body.ref);

    // 3) Herunterladen
    let res = await holen(url, erlaubt);
    if (quelle === "drive" && res.ok && (res.headers.get("content-type") ?? "").includes("text/html")) {
      const weiter = driveBestaetigung(await res.text(), body.ref.trim());
      if (!weiter) throw new Fehler(502, "Google Drive gibt die Datei nicht frei (evtl. nicht öffentlich).");
      res = await holen(weiter, erlaubt);
    }
    if (res.status === 403) throw new Fehler(502, "Die Quelle verweigert den Abruf (403). Lade die Datei selbst hoch.");
    if (res.status === 404) throw new Fehler(502, "Datei an der Quelle nicht gefunden (404).");
    if (!res.ok) throw new Fehler(502, `Die Quelle antwortet mit ${res.status}.`);
    const bytes = await lesen(res);
    const t = typ(bytes);
    if (!t) throw new Fehler(415, "Keine PDF- oder Bilddatei erhalten.");

    // 4) Privat ablegen: «<user_id>/<ziel>»
    const pfad = `${user.id}/${sichererPfad(body.ziel, t.endung)}`;
    const { error: upFehler } = await admin.storage.from("material").upload(pfad, bytes, { contentType: t.contentType, upsert: true });
    if (upFehler) throw new Fehler(500, `Speichern fehlgeschlagen: ${upFehler.message}`);

    return antwort(200, { pfad, bytes: bytes.byteLength, contentType: t.contentType });
  } catch (e) {
    if (e instanceof Fehler) return antwort(e.status, { fehler: e.message });
    console.error(e);
    return antwort(500, { fehler: "Unerwarteter Fehler beim Abrufen." });
  }
});
