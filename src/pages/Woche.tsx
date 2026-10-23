import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEinstellungen, usePlanStand } from "@/daten/hooks";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import type { Termin } from "@/daten/modelle";
import { festeTermine, PHASEN_TEXT, phaseFuer, planeTage, testdatum, type PlanTag } from "@/plan/plan";
import { formatTag, heute, montagDerWoche, plusTage, tageZwischen, testanmeldungBis, voranmeldungBis, wochentagName } from "@/lib/datum";
import { icsErzeugen, icsHerunterladen, type IcsEreignis } from "@/lib/ics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { neueId } from "@/lib/zufall";
import { cn } from "@/lib/utils";

const PHASEN_FOLGE = ["lernen", "zeitdruck", "simulationen", "generalprobe", "letzte-woche", "testtag"] as const;

function Countdown({ tag, test }: { tag: string; test: string }) {
  const d = tageZwischen(tag, test);
  const wochen = Math.floor(d / 7);
  // Phasengrenzen in Tagen vor dem Test
  const grenzen = [
    { name: "Methoden", ab: Infinity, bis: 61 },
    { name: "Zeitdruck", ab: 60, bis: 43 },
    { name: "Simulationen", ab: 42, bis: 15 },
    { name: "Generalprobe", ab: 14, bis: 8 },
    { name: "Letzte Woche", ab: 7, bis: 1 },
  ];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-extrabold tabular-nums">{Math.max(0, d)}</p>
        <p className="text-sm text-muted-foreground">
          Tage bis zum EMS · {formatTag(test)}
        </p>
      </div>
      {d > 0 && <p className="text-sm">Das sind {wochen} Wochen und {d % 7} Tage.</p>}
      <ol className="flex gap-1" aria-label="Phasen bis zum Test">
        {grenzen.map((g) => {
          const aktiv = d <= g.ab && d >= g.bis;
          const vorbei = d < g.bis;
          return (
            <li key={g.name} className="flex-1">
              <div className={cn("h-2 rounded-full", aktiv ? "bg-primary" : vorbei ? "bg-primary/40" : "bg-muted")} />
              <p className={cn("mt-1 text-[10px] leading-tight", aktiv ? "font-bold" : "text-muted-foreground")}>{g.name}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TagKarte({ p, istHeute }: { p: PlanTag; istHeute: boolean }) {
  const minuten = p.aufgaben.reduce((s, a) => s + a.minuten, 0);
  return (
    <li className={cn("rounded-2xl border-2 p-3", istHeute && "border-primary")}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="font-extrabold">
          {wochentagName(p.tag)} <span className="font-semibold text-muted-foreground">{formatTag(p.tag, "kurz")}</span>
        </p>
        <span className="text-xs font-bold text-muted-foreground">{p.frei && minuten === 0 ? "frei" : `${minuten} min`}</span>
      </div>
      {p.aufgaben.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {p.aufgaben.map((a) => (
            <li key={a.id} className="flex justify-between gap-2">
              <Link to={a.link} className={cn("hover:underline", a.fest && "font-semibold", a.art === "frist" && "text-flamme")}>
                {a.titel}
              </Link>
              {a.minuten > 0 && <span className="shrink-0 text-xs text-muted-foreground">{a.minuten}′</span>}
            </li>
          ))}
        </ul>
      )}
      {p.hinweise.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{p.hinweise.join(" · ")}</p>}
    </li>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIcsExport() {
  const stand = usePlanStand();
  const [e] = useEinstellungen();
  return (wochen: number) => {
    const t = testdatum(e);
    const von = heute();
    const anzahl = Math.max(1, Math.min(wochen * 7, tageZwischen(von, t) + 1));
    const tage = planeTage(von, anzahl, stand);
    const ereignisse: IcsEreignis[] = [];
    for (const p of tage) {
      const lern = p.aufgaben.filter((a) => a.minuten > 0 && !a.fest);
      const minuten = lern.reduce((s, a) => s + a.minuten, 0);
      if (minuten > 0)
        ereignisse.push({ uid: `munggi-${p.tag}-lernen`, titel: `Munggi: ${minuten} min EMS`, beschreibung: lern.map((a) => `• ${a.titel}`).join("\n"), tag: p.tag, zeit: e.erinnerung, minuten, alarmMinutenVorher: 0 });
      for (const a of p.aufgaben.filter((x) => x.fest)) {
        if (a.art === "frist") ereignisse.push({ uid: `munggi-${a.id}`, titel: a.titel, beschreibung: a.beschreibung, tag: p.tag, alarmMinutenVorher: -9 * 60 });
        else if (a.minuten > 0) ereignisse.push({ uid: `munggi-${a.id}`, titel: a.titel, beschreibung: a.beschreibung, tag: p.tag, zeit: a.art === "generalprobe" ? e.testbeginn : "09:00", minuten: a.minuten, alarmMinutenVorher: 60 });
      }
    }
    ereignisse.push({ uid: `munggi-ems-${t}`, titel: "EMS – Testtag", beschreibung: "Viel Erfolg! Ausweis und Aufgebot nicht vergessen.", tag: t, zeit: e.testbeginn, minuten: 235 + e.heftwechselMinuten, alarmMinutenVorher: 24 * 60 });
    icsHerunterladen(icsErzeugen(ereignisse));
    toast.success(`${ereignisse.length} Termine exportiert`);
  };
}

export default function Woche() {
  const store = useSpeicher();
  const stand = usePlanStand();
  const [e] = useEinstellungen();
  const tag = heute();
  const test = testdatum(e);
  const [versatz, setVersatz] = useState(0);
  const montag = plusTage(montagDerWoche(tag), versatz * 7);
  const tage = useMemo(() => planeTage(montag, 7, stand), [montag, stand]);
  const icsExport = useIcsExport();
  const termine = useSammlung<Termin>("termine");
  const [neu, setNeu] = useState<{ titel: string; datum: string; zeit: string; art: Termin["art"] }>({ titel: "", datum: "", zeit: "", art: "ncwiki-simulation" });
  const jahr = Number(test.slice(0, 4));
  const naechsteFeste = useMemo(() => festeTermine(stand, tag, plusTage(tag, 60)).filter((f) => f.aufgabe.minuten > 0 && f.aufgabe.art !== "termin").slice(0, 4), [stand, tag]);
  void PHASEN_FOLGE;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Plan</h1>
        <p className="text-sm text-muted-foreground">
          Tagesgenau bis zum Test. Phase jetzt: <b>{PHASEN_TEXT[phaseFuer(tag, stand)]}</b>
        </p>
      </header>

      <Countdown tag={tag} test={test} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Vorherige Woche" onClick={() => setVersatz((v) => v - 1)} disabled={versatz <= 0}>
            <ChevronLeft />
          </Button>
          <p className="font-bold">
            {versatz === 0 ? "Diese Woche" : versatz === 1 ? "Nächste Woche" : `Woche ab ${formatTag(montag, "kurz")}`}
          </p>
          <Button variant="ghost" size="icon" aria-label="Nächste Woche" onClick={() => setVersatz((v) => v + 1)} disabled={montag > test}>
            <ChevronRight />
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {tage.map((p) => (
            <TagKarte key={p.tag} p={p} istHeute={p.tag === tag} />
          ))}
        </ul>
      </section>

      {naechsteFeste.length > 0 && (
        <section className="flex flex-col gap-1 rounded-2xl border-2 p-3 text-sm">
          <h2 className="font-extrabold">Als Nächstes</h2>
          {naechsteFeste.map((f) => (
            <p key={f.aufgabe.id}>
              {formatTag(f.tag, "mittel")}: {f.aufgabe.titel}
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-3">
        <h2 className="font-extrabold">Kalender</h2>
        <p className="text-sm text-muted-foreground">Lernblöcke um {e.erinnerung}, Simulationen, Fristen (Voranmeldung {formatTag(voranmeldungBis(jahr), "kurz")}, Testanmeldung {formatTag(testanmeldungBis(jahr), "kurz")}) und den Testtag als .ics-Datei für deinen Kalender.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => icsExport(4)}>
            <Download /> Nächste 4 Wochen
          </Button>
          <Button variant="outline" onClick={() => icsExport(60)}>
            <CalendarPlus /> Bis zum Test
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-3" aria-labelledby="termine-titel">
        <h2 id="termine-titel" className="font-extrabold">
          Externe Termine
        </h2>
        <p className="text-xs text-muted-foreground">z. B. NCWiki-Simulation, Probelauf an der Kanti. Der Plan räumt den Tag frei.</p>
        <ul className="flex flex-col gap-1">
          {[...termine]
            .sort((a, b) => a.datum.localeCompare(b.datum))
            .map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-sm">
                <span className="flex-1">
                  <b>{t.titel}</b> · {formatTag(t.datum, "mittel")}
                  {t.zeit ? ` · ${t.zeit}` : ""}
                </span>
                <button type="button" aria-label={`${t.titel} löschen`} onClick={() => void store.loeschen("termine", t.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Titel" value={neu.titel} onChange={(ev) => setNeu({ ...neu, titel: ev.target.value })} className="min-w-0 flex-1" aria-label="Titel des Termins" />
          <select value={neu.art} onChange={(ev) => setNeu({ ...neu, art: ev.target.value as Termin["art"] })} className="h-11 rounded-xl border-2 bg-background px-2 text-sm" aria-label="Art des Termins">
            <option value="ncwiki-simulation">NCWiki-Simulation</option>
            <option value="probelauf">Probelauf</option>
            <option value="frist">Frist</option>
            <option value="sonstiges">Sonstiges</option>
          </select>
          <Input type="date" value={neu.datum} onChange={(ev) => setNeu({ ...neu, datum: ev.target.value })} className="w-40" aria-label="Datum" />
          <Input type="time" value={neu.zeit} onChange={(ev) => setNeu({ ...neu, zeit: ev.target.value })} className="w-28" aria-label="Uhrzeit" />
          <Button
            size="icon"
            aria-label="Termin hinzufügen"
            disabled={!neu.titel.trim() || !neu.datum}
            onClick={async () => {
              await store.speichern<Termin>("termine", neueId(), { titel: neu.titel.trim(), datum: neu.datum, zeit: neu.zeit || undefined, art: neu.art });
              setNeu({ titel: "", datum: "", zeit: "", art: neu.art });
            }}
          >
            <Plus />
          </Button>
        </div>
      </section>
    </div>
  );
}
