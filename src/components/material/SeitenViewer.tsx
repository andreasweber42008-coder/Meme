import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText, Image as BildIcon, Loader2, Maximize2, PenLine, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeitenText, type SeitenInfo } from "@/material/hooks";
import { cn } from "@/lib/utils";
import { Seitenbild } from "./Seitenbild";
import { TextAnsicht } from "./TextAnsicht";
import { STANDARD_WERKZEUG, Zeichenebene, ZeichenWerkzeuge, type Werkzeug } from "./Zeichenebene";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const begrenzen = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export interface SeitenViewerProps {
  setId: string;
  seiten: SeitenInfo[];
  laedt?: boolean;
  fehler?: string | null;
  /** aktuelle Seite, 0-basiert */
  index: number;
  onIndex: (i: number) => void;
  /** Notizen und Markierungen gesperrt (Einprägephasen) */
  notizenGesperrt?: boolean;
  /** Präfix für die Markierungs-ID, z. B. «L» für Lösungsseiten */
  markierungPraefix?: string;
  /** zusätzliche Knöpfe in der Leiste */
  extra?: ReactNode;
  className?: string;
}

/**
 * Seitenansicht für Material: passt auf Breite, zoomt mit Knöpfen, Zwei-Finger-Geste und Ctrl+Mausrad,
 * blättert, zeigt den Text zum Markieren und eine Zeichenebene für Notizen.
 */
export function SeitenViewer({
  setId,
  seiten,
  laedt = false,
  fehler = null,
  index,
  onIndex,
  notizenGesperrt = false,
  markierungPraefix = "",
  extra,
  className,
}: SeitenViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pinch, setPinch] = useState(1);
  const [ansicht, setAnsicht] = useState<"seite" | "text">("seite");
  const [zeichnen, setZeichnen] = useState(false);
  const [werkzeug, setWerkzeug] = useState<Werkzeug>(STANDARD_WERKZEUG);
  const [breite, setBreite] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const seite = seiten[Math.min(index, seiten.length - 1)];
  const { text } = useSeitenText(seite, ansicht === "text");
  const markSeite = seite ? `${markierungPraefix}${seite.nr}` : "";

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBreite(Math.max(0, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zwei-Finger-Zoom (Touch) und Ctrl+Mausrad bzw. Trackpad-Pinch
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let start: { d: number; z: number } | null = null;
    let faktor = 1;
    const abstand = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        start = { d: abstand(e.touches), z: zoomRef.current };
        faktor = 1;
      }
    };
    const tm = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault();
      faktor = begrenzen(start.z * (abstand(e.touches) / start.d)) / start.z;
      setPinch(faktor);
    };
    const te = (e: TouchEvent) => {
      if (start && e.touches.length < 2) {
        const z = begrenzen(start.z * faktor);
        start = null;
        setPinch(1);
        setZoom(z);
      }
    };
    const rad = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => begrenzen(z * Math.exp(-e.deltaY / 300)));
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te);
    el.addEventListener("touchcancel", te);
    el.addEventListener("wheel", rad, { passive: false });
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
      el.removeEventListener("wheel", rad);
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    if (notizenGesperrt) setZeichnen(false);
  }, [notizenGesperrt]);

  const seitenBreite = Math.max(120, Math.floor((breite - 8) * zoom));
  const blaettern = (d: number) => onIndex(Math.min(seiten.length - 1, Math.max(0, index + d)));

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b-2 pb-1.5">
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Vorherige Seite" disabled={index <= 0} onClick={() => blaettern(-1)}>
          <ChevronLeft />
        </Button>
        <label className="flex items-center gap-1 text-sm font-semibold tabular">
          <span className="sr-only">Seite</span>
          <select
            className="h-9 rounded-lg border-2 bg-background px-1 text-sm"
            value={index}
            onChange={(e) => onIndex(Number(e.target.value))}
            disabled={seiten.length === 0}
          >
            {seiten.map((s, i) => (
              <option key={s.nr} value={i}>
                {s.nr}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">/ {seiten.length}</span>
        </label>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Nächste Seite" disabled={index >= seiten.length - 1} onClick={() => blaettern(1)}>
          <ChevronRight />
        </Button>
        <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Verkleinern" onClick={() => setZoom((z) => begrenzen(z / 1.25))} disabled={ansicht === "text"}>
          <ZoomOut />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Auf Breite" onClick={() => setZoom(1)} disabled={ansicht === "text"}>
          <Maximize2 />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Vergrössern" onClick={() => setZoom((z) => begrenzen(z * 1.25))} disabled={ansicht === "text"}>
          <ZoomIn />
        </Button>
        <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />
        <Button
          variant={ansicht === "text" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9"
          aria-label={ansicht === "text" ? "Seitenbild zeigen" : "Text zeigen"}
          aria-pressed={ansicht === "text"}
          onClick={() => setAnsicht((a) => (a === "text" ? "seite" : "text"))}
        >
          {ansicht === "text" ? <BildIcon /> : <FileText />}
        </Button>
        <Button
          variant={zeichnen ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9"
          aria-label={zeichnen ? "Zeichnen beenden" : "Zeichnen"}
          aria-pressed={zeichnen}
          disabled={notizenGesperrt || ansicht === "text"}
          onClick={() => setZeichnen((z) => !z)}
        >
          <PenLine />
        </Button>
        {extra}
      </div>
      {zeichnen && ansicht === "seite" && seite && (
        <ZeichenWerkzeuge setId={setId} seite={markSeite} werkzeug={werkzeug} onWerkzeug={setWerkzeug} gesperrt={notizenGesperrt} className="border-b-2" />
      )}
      <div
        ref={scroller}
        className={cn("relative min-h-0 flex-1 overflow-auto bg-muted/50 p-1", zoom > 1 ? "touch-pan-x touch-pan-y" : "touch-pan-y")}
        tabIndex={0}
        aria-label="Seitenansicht"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "PageDown") blaettern(1);
          if (e.key === "ArrowLeft" || e.key === "PageUp") blaettern(-1);
        }}
      >
        {fehler ? (
          <p className="p-6 text-center text-sm text-falsch">{fehler}</p>
        ) : laedt || !seite ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            {laedt ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Material wird geladen …
              </>
            ) : (
              "Keine Seiten."
            )}
          </div>
        ) : ansicht === "text" ? (
          <div className="p-1">
            <TextAnsicht setId={setId} seite={markSeite} text={text} gesperrt={notizenGesperrt} />
          </div>
        ) : (
          breite > 0 && (
            <div
              className={cn("mx-auto w-fit", pinch !== 1 && "will-change-transform")}
              style={pinch !== 1 ? { transform: `scale(${pinch})`, transformOrigin: "top center" } : undefined}
            >
              <Seitenbild seite={seite} breite={seitenBreite}>
                <Zeichenebene setId={setId} seite={markSeite} werkzeug={werkzeug} aktiv={zeichnen} gesperrt={notizenGesperrt} />
              </Seitenbild>
            </div>
          )
        )}
      </div>
    </div>
  );
}
