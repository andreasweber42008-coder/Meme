import { useEffect, useState } from "react";
import type { AufgabenGruppe, SimulationsErgebnis } from "@/daten/modelle";
import { TEXT_BANK } from "@/aufgaben/bank";
import { uhrzeit } from "@/lib/datum";
import { ablaufErstellen, gruppenIm, inhaltErzeugen, istSimArt, type AblaufBlock, type SimArt, type SimInhalt } from "./ablauf";

/** Welche Ablauf-Art hat ein gespeichertes Ergebnis? (Mini wird über das Feld «mini» erkannt.) */
export function simArtVon(doc: Pick<SimulationsErgebnis, "art" | "mini">): SimArt {
  return doc.mini && doc.mini.length > 0 ? "mini" : doc.art;
}

export function ablaufFuer(doc: Pick<SimulationsErgebnis, "art" | "mini" | "heftwechselMinuten" | "geplanterStart" | "start">): AblaufBlock[] {
  return ablaufErstellen({
    art: simArtVon(doc),
    startZeit: doc.geplanterStart ?? uhrzeit(new Date(doc.start)),
    heftwechselMinuten: doc.heftwechselMinuten ?? 10,
    mini: doc.mini,
    texte: TEXT_BANK.length,
  });
}

/** Ablauf aus URL-Parametern (Druck, Papier-Eingabe): ?art=…&gruppen=a,b */
export function ablaufAusParametern(p: URLSearchParams, heftwechselMinuten: number, startZeit: string): { art: SimArt; mini?: AufgabenGruppe[]; ablauf: AblaufBlock[] } {
  const roh = p.get("art");
  const art: SimArt = istSimArt(roh) ? roh : "voll";
  const mini = art === "mini" ? ((p.get("gruppen") ?? "").split(",").filter(Boolean) as AufgabenGruppe[]) : undefined;
  return { art, mini, ablauf: ablaufErstellen({ art, startZeit, heftwechselMinuten, mini, texte: TEXT_BANK.length }) };
}

/** Inhalt asynchron erzeugen (dauert bis zu einer Sekunde) – die Seite zeigt solange einen Ladezustand. */
export function useSimInhalt(seed: string | undefined, ablauf: AblaufBlock[]): SimInhalt | null {
  const [inhalt, setInhalt] = useState<SimInhalt | null>(null);
  const schluessel = `${seed}|${gruppenIm(ablauf).join(",")}`;
  useEffect(() => {
    if (!seed) return;
    let aktiv = true;
    setInhalt(null);
    const t = setTimeout(() => {
      const i = inhaltErzeugen(seed, gruppenIm(ablauf));
      if (aktiv) setInhalt(i);
    }, 30);
    return () => {
      aktiv = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);
  return inhalt;
}

export function dauerText(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = Math.round(sekunden % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function minutenText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
