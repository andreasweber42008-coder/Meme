import { useMemo, useState } from "react";
import { Eraser, Loader2, Lock } from "lucide-react";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import type { Markierung } from "@/daten/modelle";
import { cn } from "@/lib/utils";
import { MARKERFARBEN, markierungsId } from "./Zeichenebene";

export interface TextAnsichtProps {
  setId: string;
  seite: string | number;
  /** Text der Seite (null = lädt) */
  text: string | null;
  gesperrt?: boolean;
  className?: string;
}

/** Text in Zeilen und Wörter zerlegen; der Wort-Index ist über die ganze Seite fortlaufend. */
function zerlegen(text: string): Array<Array<{ i: number; wort: string }>> {
  let i = 0;
  return text.split("\n").map((z) =>
    z
      .split(/\s+/)
      .filter(Boolean)
      .map((wort) => ({ i: i++, wort })),
  );
}

/**
 * Textansicht einer Seite mit Wort-Markierungen (antippen = markieren, nochmals = entfernen).
 * Gespeichert in Markierung.textMarken derselben Seite wie die Zeichnungen.
 */
export function TextAnsicht({ setId, seite, text, gesperrt = false, className }: TextAnsichtProps) {
  const id = markierungsId(setId, seite);
  const store = useSpeicher();
  const doc = useDokument<Markierung>("markierungen", id);
  const [farbe, setFarbe] = useState<string | null>(MARKERFARBEN[0].farbe);
  const zeilen = useMemo(() => (text ? zerlegen(text) : []), [text]);
  const marken = doc?.textMarken ?? {};

  const tippen = (i: number) => {
    if (gesperrt) return;
    const alt = store.hole<Markierung>("markierungen", id);
    const neu = { ...(alt?.textMarken ?? {}) };
    const k = String(i);
    if (farbe === null || neu[k] === farbe) delete neu[k];
    else neu[k] = farbe;
    void store.aendern<Markierung>("markierungen", id, { striche: alt?.striche ?? [], textMarken: neu });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Textmarker">
        {MARKERFARBEN.map((f) => (
          <button
            key={f.farbe}
            type="button"
            disabled={gesperrt}
            aria-label={`Markieren ${f.label}`}
            aria-pressed={farbe === f.farbe}
            onClick={() => setFarbe(f.farbe)}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 disabled:opacity-40", farbe === f.farbe ? "border-foreground" : "border-transparent")}
          >
            <span className="h-5 w-5 rounded-full opacity-80" style={{ background: f.farbe }} />
          </button>
        ))}
        <button
          type="button"
          disabled={gesperrt}
          aria-label="Markierung entfernen"
          aria-pressed={farbe === null}
          onClick={() => setFarbe(null)}
          className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 disabled:opacity-40", farbe === null ? "border-foreground bg-muted" : "border-transparent")}
        >
          <Eraser className="h-4 w-4" />
        </button>
        {gesperrt && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Markieren gesperrt
          </span>
        )}
      </div>
      {text === null ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Text wird gelesen …
        </div>
      ) : zeilen.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Auf dieser Seite gibt es keinen lesbaren Text (z. B. Scan oder Grafik).</p>
      ) : (
        <div className="rounded-xl border-2 bg-card p-3 text-[15px] leading-7">
          {zeilen.map((z, zi) => (
            <p key={zi} className="min-h-[0.5rem] break-words">
              {z.map(({ i, wort }) => (
                <span key={i}>
                  <span
                    role="button"
                    tabIndex={gesperrt ? -1 : 0}
                    onClick={() => tippen(i)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), tippen(i))}
                    className={cn("rounded px-0.5", !gesperrt && "cursor-pointer")}
                    style={marken[String(i)] ? { background: `${marken[String(i)]}99` } : undefined}
                  >
                    {wort}
                  </span>{" "}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
