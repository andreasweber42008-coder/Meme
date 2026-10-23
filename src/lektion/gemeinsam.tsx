import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Lightbulb, X } from "lucide-react";
import type { Methode } from "@/content/schema";
import type { Fehlerursache } from "@/daten/modelle";
import type { Option } from "@/aufgaben/typen";
import { Button } from "@/components/ui/button";
import { Munggi } from "@/components/maskottchen/Munggi";
import { useEinstellungen } from "@/daten/hooks";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Zeit */

/** Countdown in Sekunden; ruft onEnde einmal auf. */
export function useCountdown(sekunden: number, laeuft: boolean, onEnde?: () => void): number {
  const [rest, setRest] = useState(sekunden);
  const ende = useRef(onEnde);
  ende.current = onEnde;
  const ziel = useRef<number | null>(null);
  useEffect(() => {
    setRest(sekunden);
    ziel.current = null;
  }, [sekunden]);
  useEffect(() => {
    if (!laeuft) {
      ziel.current = null;
      return;
    }
    ziel.current ??= Date.now() + rest * 1000;
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((ziel.current! - Date.now()) / 1000));
      setRest(r);
      if (r === 0) {
        clearInterval(t);
        ende.current?.();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laeuft, sekunden]);
  return rest;
}

export function zeitText(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function Uhr({ sekunden, warnung = 60, className }: { sekunden: number; warnung?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums", sekunden <= warnung ? "bg-flamme/15 text-flamme" : "bg-muted", className)} aria-live="off">
      <Clock className="h-4 w-4" /> {zeitText(sekunden)}
    </span>
  );
}

/* ------------------------------------------------------------------ Rahmen */

export function LektionsRahmen({ titel, untertitel, fortschritt, rechts, children, fuss, zurueck = "/pfad" }: {
  titel: string;
  untertitel?: string;
  fortschritt: number; // 0–1
  rechts?: ReactNode;
  children: ReactNode;
  fuss?: ReactNode;
  zurueck?: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link to={zurueck} aria-label="Lektion verlassen" className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
          <X className="h-6 w-6" />
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fortschritt * 100)}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(3, fortschritt * 100)}%` }} />
        </div>
        {rechts}
      </div>
      <div>
        <h1 className="text-lg font-extrabold leading-tight">{titel}</h1>
        {untertitel && <p className="text-sm text-muted-foreground">{untertitel}</p>}
      </div>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
      {fuss && <div className="sticky bottom-0 z-10 -mx-4 border-t-2 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">{fuss}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Fehleranalyse */

export const URSACHEN: Array<{ id: Fehlerursache; text: string }> = [
  { id: "methodenschritt", text: "Methodenschritt ausgelassen" },
  { id: "denkfehler", text: "Denkfehler" },
  { id: "zeitnot", text: "Zeitnot" },
  { id: "fluechtigkeit", text: "Flüchtigkeit" },
];

export function FehlerAnalyse({ option, methode, ursache, onUrsache, onDrill, kurz }: {
  option?: Option;
  methode: Methode;
  ursache: Fehlerursache;
  onUrsache: (u: Fehlerursache) => void;
  onDrill?: () => void;
  kurz?: boolean;
}) {
  const schritt = option?.schritt ? methode.schritte.find((s) => s.nr === option.schritt) : undefined;
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-falsch/40 bg-falsch/5 p-3 text-sm">
      {option?.denkfehler && (
        <p className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-falsch" />
          <span>
            <b>Denkfehler:</b> {option.denkfehler}
          </span>
        </p>
      )}
      {schritt && (
        <p className="flex gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            <b>
              Schritt {schritt.nr} «{schritt.titel}»:
            </b>{" "}
            {schritt.tun}
          </span>
        </p>
      )}
      {!kurz && (
        <>
          <p className="text-xs font-bold text-muted-foreground">Ursache fürs Fehlerheft</p>
          <div className="flex flex-wrap gap-1.5">
            {URSACHEN.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onUrsache(u.id)}
                className={cn("rounded-full border-2 px-2.5 py-1 text-xs font-semibold", ursache === u.id ? "border-primary bg-primary/10 text-primary" : "bg-card")}
              >
                {u.text}
              </button>
            ))}
          </div>
          {onDrill && schritt && (
            <Button variant="outline" size="sm" onClick={onDrill} className="self-start">
              Schritt {schritt.nr} kurz üben
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Selbstcheck */

/** Ab Stufe 6: Hast du die Schritte angewendet? (Beherrschung = 80 % richtig + Schritte eingehalten) */
export function SchrittSelbstcheck({ methode, onFertig }: { methode: Methode; onFertig: (anteil: number) => void }) {
  const schritte = methode.schritte.filter((s) => s.phase !== "einrichten" && s.phase !== "nachbereitung");
  const [an, setAn] = useState<Set<number>>(new Set(schritte.map((s) => s.nr)));
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold">Ehrlich: Welche Schritte hast du angewendet?</p>
      <ul className="flex flex-col gap-1.5">
        {schritte.map((s) => (
          <li key={s.nr}>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border-2 bg-card p-2.5">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                checked={an.has(s.nr)}
                onChange={(e) => {
                  const n = new Set(an);
                  if (e.target.checked) n.add(s.nr);
                  else n.delete(s.nr);
                  setAn(n);
                }}
              />
              <span className="text-sm">
                <b>
                  {s.nr}. {s.titel}
                </b>{" "}
                <span className="text-muted-foreground">{s.tun.length > 110 ? `${s.tun.slice(0, 110)} …` : s.tun}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={() => onFertig(schritte.length ? an.size / schritte.length : 1)}>
        Auswerten
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ Ergebnis */

export function StufenErgebnisAnzeige({ quote, schritteQuote, bestanden, aufgestiegen, stufe, methodeId, xp, extra, onNochmals }: {
  quote: number;
  schritteQuote: number;
  bestanden: boolean;
  aufgestiegen: boolean;
  stufe: number;
  methodeId: string;
  xp?: number;
  extra?: ReactNode;
  onNochmals: () => void;
}) {
  const [e] = useEinstellungen();
  const prozent = (x: number) => `${Math.round(x * 100)} %`;
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Munggi zustand={bestanden ? "feiert" : "ermutigt"} variante={e.maskottchen} className="h-32 w-32" animiert />
      <h2 className="text-2xl font-extrabold">{bestanden ? (aufgestiegen ? `Stufe ${stufe + 1} freigeschaltet!` : stufe === 8 ? "Ernstfall bestanden!" : "Bestanden!") : "Fast – nochmals!"}</h2>
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <div className="rounded-xl border-2 p-3">
          <p className="text-2xl font-extrabold tabular-nums">{prozent(quote)}</p>
          <p className="text-xs text-muted-foreground">richtig (Ziel {prozent(e.beherrschung)})</p>
        </div>
        <div className="rounded-xl border-2 p-3">
          <p className="text-2xl font-extrabold tabular-nums">{prozent(schritteQuote)}</p>
          <p className="text-xs text-muted-foreground">Schritte eingehalten (Ziel 80 %)</p>
        </div>
      </div>
      {xp ? <p className="font-bold text-gold">+{xp} XP</p> : null}
      {extra}
      {!bestanden && <p className="max-w-sm text-sm text-muted-foreground">Für die nächste Stufe brauchst du {prozent(e.beherrschung)} richtig und die Schritte. Deine Fehler liegen im Fehlerheft.</p>}
      <div className="flex w-full max-w-sm flex-col gap-2">
        {aufgestiegen && (
          <Link to={`/lektion/${methodeId}/${stufe + 1}`} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
            Weiter zu Stufe {stufe + 1}
          </Link>
        )}
        <Button variant={aufgestiegen ? "outline" : "default"} size="lg" onClick={onNochmals}>
          Nochmals
        </Button>
        <Link to="/" className="py-2 text-sm font-semibold text-muted-foreground">
          Zurück zu Heute
        </Link>
      </div>
    </div>
  );
}
