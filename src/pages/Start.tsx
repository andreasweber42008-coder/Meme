import { useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlarmClock, Loader2, BrainCircuit, CalendarDays, CheckCircle2, ChevronRight, Circle, Flame, Info, Shield, Trophy } from "lucide-react";
import { useEinstellungen, useGamification, usePlanStand, useTage } from "@/daten/hooks";
import { useAbgleich, useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { kurzfassung, PHASEN_TEXT, planeTag, testdatum, type PlanAufgabe } from "@/plan/plan";
import { formatTag, heute, tageZwischen } from "@/lib/datum";
import { streak, streakInGefahr } from "@/lib/gamification";
import { istFreierTag, streakPflegen } from "@/lernpfad/protokoll";
import { methodeById } from "@/content";
import { Munggi, type MunggiZustand } from "@/components/maskottchen/Munggi";
import { Bereitschaft } from "@/components/statistik/Bereitschaft";
import { ABRUF_PAUSE_MIN } from "@/lektion/GedaechtnisLektion";
import { cn } from "@/lib/utils";

function mitPlan(link: string, id: string): string {
  return `${link}${link.includes("?") ? "&" : "?"}plan=${encodeURIComponent(id)}`;
}

function begruessung(stunde: number): string {
  if (stunde < 11) return "Guete Morge!";
  if (stunde < 17) return "Hoi!";
  return "Guete Abig!";
}

export default function Start() {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const tag = heute();
  const stand = usePlanStand(tag);
  const tage = useTage();
  const g = useGamification();
  const offeneAbrufe = useSammlung<{ seed: string; stufe: number; eingepraegtAm: number }>("plan").filter((d) => d.id.startsWith("abruf:"));

  useEffect(() => {
    void streakPflegen(store);
  }, [store]);

  const sync = useAbgleich();
  const plan = useMemo(() => planeTag(tag, stand), [tag, stand]);
  if (!e.onboardingFertig) {
    // Neues Gerät: erst den ersten Abgleich abwarten, sonst startet das Onboarding unnötig
    if ((sync.status === "bereit" || sync.status === "laeuft") && sync.letzter === null)
      return (
        <div className="flex justify-center py-20" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    return <Navigate to="/onboarding" replace />;
  }

  const t = tage[tag];
  const erledigt = new Set(t?.erledigt ?? []);
  const serie = streak(tage, tag, (x) => istFreierTag(store, x));
  const stunde = new Date().getHours();
  const gefahr = serie > 0 && streakInGefahr(tage, tag, stunde);
  const xpHeute = t?.xp ?? 0;
  const zielAnteil = Math.min(1, xpHeute / Math.max(1, e.tagesziel));
  const test = testdatum(e);
  const tageBisTest = tageZwischen(tag, test);
  const offen = plan.aufgaben.filter((a) => a.minuten > 0 && !erledigt.has(a.id));
  const zustand: MunggiZustand = t?.zielErreicht ? "feiert" : gefahr ? "muede" : offen.length === 0 && !plan.frei ? "freut" : "neutral";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Munggi zustand={zustand} variante={e.maskottchen} className="h-16 w-16 shrink-0" animiert />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">{begruessung(stunde)}</h1>
          <p className="text-sm text-muted-foreground">
            {gefahr ? "Deine Serie wartet auf dich – schon 5 Minuten reichen." : t?.zielErreicht ? "Tagesziel geschafft. Stark!" : kurzfassung(plan)}
          </p>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-2xl border-2 p-2.5">
          <span className={cn("flex items-center gap-1 text-xl font-extrabold tabular-nums", serie > 0 ? "text-flamme" : "text-muted-foreground")}>
            <Flame className="h-5 w-5" /> {serie}
          </span>
          <span className="text-[11px] text-muted-foreground">Tage am Stück</span>
          <span className="mt-0.5 flex items-center gap-0.5 text-[11px] text-info" title="Schutzschilde retten die Serie an einem verpassten Tag">
            <Shield className="h-3 w-3" /> {g.streakSchutz}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border-2 p-2.5">
          <span className="text-xl font-extrabold tabular-nums text-gold">{xpHeute}</span>
          <span className="text-[11px] text-muted-foreground">von {e.tagesziel} XP</span>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${zielAnteil * 100}%` }} />
          </div>
        </div>
        <Link to="/woche" className="flex flex-col items-center rounded-2xl border-2 p-2.5 hover:border-primary/50">
          <span className="text-xl font-extrabold tabular-nums">{Math.max(0, tageBisTest)}</span>
          <span className="text-center text-[11px] leading-tight text-muted-foreground">Tage bis EMS</span>
          <span className="text-[11px] font-semibold">{formatTag(test, "kurz")}</span>
        </Link>
      </div>

      {/* Offene Abrufe der Gedächtnistests */}
      {offeneAbrufe.map((a) => {
        const methodeId = a.id.slice("abruf:".length);
        const bereit = Date.now() - a.eingepraegtAm >= ABRUF_PAUSE_MIN * 60_000;
        return (
          <Link
            key={a.id}
            to={`/lektion/${methodeId}/${a.stufe}`}
            className={cn("flex items-center gap-3 rounded-2xl border-2 p-3", bereit ? "border-primary bg-primary/5" : "border-dashed")}
          >
            <BrainCircuit className="h-6 w-6 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-bold">Abruf: {methodeById(methodeId)?.name}</p>
              <p className="text-xs text-muted-foreground">{bereit ? "Jetzt abrufen" : `Bereit ab ${new Date(a.eingepraegtAm + ABRUF_PAUSE_MIN * 60_000).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}`}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        );
      })}

      {/* Heute */}
      <section className="flex flex-col gap-2" aria-labelledby="heute-titel">
        <div className="flex items-baseline justify-between">
          <h2 id="heute-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            Heute · {PHASEN_TEXT[plan.phase]}
          </h2>
          <Link to="/woche" className="flex items-center gap-1 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> Woche
          </Link>
        </div>
        {!e.einstufungFertig && (
          <Link to="/einstufung" className="flex items-center gap-3 rounded-2xl border-2 border-gold bg-gold/10 p-3">
            <Trophy className="h-6 w-6 shrink-0 text-gold" />
            <div className="flex-1">
              <p className="font-bold">Einstufungstest (~20 Min.)</p>
              <p className="text-xs text-muted-foreground">Damit der Plan weiss, wo du stehst.</p>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
        {plan.hinweise.map((h, k) => (
          <p key={k} className="flex gap-2 rounded-xl bg-muted/60 p-2.5 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" /> {h}
          </p>
        ))}
        <ul className="flex flex-col gap-2">
          {plan.aufgaben.map((a) => (
            <PlanZeile key={a.id} a={a} fertig={erledigt.has(a.id)} />
          ))}
        </ul>
        {plan.aufgaben.length === 0 && !plan.hinweise.length && <p className="text-sm text-muted-foreground">Heute steht nichts an.</p>}
        <Link to="/ueben" className="mt-1 text-center text-sm font-semibold text-primary">
          Mehr üben →
        </Link>
      </section>

      <Bereitschaft kompakt />
    </div>
  );
}

function PlanZeile({ a, fertig }: { a: PlanAufgabe; fertig: boolean }) {
  const frist = a.art === "frist" || a.art === "schlaf";
  return (
    <li>
      <Link
        to={mitPlan(a.link, a.id)}
        className={cn(
          "flex items-center gap-3 rounded-2xl border-2 bg-card p-3 transition-colors hover:border-primary/50",
          fertig && "opacity-60",
          frist && "border-flamme/50 bg-flamme/5",
        )}
      >
        {frist ? (
          <AlarmClock className="h-6 w-6 shrink-0 text-flamme" />
        ) : fertig ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
        ) : (
          <Circle className="h-6 w-6 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold leading-tight", fertig && "line-through")}>{a.titel}</p>
          {a.beschreibung && <p className="text-xs text-muted-foreground">{a.beschreibung}</p>}
        </div>
        {a.minuten > 0 && <span className="shrink-0 text-xs font-bold text-muted-foreground">{a.minuten} min</span>}
      </Link>
    </li>
  );
}
