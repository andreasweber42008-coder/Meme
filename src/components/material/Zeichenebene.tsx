import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Highlighter, Lock, Pencil, Trash2, Undo2 } from "lucide-react";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import type { Markierung, Strich } from "@/daten/modelle";
import { cn } from "@/lib/utils";

export interface Werkzeug {
  art: "stift" | "marker" | "radierer";
  farbe: string;
}

export const STIFTFARBEN = [
  { farbe: "#1f2937", label: "Schwarz" },
  { farbe: "#2563eb", label: "Blau" },
  { farbe: "#dc2626", label: "Rot" },
  { farbe: "#16a34a", label: "Grün" },
] as const;

export const MARKERFARBEN = [
  { farbe: "#facc15", label: "Gelb" },
  { farbe: "#4ade80", label: "Grün" },
  { farbe: "#60a5fa", label: "Blau" },
  { farbe: "#f472b6", label: "Pink" },
] as const;

// eslint-disable-next-line react-refresh/only-export-components
export const STANDARD_WERKZEUG: Werkzeug = { art: "stift", farbe: STIFTFARBEN[0].farbe };

/** Breite in Tausendsteln der Seitenbreite */
const BREITE = { stift: 2.2, marker: 14 } as const;
const RADIUS = 0.018;

// eslint-disable-next-line react-refresh/only-export-components
export function markierungsId(setId: string, seite: string | number): string {
  return `${setId}:${seite}`;
}

function strichZeichnen(ctx: CanvasRenderingContext2D, w: number, h: number, s: Strich) {
  const p = s.punkte;
  if (p.length < 2) return;
  ctx.save();
  ctx.globalAlpha = s.marker ? 0.35 : 1;
  ctx.strokeStyle = s.farbe;
  ctx.fillStyle = s.farbe;
  ctx.lineWidth = Math.max(1, (s.breite * w) / 1000);
  ctx.lineCap = s.marker ? "butt" : "round";
  ctx.lineJoin = "round";
  if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(p[0] * w, p[1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * w, p[i + 1] * h);
    ctx.stroke();
  }
  ctx.restore();
}

function trifft(s: Strich, x: number, y: number, verhaeltnis: number): boolean {
  for (let i = 0; i < s.punkte.length; i += 2) {
    const dx = s.punkte[i] - x;
    const dy = (s.punkte[i + 1] - y) * verhaeltnis;
    if (dx * dx + dy * dy < RADIUS * RADIUS) return true;
  }
  return false;
}

export interface ZeichenebeneProps {
  setId: string;
  /** Seite (oder Schlüssel wie «L3» für Lösungsseiten) */
  seite: string | number;
  werkzeug: Werkzeug;
  /** Zeichnen an: Zeiger gehen an die Ebene statt ans Scrollen */
  aktiv: boolean;
  /** z. B. in Einprägephasen: keine Notizen erlaubt */
  gesperrt?: boolean;
  sperrHinweis?: string;
  className?: string;
}

/**
 * Zeichen- und Markierebene über einer Seite. Koordinaten relativ (0–1), damit Zoom und
 * Bildschirmgrösse keine Rolle spielen. Gespeichert als Markierung «<setId>:<seite>».
 */
export function Zeichenebene({ setId, seite, werkzeug, aktiv, gesperrt = false, sperrHinweis = "Notizen gesperrt", className }: ZeichenebeneProps) {
  const id = markierungsId(setId, seite);
  const store = useSpeicher();
  const doc = useDokument<Markierung>("markierungen", id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [groesse, setGroesse] = useState({ w: 0, h: 0 });
  const laufend = useRef<{ id: number; strich?: Strich; geloescht?: Set<number> } | null>(null);
  const stiftGesehen = useRef(false);
  const [vorschau, setVorschau] = useState<Set<number>>(new Set());
  const striche = useMemo(() => doc?.striche ?? [], [doc?.striche]);

  useEffect(() => {
    const c = canvasRef.current?.parentElement;
    if (!c) return;
    const ro = new ResizeObserver(([e]) => setGroesse({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const neuZeichnen = useCallback(() => {
    const c = canvasRef.current;
    if (!c || groesse.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(groesse.w * dpr)) c.width = Math.round(groesse.w * dpr);
    if (c.height !== Math.round(groesse.h * dpr)) c.height = Math.round(groesse.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, groesse.w, groesse.h);
    striche.forEach((s, i) => {
      if (!vorschau.has(i)) strichZeichnen(ctx, groesse.w, groesse.h, s);
    });
    const l = laufend.current?.strich;
    if (l) strichZeichnen(ctx, groesse.w, groesse.h, l);
  }, [striche, groesse, vorschau]);

  useEffect(() => neuZeichnen(), [neuZeichnen]);

  const punkt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))] as const;
  };

  const runter = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!aktiv || gesperrt || laufend.current) return;
    if (e.pointerType === "pen") stiftGesehen.current = true;
    else if (e.pointerType === "touch" && stiftGesehen.current) return; // Handballen ignorieren
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = punkt(e);
    if (werkzeug.art === "radierer") {
      laufend.current = { id: e.pointerId, geloescht: new Set() };
      radieren(x, y);
    } else {
      const marker = werkzeug.art === "marker";
      laufend.current = { id: e.pointerId, strich: { farbe: werkzeug.farbe, breite: marker ? BREITE.marker : BREITE.stift, marker, punkte: [x, y] } };
      neuZeichnen();
    }
  };

  const radieren = (x: number, y: number) => {
    const g = laufend.current?.geloescht;
    if (!g) return;
    const v = groesse.w > 0 ? groesse.h / groesse.w : 1.4;
    let neu = false;
    striche.forEach((s, i) => {
      if (!g.has(i) && trifft(s, x, y, v)) {
        g.add(i);
        neu = true;
      }
    });
    if (neu) setVorschau(new Set(g));
  };

  const bewegen = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const l = laufend.current;
    if (!l || l.id !== e.pointerId) return;
    const [x, y] = punkt(e);
    if (l.geloescht) return radieren(x, y);
    const p = l.strich!.punkte;
    const dx = x - p[p.length - 2];
    const dy = y - p[p.length - 1];
    if (dx * dx + dy * dy < 0.000004) return;
    p.push(Number(x.toFixed(4)), Number(y.toFixed(4)));
    neuZeichnen();
  };

  const hoch = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const l = laufend.current;
    if (!l || l.id !== e.pointerId) return;
    laufend.current = null;
    const alt = store.hole<Markierung>("markierungen", id);
    const liste = alt?.striche ?? [];
    if (l.geloescht) {
      setVorschau(new Set());
      if (l.geloescht.size) void store.aendern<Markierung>("markierungen", id, { striche: liste.filter((_, i) => !l.geloescht!.has(i)) });
      return;
    }
    if (l.strich) {
      const s = l.strich;
      if (s.marker && s.punkte.length === 2) return neuZeichnen(); // Marker-Tipp ohne Strecke
      void store.aendern<Markierung>("markierungen", id, { striche: [...liste, s] });
    }
  };

  return (
    <div className={cn("absolute inset-0", className)}>
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 h-full w-full", aktiv && !gesperrt ? "cursor-crosshair touch-none" : "pointer-events-none")}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        aria-label={aktiv ? "Zeichenfläche" : undefined}
        role={aktiv ? "img" : undefined}
      />
      {gesperrt && (
        <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold shadow">
          <Lock className="h-3.5 w-3.5" aria-hidden /> {sperrHinweis}
        </div>
      )}
    </div>
  );
}

export interface ZeichenWerkzeugeProps {
  setId: string;
  seite: string | number;
  werkzeug: Werkzeug;
  onWerkzeug: (w: Werkzeug) => void;
  gesperrt?: boolean;
  className?: string;
}

/** Werkzeugleiste: Stiftfarben, Textmarker, Radierer, Rückgängig, Seite leeren */
export function ZeichenWerkzeuge({ setId, seite, werkzeug, onWerkzeug, gesperrt = false, className }: ZeichenWerkzeugeProps) {
  const store = useSpeicher();
  const id = markierungsId(setId, seite);
  const doc = useDokument<Markierung>("markierungen", id);
  const anzahl = doc?.striche.length ?? 0;
  const knopf = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-40";
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto py-1", className)} role="toolbar" aria-label="Zeichenwerkzeuge">
      <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {STIFTFARBEN.map((f) => (
        <button
          key={f.farbe}
          type="button"
          disabled={gesperrt}
          aria-label={`Stift ${f.label}`}
          aria-pressed={werkzeug.art === "stift" && werkzeug.farbe === f.farbe}
          onClick={() => onWerkzeug({ art: "stift", farbe: f.farbe })}
          className={cn(knopf, werkzeug.art === "stift" && werkzeug.farbe === f.farbe ? "border-foreground" : "border-transparent")}
        >
          <span className="h-5 w-5 rounded-full" style={{ background: f.farbe }} />
        </button>
      ))}
      <Highlighter className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {MARKERFARBEN.map((f) => (
        <button
          key={f.farbe}
          type="button"
          disabled={gesperrt}
          aria-label={`Textmarker ${f.label}`}
          aria-pressed={werkzeug.art === "marker" && werkzeug.farbe === f.farbe}
          onClick={() => onWerkzeug({ art: "marker", farbe: f.farbe })}
          className={cn(knopf, werkzeug.art === "marker" && werkzeug.farbe === f.farbe ? "border-foreground" : "border-transparent")}
        >
          <span className="h-5 w-3 rounded-sm opacity-70" style={{ background: f.farbe }} />
        </button>
      ))}
      <button
        type="button"
        disabled={gesperrt}
        aria-label="Radierer"
        aria-pressed={werkzeug.art === "radierer"}
        onClick={() => onWerkzeug({ ...werkzeug, art: "radierer" })}
        className={cn(knopf, "ml-1", werkzeug.art === "radierer" ? "border-foreground bg-muted" : "border-transparent")}
      >
        <Eraser />
      </button>
      <button
        type="button"
        disabled={gesperrt || anzahl === 0}
        aria-label="Rückgängig"
        onClick={() => void store.aendern<Markierung>("markierungen", id, { striche: (doc?.striche ?? []).slice(0, -1) })}
        className={cn(knopf, "border-transparent")}
      >
        <Undo2 />
      </button>
      <button
        type="button"
        disabled={gesperrt || anzahl === 0}
        aria-label="Seite leeren"
        onClick={() => {
          if (window.confirm("Alle Striche auf dieser Seite löschen?")) void store.aendern<Markierung>("markierungen", id, { striche: [] });
        }}
        className={cn(knopf, "border-transparent")}
      >
        <Trash2 />
      </button>
    </div>
  );
}
