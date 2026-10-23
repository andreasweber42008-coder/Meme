import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList, FileStack, Layers, MapPin, Play, Printer, RotateCcw, Timer, type LucideIcon } from "lucide-react";
import { useSammlung } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { GRUPPEN, type Fehler, type Versuch } from "@/daten/modelle";
import { useFortschritt } from "@/lernpfad/fortschritt";
import { UNTERTESTS } from "@/content/untertests";
import { GRUPPEN_ICON } from "@/components/gruppenIcons";
import { gruppenStand } from "@/statistik/kennzahlen";
import { AmpelPunkt } from "@/components/statistik/Bereitschaft";
import { istFaellig } from "@/lib/srs";
import { heute } from "@/lib/datum";

function Zeile({ to, titel, text, icon: Icon, marke }: { to: string; titel: string; text: string; icon: LucideIcon; marke?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-3 hover:bg-muted/50">
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            {titel}
            {marke && <span className="rounded-full bg-flamme px-2 py-0.5 text-[11px] font-extrabold text-white">{marke}</span>}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{text}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Üben: alle 9 Aufgabentypen zum freien Training – so oft du willst, ohne Stufen. */
export default function Ueben() {
  const versuche = useSammlung<Versuch>("versuche");
  const fehler = useSammlung<Fehler>("fehlerheft");
  const fortschritt = useFortschritt();
  const [e] = useEinstellungen();
  const tag = heute();
  const stand = useMemo(() => gruppenStand(versuche, fortschritt, e, tag), [versuche, fortschritt, e, tag]);
  const heuteGeuebt = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of versuche) if (v.tag === tag && v.quelle === "training") m.set(v.gruppe, (m.get(v.gruppe) ?? 0) + 1);
    return m;
  }, [versuche, tag]);
  const faellig = fehler.filter((f) => !f.erledigt && istFaellig(f.srs, tag)).length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Üben</h1>
        <p className="text-sm text-muted-foreground">Tipp einen Aufgabentyp an und üb, so lange du willst. Ohne Stufen, sofort mit Rückmeldung.</p>
      </header>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Aufgabentypen">
        {GRUPPEN.map((g) => {
          const u = UNTERTESTS.find((x) => x.id === g)!;
          const Icon = GRUPPEN_ICON[g];
          const s = stand.find((x) => x.gruppe === g);
          const n = heuteGeuebt.get(g) ?? 0;
          return (
            <li key={g}>
              <Link to={`/training/${g}`} className="group flex h-full flex-col gap-2 rounded-2xl border-2 border-b-4 bg-card p-3 transition-colors hover:border-primary/50 active:translate-y-px">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-90 group-hover:opacity-100">
                    <Play className="h-4 w-4" fill="currentColor" />
                  </span>
                </div>
                <span className="font-extrabold leading-tight">{u.kurzname}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {s && <AmpelPunkt ampel={s.ampel} />}
                  {s?.genauigkeit != null ? `${Math.round(s.genauigkeit * 100)} % richtig` : "noch nicht geübt"}
                  {n > 0 ? ` · heute ${n}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-1.5" aria-labelledby="weitere">
        <h2 id="weitere" className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Weitere Übungsformen
        </h2>
        <ul className="overflow-hidden rounded-2xl border-2 bg-card [&>li+li]:border-t">
          <Zeile to="/fehlerheft" titel="Fehlerheft" text="Deine Fehler wiederholen" icon={RotateCcw} marke={faellig ? `${faellig} fällig` : undefined} />
          <Zeile to="/simulation" titel="Simulation" text="Voll, Teil A/B oder Mini – exakte Zeiten" icon={Timer} />
          <Zeile to="/generalprobe" titel="Generalprobe" text="Zur echten Uhrzeit, mit Anreise" icon={MapPin} />
          <Zeile to="/material" titel="Übungsserien" text="NCWiki, offizielle Aufgaben, eigene PDFs" icon={FileStack} />
          <Zeile to="/karten" titel="Lernkarten" text="Tipps aus Kursskript und NCWiki" icon={Layers} />
          <Zeile to="/konz/druck" titel="Konz drucken" text="Blatt + Auswerte-Schablone" icon={Printer} />
          <Zeile to="/simulation/druck" titel="Simulation drucken" text="Testheft und Antwortbogen" icon={ClipboardList} />
        </ul>
      </section>
    </div>
  );
}
