import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { SeitenInfo } from "@/material/hooks";
import { cn } from "@/lib/utils";

export interface SeitenbildProps {
  seite: SeitenInfo;
  /** CSS-Breite in px */
  breite: number;
  /** erst zeichnen, wenn sichtbar (Vorschaubilder) */
  lazy?: boolean;
  /** Ebenen über der Seite (Zeichenebene) */
  children?: ReactNode;
  className?: string;
}

/** Eine Seite (PDF-Seite oder Bild) in fester Breite; Kinder liegen deckungsgleich darüber. */
export function Seitenbild({ seite, breite, lazy = false, children, className }: SeitenbildProps) {
  const huelle = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [verhaeltnis, setVerhaeltnis] = useState(1.414);
  const [sichtbar, setSichtbar] = useState(!lazy);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    if (!lazy || sichtbar || !huelle.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSichtbar(true), { rootMargin: "200px" });
    io.observe(huelle.current);
    return () => io.disconnect();
  }, [lazy, sichtbar]);

  useEffect(() => {
    if (seite.art !== "pdf" || !seite.doc || !sichtbar || !canvas.current || breite < 10) return;
    let abbrechen: (() => void) | null = null;
    let aktiv = true;
    setLaedt(true);
    (async () => {
      const pdf = await import("@/material/pdf");
      if (!aktiv || !canvas.current) return;
      const r = await pdf.seiteRendern(seite.doc!, seite.seiteInDatei, canvas.current, breite);
      abbrechen = r.abbrechen;
      if (aktiv) setVerhaeltnis(r.hoehe / r.breite);
      await r.fertig;
      if (aktiv) setLaedt(false);
    })().catch(() => aktiv && setLaedt(false));
    return () => {
      aktiv = false;
      abbrechen?.();
    };
  }, [seite.doc, seite.seiteInDatei, seite.art, breite, sichtbar]);

  return (
    <div
      ref={huelle}
      className={cn("relative bg-white shadow-sm", className)}
      style={{ width: breite, height: Math.round(breite * verhaeltnis) }}
    >
      {seite.art === "pdf" ? (
        <canvas ref={canvas} className="block" aria-label={`Seite ${seite.nr}`} role="img" />
      ) : (
        <img
          src={seite.bildUrl}
          alt={`Seite ${seite.nr}`}
          className="block h-full w-full object-contain"
          onLoad={(e) => {
            const i = e.currentTarget;
            if (i.naturalWidth) setVerhaeltnis(i.naturalHeight / i.naturalWidth);
            setLaedt(false);
          }}
          draggable={false}
        />
      )}
      {laedt && sichtbar && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}
