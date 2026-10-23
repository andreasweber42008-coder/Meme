import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, CalendarDays, Check, FileStack, Gift, Grid3x3, ListChecks, RotateCcw, Star, Timer, Wind, type LucideIcon } from "lucide-react";
import { GRUPPEN_ICON } from "@/components/gruppenIcons";
import type { PlanAufgabe, PlanArt } from "@/plan/plan";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { cn } from "@/lib/utils";

const ICON: Partial<Record<PlanArt, LucideIcon>> = {
  wiederholung: RotateCcw,
  serie: FileStack,
  konz: Grid3x3,
  simulation: Timer,
  generalprobe: Timer,
  "fehler-generalprobe": ListChecks,
  fehlerheft: ListChecks,
  fokus: Wind,
  abruf: Brain,
  termin: CalendarDays,
};

/** Seitliche Verschiebung der Stationen – die typische Schlangenlinie */
const VERSATZ = [0, 56, 84, 56, 0, -56, -84, -56];
const BREITE = 320;
const ZEILE = 118;
const KNOTEN = 72;

export function mitPlan(link: string, id: string): string {
  return `${link}${link.includes("?") ? "&" : "?"}plan=${encodeURIComponent(id)}`;
}

function kurzTitel(a: PlanAufgabe): { titel: string; unter: string } {
  const vorne = a.titel.split(":")[0].trim();
  const art = a.stufe ? (a.art === "wiederholung" ? "Wiederholen" : `Stufe ${a.stufe}`) : a.titel.includes(":") ? a.titel.split(":").slice(1).join(":").trim() : "";
  return { titel: vorne, unter: art ? `${art} · ${a.minuten} min` : `${a.minuten} min` };
}

interface Props {
  stationen: PlanAufgabe[];
  erledigt: Set<string>;
  truheOffen: boolean;
  onTruhe: () => void;
}

/** Duolingo-artiger Tagespfad: Station für Station, am Ende eine Truhe mit Bonus-XP. */
export function Tagespfad({ stationen, erledigt, truheOffen, onTruhe }: Props) {
  const aktuell = stationen.findIndex((s) => !erledigt.has(s.id));
  const alleFertig = aktuell === -1;
  const punkte = [...stationen.map((_, i) => VERSATZ[i % VERSATZ.length]), VERSATZ[stationen.length % VERSATZ.length]];
  const hoehe = punkte.length * ZEILE;
  const pfad = punkte
    .map((x, i) => {
      const px = BREITE / 2 + x;
      const py = i * ZEILE + KNOTEN / 2 + 4;
      if (i === 0) return `M${px} ${py}`;
      const vx = BREITE / 2 + punkte[i - 1];
      const vy = (i - 1) * ZEILE + KNOTEN / 2 + 4;
      return `C${vx} ${vy + ZEILE / 2} ${px} ${py - ZEILE / 2} ${px} ${py}`;
    })
    .join(" ");
  const fortschritt = stationen.length ? (alleFertig ? 1 : aktuell / stationen.length) : 1;

  return (
    <div className="relative mx-auto" style={{ width: BREITE, height: hoehe }} role="list" aria-label="Tagespfad">
      <svg width={BREITE} height={hoehe} className="absolute inset-0" aria-hidden="true">
        <path d={pfad} fill="none" stroke="hsl(var(--muted))" strokeWidth={14} strokeLinecap="round" />
        <motion.path
          d={pfad}
          fill="none"
          stroke="hsl(var(--primary) / 0.35)"
          strokeWidth={14}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fortschritt }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>

      {stationen.map((s, i) => {
        const fertig = erledigt.has(s.id);
        const istAktuell = i === aktuell;
        const Icon = (s.art === "lektion" || s.art === "wiederholung") && s.gruppe ? GRUPPEN_ICON[s.gruppe] : (ICON[s.art] ?? (s.gruppe ? GRUPPEN_ICON[s.gruppe] : Star));
        const x = BREITE / 2 + VERSATZ[i % VERSATZ.length] - KNOTEN / 2;
        const t = kurzTitel(s);
        const munggiLinks = VERSATZ[i % VERSATZ.length] >= 0;
        return (
          <div key={s.id} role="listitem" className="absolute" style={{ left: x, top: i * ZEILE, width: KNOTEN }}>
            {istAktuell && (
              <>
                <motion.span
                  className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-primary bg-card px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-primary shadow"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  Start
                </motion.span>
                <div className={cn("pointer-events-none absolute top-0", munggiLinks ? "-left-[92px]" : "left-[84px]")}>
                  <MeinMunggi zustand="ermutigt" className="h-20 w-20" />
                </div>
              </>
            )}
            <Link
              to={mitPlan(s.link, s.id)}
              aria-label={`${s.titel}${fertig ? ", erledigt" : istAktuell ? ", als Nächstes" : ""}`}
              className="relative block"
            >
              {istAktuell && (
                <motion.span
                  className="absolute -inset-2 rounded-full border-4 border-primary/40"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              )}
              <motion.span
                whileTap={{ scale: 0.92, y: 3 }}
                className={cn(
                  "relative flex items-center justify-center rounded-full border-b-[6px] text-white shadow-sm",
                  fertig ? "border-amber-600 bg-gold" : istAktuell ? "border-primary/60 bg-primary" : "border-border bg-muted text-muted-foreground",
                )}
                style={{ width: KNOTEN, height: KNOTEN }}
              >
                {fertig ? <Check className="h-8 w-8" strokeWidth={3.5} /> : <Icon className="h-8 w-8" strokeWidth={2.5} />}
              </motion.span>
            </Link>
            <div className="absolute left-1/2 top-[78px] w-36 -translate-x-1/2 text-center">
              <p className={cn("truncate text-xs font-extrabold leading-tight", !fertig && !istAktuell && "text-muted-foreground")}>{t.titel}</p>
              <p className="truncate text-[10px] text-muted-foreground">{t.unter}</p>
            </div>
          </div>
        );
      })}

      {/* Truhe am Ende */}
      {(() => {
        const i = stationen.length;
        const x = BREITE / 2 + VERSATZ[i % VERSATZ.length] - KNOTEN / 2;
        return (
          <div className="absolute" style={{ left: x, top: i * ZEILE, width: KNOTEN }}>
            <button
              type="button"
              disabled={!alleFertig || truheOffen}
              onClick={onTruhe}
              aria-label={truheOffen ? "Truhe geöffnet" : alleFertig ? "Truhe öffnen: Bonus-XP" : "Truhe: erst alle Stationen erledigen"}
              className="block"
            >
              <motion.span
                className={cn(
                  "flex items-center justify-center rounded-2xl border-b-[6px]",
                  truheOffen ? "border-amber-600 bg-gold/30 text-gold" : alleFertig ? "border-amber-600 bg-gold text-white" : "border-border bg-muted text-muted-foreground",
                )}
                style={{ width: KNOTEN, height: KNOTEN }}
                animate={alleFertig && !truheOffen ? { rotate: [0, -8, 8, -8, 0], transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1 } } : undefined}
              >
                <Gift className="h-9 w-9" />
              </motion.span>
            </button>
            <p className="absolute left-1/2 top-[78px] w-36 -translate-x-1/2 text-center text-xs font-extrabold leading-tight text-muted-foreground">
              {truheOffen ? "Bonus geholt" : "Tagesziel-Truhe"}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
