import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, ChevronRight, Clock, FileText, Play, Printer, Sparkles, Trash2, Wind } from "lucide-react";
import { GRUPPEN, type AufgabenGruppe, type SimulationsErgebnis } from "@/daten/modelle";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { TEXT_BANK } from "@/aufgaben/bank";
import { ablaufErstellen, gesamtMinuten, GRUPPEN_INFO, istSimArt, miniArt, SIM_ARTEN, type SimArt } from "@/simulation/ablauf";
import { minutenText, simArtVon } from "@/simulation/lauf";
import { Button } from "@/components/ui/button";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { formatTag, heute, uhrzeit } from "@/lib/datum";
import { neueId, neuerSeed } from "@/lib/zufall";
import { cn } from "@/lib/utils";

const REGELN = [
  "Exakte Zeiten pro Gruppe. Ist die Zeit um, geht es automatisch weiter.",
  "Blättern nur innerhalb der aktuellen Gruppe – nie zurück in frühere Gruppen.",
  "Separater Antwortbogen: sofort dort markieren. Im Testheft Markiertes zählt nicht.",
  "Kein Abzug für falsche Antworten → immer ankreuzen.",
  "Leere Felder früherer Gruppen darfst du später noch raten – nicht während der Einprägephasen, nicht nach Diagramme und Tabellen und nicht während Konz.",
  "Gedächtnistests: Einprägen ohne Notizen. Abruf in neuer Reihenfolge.",
  "Keine Uhr am Platz – die Zeit wird zentral angezeigt.",
];

const ART_TITEL: Record<SimulationsErgebnis["art"], string> = { voll: "Volle Simulation", "teil-a": "Teil A", "teil-b": "Teil B", generalprobe: "Generalprobe" };

export default function Simulation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const sims = useSammlung<SimulationsErgebnis>("simulationen");
  const roh = params.get("art");
  const planId = params.get("plan") ?? undefined;
  const [art, setArt] = useState<SimArt>(istSimArt(roh) ? roh : "voll");
  const [mini, setMini] = useState<AufgabenGruppe[]>(() => {
    const g = (params.get("gruppen") ?? "").split(",").filter((x): x is AufgabenGruppe => (GRUPPEN as string[]).includes(x));
    return g.length ? g : ["muster-zuordnen", "objekte-im-raum"];
  });

  const startZeit = art === "generalprobe" ? e.testbeginn : uhrzeit();
  const ablauf = useMemo(
    () => ablaufErstellen({ art, startZeit, heftwechselMinuten: e.heftwechselMinuten, mini, texte: TEXT_BANK.length }),
    [art, startZeit, e.heftwechselMinuten, mini],
  );
  const miniOk = art !== "mini" || (mini.length >= 2 && mini.length <= 4);
  const offen = sims.filter((s) => !s.abgeschlossen && s.quelle === "generator").sort((a, b) => b.start - a.start);
  const fertig = sims.filter((s) => s.abgeschlossen).sort((a, b) => (b.ende ?? b.start) - (a.ende ?? a.start)).slice(0, 5);

  function umschalten(g: AufgabenGruppe) {
    setMini((m) => (m.includes(g) ? m.filter((x) => x !== g) : m.length >= 4 ? m : [...m, g]));
  }

  async function starten() {
    if (!miniOk) return;
    const id = neueId();
    const doc: SimulationsErgebnis = {
      art: art === "mini" ? miniArt(mini) : art,
      quelle: "generator",
      seed: neuerSeed(),
      start: Date.now(),
      tag: heute(),
      gruppen: {},
      antworten: {},
      abgeschlossen: false,
      heftwechselMinuten: e.heftwechselMinuten,
      ...(art === "mini" ? { mini: GRUPPEN.filter((g) => mini.includes(g)) } : {}),
      ...(art === "generalprobe" ? { geplanterStart: e.testbeginn } : {}),
      ...(planId ? { planId } : {}),
    };
    await store.speichern("simulationen", id, doc);
    navigate(`/simulation/lauf/${id}`);
  }

  const druckLink = `/simulation/druck?art=${art}&seed=${neuerSeed()}${art === "mini" ? `&gruppen=${mini.join(",")}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <MeinMunggi zustand="fokussiert" className="h-16 w-16 shrink-0" animiert />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">Simulation</h1>
          <p className="text-sm text-muted-foreground">Ernstfall üben: Zeiten, Reihenfolge und Antwortbogen wie am Testtag.</p>
        </div>
      </div>

      {offen.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-3">
          <h2 className="text-sm font-extrabold">Offene Simulation</h2>
          {offen.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Link to={`/simulation/lauf/${s.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-card p-2.5 font-semibold">
                <Play className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {simArtVon(s) === "mini" ? "Mini-Simulation" : ART_TITEL[s.art]} · {formatTag(s.tag, "mittel")}
                </span>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Simulation verwerfen"
                onClick={() => {
                  if (window.confirm("Diese Simulation verwerfen?")) void store.loeschen("simulationen", s.id);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2" aria-label="Art wählen">
        {SIM_ARTEN.map((a) =>
          a.id === "generalprobe" ? (
            <Link key={a.id} to="/generalprobe" className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3">
              <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{a.titel}</span>
                <span className="block text-xs text-muted-foreground">{a.kurz} · Planung mit Anreise und Checkliste</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <button
              key={a.id}
              type="button"
              onClick={() => setArt(a.id)}
              aria-pressed={art === a.id}
              className={cn("flex items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left", art === a.id && "border-primary bg-primary/5")}
            >
              <span className={cn("h-4 w-4 shrink-0 rounded-full border-2", art === a.id ? "border-primary bg-primary" : "border-muted-foreground/50")} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{a.titel}</span>
                <span className="block text-xs text-muted-foreground">{a.kurz}</span>
              </span>
            </button>
          ),
        )}
      </section>

      {art === "mini" && (
        <section className="flex flex-col gap-2 rounded-2xl border-2 p-3">
          <h2 className="text-sm font-extrabold">Gruppen wählen (2–4)</h2>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {GRUPPEN.map((g) => {
              const info = GRUPPEN_INFO[g];
              const an = mini.includes(g);
              return (
                <label key={g} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2 text-sm", an && "border-primary bg-primary/5", !an && mini.length >= 4 && "opacity-50")}>
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={an} disabled={!an && mini.length >= 4} onChange={() => umschalten(g)} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{info.kurz}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{info.einpraegen ? `${info.einpraegen} + ${info.minuten}` : info.minuten} min</span>
                </label>
              );
            })}
          </div>
          {!miniOk && <p className="text-xs font-semibold text-flamme">Wähle 2 bis 4 Gruppen.</p>}
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Clock className="h-4 w-4" /> Ablauf · {minutenText(gesamtMinuten(ablauf))}
        </h2>
        <ol className="flex flex-col text-sm">
          {ablauf.map((b) => (
            <li key={b.id} className="flex items-baseline gap-2 border-b border-dashed py-1 last:border-0">
              <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{b.start}</span>
              <span className="min-w-0 flex-1">
                {b.phase === "heftwechsel" ? (
                  <b>Heftwechsel</b>
                ) : (
                  <>
                    <b>{GRUPPEN_INFO[b.gruppe!].kurz}</b>
                    {b.phase === "einpraegen" ? " · Einprägen" : b.phase === "abruf" ? " · Abruf" : ""}
                  </>
                )}
                {b.hinweis && <span className="block text-xs text-muted-foreground">{b.hinweis}</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums">{b.minuten} min</span>
            </li>
          ))}
        </ol>
        {art === "generalprobe" && <p className="text-xs text-muted-foreground">Uhrzeiten ab deinem Testbeginn {e.testbeginn}.</p>}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
        <h2 className="text-sm font-extrabold">So läuft es wie am Testtag</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {REGELN.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <Link to="/fokus" className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3 font-semibold">
          <Wind className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1">Vorher: 1 Minute Fokus</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Button size="lg" onClick={() => void starten()} disabled={!miniOk}>
          <Sparkles /> Simulation vorbereiten
        </Button>
        <Link to={druckLink} className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted-foreground">
          <Printer className="h-4 w-4" /> Auf Papier: Testheft und Antwortbogen drucken
        </Link>
      </div>

      {fertig.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-extrabold">Letzte Ergebnisse</h2>
          {fertig.map((s) => (
            <Link key={s.id} to={`/simulation/ergebnis/${s.id}`} className="flex items-center gap-2 rounded-xl border-2 bg-card p-2.5 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {simArtVon(s) === "mini" ? "Mini-Simulation" : ART_TITEL[s.art]}
                {s.quelle === "papier" ? " (Papier)" : ""}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatTag(s.tag, "mittel")}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
