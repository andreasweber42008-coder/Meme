import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, BrainCircuit, CalendarDays, ChevronDown, ChevronRight, Flame, Info, Loader2, Sparkles, Trophy } from "lucide-react";
import { useEinstellungen, useGamification, useTage } from "@/daten/hooks";
import { useAbgleich, useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { PHASEN_TEXT, testdatum } from "@/plan/plan";
import { useTagesplan } from "@/plan/tagesplan";
import { heute, tageZwischen } from "@/lib/datum";
import { streak } from "@/lib/gamification";
import { istFreierTag, streakPflegen, truheOeffnen } from "@/lernpfad/protokoll";
import { methodeById } from "@/content";
import { ABRUF_PAUSE_MIN } from "@/lernpfad/einheiten";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { guthaben } from "@/munggi/shop";
import { spruch } from "@/munggi/sprueche";
import { mitPlan, Tagespfad } from "@/components/heute/Tagespfad";
import { cn } from "@/lib/utils";

/** Tagesziel als kleiner Ring */
function ZielRing({ anteil }: { anteil: number }) {
  const r = 15;
  const u = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 -rotate-90" aria-hidden="true">
      <circle cx={20} cy={20} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
      <motion.circle
        cx={20}
        cy={20}
        r={r}
        fill="none"
        stroke="hsl(var(--gold))"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={u}
        initial={{ strokeDashoffset: u }}
        animate={{ strokeDashoffset: u * (1 - anteil) }}
        transition={{ duration: 0.8 }}
      />
    </svg>
  );
}

export default function Start() {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const tag = heute();
  const plan = useTagesplan();
  const tage = useTage();
  const g = useGamification();
  const sync = useAbgleich();
  const offeneAbrufe = useSammlung<{ seed: string; stufe: number; eingepraegtAm: number }>("plan").filter((d) => d.id.startsWith("abruf:"));
  const [hinweiseOffen, setHinweiseOffen] = useState(false);
  const [zufall] = useState(() => Math.random() * 100);

  useEffect(() => {
    void streakPflegen(store);
  }, [store]);

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
  const zielAnteil = Math.min(1, (t?.xp ?? 0) / Math.max(1, e.tagesziel));
  const tageBisTest = tageZwischen(tag, testdatum(e));
  const stationen = plan.aufgaben.filter((a) => a.minuten > 0);
  const notizen = plan.aufgaben.filter((a) => a.minuten === 0);
  const offen = stationen.filter((s) => !erledigt.has(s.id));
  const naechste = offen[0];
  const s = spruch({ stunde, serie, offen: offen.length, erledigt: stationen.length - offen.length, tageBisTest, zielErreicht: !!t?.zielErreicht }, zufall);
  const hinweise = [...notizen.map((n) => n.titel), ...plan.hinweise];
  const minutenOffen = offen.reduce((x, a) => x + a.minuten, 0);

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Kopfzeile: Serie, Guthaben, Tagesziel */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex items-center gap-1 text-lg font-extrabold tabular-nums", serie > 0 ? "text-flamme" : "text-muted-foreground")} aria-label={`${serie} Tage am Stück`}>
          <Flame className="h-6 w-6" /> {serie}
        </span>
        <Link to="/munggi" className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-lg font-extrabold tabular-nums text-gold" aria-label={`${guthaben(g)} XP Guthaben, zum Shop`}>
          <Sparkles className="h-5 w-5" /> {guthaben(g)}
        </Link>
        <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-muted-foreground" aria-label="Tagesziel">
          <ZielRing anteil={zielAnteil} />
          {t?.xp ?? 0}/{e.tagesziel}
        </span>
      </div>

      {/* Munggi spricht */}
      <div className="flex items-end gap-2">
        <Link to="/munggi" aria-label="Zu Munggi" className="shrink-0">
          <MeinMunggi zustand={s.zustand} className="h-24 w-24" />
        </Link>
        <AnimatePresence mode="wait">
          <motion.div
            key={s.text}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative mb-6 flex-1 rounded-2xl border-2 bg-card px-3 py-2.5 text-[15px] font-semibold leading-snug"
          >
            <span className="absolute -left-2 bottom-3 h-3.5 w-3.5 rotate-45 border-b-2 border-l-2 bg-card" aria-hidden="true" />
            {s.text}
            {stationen.length > 0 && offen.length > 0 && (
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {offen.length} {offen.length === 1 ? "Station" : "Stationen"} · ca. {minutenOffen} min · {PHASEN_TEXT[plan.phase]}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Wichtiges zuerst: Abrufe, Einstufung */}
      {offeneAbrufe.map((a) => {
        const methodeId = a.id.slice("abruf:".length);
        const bereit = Date.now() - a.eingepraegtAm >= ABRUF_PAUSE_MIN * 60_000;
        return (
          <Link key={a.id} to={`/lektion/${methodeId}/${a.stufe}`} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3", bereit ? "border-primary bg-primary/5" : "border-dashed")}>
            <BrainCircuit className="h-6 w-6 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-bold">Abruf: {methodeById(methodeId)?.name}</p>
              <p className="text-xs text-muted-foreground">
                {bereit ? "Jetzt abrufen" : `Bereit ab ${new Date(a.eingepraegtAm + ABRUF_PAUSE_MIN * 60_000).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        );
      })}
      {!e.einstufungFertig && (
        <Link to="/einstufung" className="flex items-center gap-3 rounded-2xl border-2 border-gold bg-gold/10 p-3">
          <Trophy className="h-6 w-6 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="font-bold">Einstufungstest (~20 Min.)</p>
            <p className="text-xs text-muted-foreground">Damit dein Pfad weiss, wo du stehst.</p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
      {notizen.some((n) => n.art === "frist") && (
        <Link to="/offiziell" className="flex items-center gap-3 rounded-2xl border-2 border-flamme/50 bg-flamme/5 p-3">
          <AlarmClock className="h-6 w-6 shrink-0 text-flamme" />
          <p className="flex-1 text-sm font-bold">{notizen.find((n) => n.art === "frist")!.titel}</p>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      {/* Der Tagespfad */}
      {stationen.length > 0 ? (
        <div className="pt-10">
          <Tagespfad
            stationen={stationen}
            erledigt={erledigt}
            truheOffen={!!t?.truhe}
            onTruhe={() => void truheOeffnen(store)}
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">{plan.hinweise[0] ?? "Heute ist frei."}</div>
      )}

      {/* Hinweise zusammengeklappt */}
      {hinweise.length > 0 && (
        <div className="rounded-2xl border-2">
          <button type="button" onClick={() => setHinweiseOffen((x) => !x)} aria-expanded={hinweiseOffen} className="flex w-full items-center gap-2 p-3 text-left text-sm font-semibold">
            <Info className="h-4 w-4 text-info" /> {hinweise.length} {hinweise.length === 1 ? "Hinweis" : "Hinweise"} für heute
            <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", hinweiseOffen && "rotate-180")} />
          </button>
          {hinweiseOffen && (
            <ul className="flex flex-col gap-1.5 px-3 pb-3 text-sm">
              {hinweise.map((h, k) => (
                <li key={k} className="rounded-lg bg-muted/60 p-2">
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Link to="/woche" className="flex items-center gap-3 rounded-2xl border-2 p-3 hover:border-primary/50">
        <CalendarDays className="h-5 w-5 text-primary" />
        <span className="flex-1 text-sm">
          <b>Noch {Math.max(0, tageBisTest)} Tage</b> bis zum EMS · Woche ansehen
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Grosser Weiter-Knopf */}
      {naechste && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 px-4 md:bottom-4">
          <Link
            to={mitPlan(naechste.link, naechste.id)}
            className="mx-auto flex h-14 max-w-md items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-[0_4px_0_0_hsl(var(--primary)/0.45)] active:translate-y-0.5 active:shadow-none"
          >
            {erledigt.size === 0 ? "Los geht's" : "Weiter"}: {naechste.titel.split(":")[0]}
          </Link>
        </div>
      )}
    </div>
  );
}
