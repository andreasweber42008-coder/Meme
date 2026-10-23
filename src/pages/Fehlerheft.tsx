import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import type { AufgabenGruppe, Fehler, Fehlerursache } from "@/daten/modelle";
import { GRUPPEN } from "@/daten/modelle";
import { aufgabeAus } from "@/aufgaben/register";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { fehlerWiederholt, planErledigt } from "@/lernpfad/protokoll";
import { methodeById } from "@/content";
import { UNTERTESTS } from "@/content/untertests";
import { Button } from "@/components/ui/button";
import { Optionen, Stimulus, LeseText } from "@/components/aufgaben/AufgabeAnsicht";
import { FehlerAnalyse, LektionsRahmen, URSACHEN, Uhr, useCountdown } from "@/lektion/gemeinsam";
import type { TextAufgabeDaten } from "@/aufgaben/bank";
import { formatTag, heute } from "@/lib/datum";
import { istFaellig } from "@/lib/srs";
import { ton } from "@/lib/ton";
import { cn } from "@/lib/utils";

type Filter = "faellig" | "offen" | "erledigt";

function gruppenName(g: AufgabenGruppe) {
  return UNTERTESTS.find((u) => u.id === g)?.kurzname ?? g;
}

/* ------------------------------------------------------------------ Wiedervorlage */

function Wiedervorlage({ liste, generalprobe, onEnde }: { liste: Array<Fehler & { id: string }>; generalprobe: boolean; onEnde: () => void }) {
  const store = useSpeicher();
  const eintraege = useMemo(
    () => liste.map((f) => ({ f, a: f.ref.art === "generator" ? aufgabeAus(f.ref.generator, f.ref.seed, f.ref.schwierigkeit, f.methodeId) : undefined })),
    [liste],
  );
  const [i, setI] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [antworten, setAntworten] = useState<Record<number, number | null>>({});
  const [fertig, setFertig] = useState(false);
  const gesamt = generalprobe ? eintraege.reduce((s, e) => s + (e.a?.zielSekunden ?? 60), 0) : 0;
  const rest = useCountdown(gesamt, generalprobe && !fertig, () => void abgeben());

  async function abgeben() {
    for (let k = 0; k < eintraege.length; k++) {
      const { f, a } = eintraege[k];
      if (a) await fehlerWiederholt(store, f.id, antworten[k] === a.loesung);
    }
    await planErledigt(store, `${heute()}:fehler-generalprobe`, Math.round(gesamt / 60));
    setFertig(true);
  }

  if (fertig) {
    const richtig = eintraege.filter((e, k) => e.a && antworten[k] === e.a.loesung).length;
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <h2 className="text-2xl font-extrabold">
          {richtig} von {eintraege.filter((e) => e.a).length} richtig
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">Ab jetzt nur noch leicht wiederholen. Die schweren Aufgaben hast du eine Woche vor dem Test geprobt – genau richtig.</p>
        <Button onClick={onEnde}>Zum Fehlerheft</Button>
      </div>
    );
  }

  const e = eintraege[i];
  if (!e) {
    onEnde();
    return null;
  }
  const weiter = () => {
    setWahl(null);
    setAufgedeckt(false);
    if (i + 1 < eintraege.length) setI(i + 1);
    else if (generalprobe) void abgeben();
    else onEnde();
  };
  const methode = e.f.methodeId ? methodeById(e.f.methodeId) : undefined;

  return (
    <LektionsRahmen
      titel={generalprobe ? "Generalprobe mit deinen schweren Aufgaben" : "Wiedervorlage"}
      untertitel={`${gruppenName(e.f.gruppe)} · ${i + 1} von ${eintraege.length}`}
      fortschritt={i / eintraege.length}
      rechts={generalprobe ? <Uhr sekunden={rest} /> : undefined}
      zurueck="/fehlerheft"
      fuss={
        !e.a ? undefined : generalprobe ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setAntworten((x) => ({ ...x, [i]: wahl }));
              weiter();
            }}
          >
            {i + 1 < eintraege.length ? "Nächste" : "Abgeben"} <ChevronRight />
          </Button>
        ) : aufgedeckt ? (
          <Button size="lg" className="w-full" onClick={weiter}>
            Weiter <ChevronRight />
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            disabled={wahl === null}
            onClick={async () => {
              const ok = wahl === e.a!.loesung;
              if (ok) ton.richtig();
              else ton.falsch();
              setAufgedeckt(true);
              await fehlerWiederholt(store, e.f.id, ok);
            }}
          >
            Prüfen
          </Button>
        )
      }
    >
      {e.a ? (
        <>
          {e.a.generator === "text" && <LeseText titel={(e.a.daten as TextAufgabeDaten).titel} absaetze={(e.a.daten as TextAufgabeDaten).absaetze} />}
          <Stimulus aufgabe={e.a} />
          <p className="font-bold">{e.a.frage}</p>
          <Optionen aufgabe={e.a} gewaehlt={wahl} aufgedeckt={aufgedeckt} onWahl={setWahl} />
          {aufgedeckt && (
            <div className="flex flex-col gap-2">
              {wahl === e.a.loesung ? (
                <p className="flex items-center gap-2 font-bold text-richtig">
                  <CheckCircle2 className="h-5 w-5" /> Jetzt sitzt es!
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-bold text-falsch">
                    <XCircle className="h-5 w-5" /> Richtig wäre {BUCHSTABEN[e.a.loesung]}.
                  </p>
                  {methode && <FehlerAnalyse option={wahl !== null ? e.a.optionen[wahl] : undefined} methode={methode} ursache={e.f.ursache} onUrsache={() => {}} kurz />}
                </>
              )}
              <ol className="list-decimal rounded-xl border-2 p-3 pl-7 text-sm">
                {e.a.loesungsweg.map((s, k) => (
                  <li key={k}>{s.text}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      ) : (
        <NichtWiederherstellbar f={e.f} onAntwort={async (ok) => {
          await fehlerWiederholt(store, e.f.id, ok);
          weiter();
        }} />
      )}
    </LektionsRahmen>
  );
}

function NichtWiederherstellbar({ f, onAntwort }: { f: Fehler & { id: string }; onAntwort: (ok: boolean) => void }) {
  const schritt = f.methodeId && f.schritt ? methodeById(f.methodeId)?.schritte.find((s) => s.nr === f.schritt) : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border-2 p-3 text-sm">
        {f.denkfehler && <p><b>Fehler:</b> {f.denkfehler}</p>}
        {schritt && (
          <p className="mt-1">
            <b>Schritt {schritt.nr} «{schritt.titel}»:</b> {schritt.tun}
          </p>
        )}
        {f.notiz && <p className="mt-1 italic">{f.notiz}</p>}
        {f.ref.art === "material" && (
          <Link to={`/material/${f.ref.setId}?nr=${f.ref.nr}`} className="mt-2 inline-block font-semibold text-primary">
            Aufgabe {f.ref.nr} im Material öffnen →
          </Link>
        )}
      </div>
      <p className="text-sm">Geh den Schritt im Kopf nochmals durch. Sitzt er jetzt?</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onAntwort(false)}>Noch nicht</Button>
        <Button onClick={() => onAntwort(true)}>Ja, sitzt</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Seite */

export default function Fehlerheft() {
  const store = useSpeicher();
  const alle = useSammlung<Fehler>("fehlerheft");
  const [params, setParams] = useSearchParams();
  const tag = heute();
  const [filter, setFilter] = useState<Filter>("faellig");
  const [gruppe, setGruppe] = useState<AufgabenGruppe | "alle">("alle");
  const [modus, setModus] = useState<null | "wiederholen" | "generalprobe">(params.get("generalprobe") ? "generalprobe" : null);

  const sortiert = useMemo(() => [...alle].sort((a, b) => b.zeit - a.zeit), [alle]);
  const gefiltert = sortiert.filter(
    (f) =>
      (gruppe === "alle" || f.gruppe === gruppe) &&
      (filter === "erledigt" ? f.erledigt : !f.erledigt && (filter === "offen" || istFaellig(f.srs, tag))),
  );
  const faellig = sortiert.filter((f) => !f.erledigt && istFaellig(f.srs, tag));
  const strich = URSACHEN.map((u) => ({ ...u, n: sortiert.filter((f) => f.ursache === u.id).length }));
  const maxStrich = Math.max(1, ...strich.map((s) => s.n));

  if (modus) {
    const liste = modus === "generalprobe" ? sortiert.filter((f) => !f.erledigt).slice(0, 25) : faellig.slice(0, 20);
    return (
      <Wiedervorlage
        liste={liste}
        generalprobe={modus === "generalprobe"}
        onEnde={() => {
          setModus(null);
          if (params.get("generalprobe")) setParams({});
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Fehlerheft</h1>
        <p className="text-sm text-muted-foreground">Jeder Fehler mit Ursache und Methodenschritt. Wiedervorlage nach 1, 3, 7, 14 … Tagen.</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" disabled={faellig.length === 0} onClick={() => setModus("wiederholen")}>
          <RotateCcw /> {faellig.length} fällig
        </Button>
        <Button size="lg" variant="outline" disabled={sortiert.filter((f) => !f.erledigt).length === 0} onClick={() => setModus("generalprobe")}>
          Fehler-Generalprobe
        </Button>
      </div>

      <section className="flex flex-col gap-1.5 rounded-2xl border-2 p-3" aria-labelledby="strich-titel">
        <h2 id="strich-titel" className="text-sm font-extrabold">Strichliste nach Ursache</h2>
        {strich.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-48 shrink-0 truncate">{s.text}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-info" style={{ width: `${(s.n / maxStrich) * 100}%` }} />
            </div>
            <span className="w-6 text-right font-bold tabular-nums">{s.n}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-1.5">
        {(["faellig", "offen", "erledigt"] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border-2 px-3 py-1 text-sm font-semibold", filter === f && "border-primary bg-primary/10 text-primary")}>
            {f === "faellig" ? "Fällig" : f === "offen" ? "Alle offenen" : "Erledigt"}
          </button>
        ))}
        <select value={gruppe} onChange={(e) => setGruppe(e.target.value as AufgabenGruppe | "alle")} className="ml-auto h-9 rounded-full border-2 bg-background px-2 text-sm" aria-label="Gruppe">
          <option value="alle">Alle Gruppen</option>
          {GRUPPEN.map((g) => (
            <option key={g} value={g}>
              {gruppenName(g)}
            </option>
          ))}
        </select>
      </div>

      <ul className="flex flex-col gap-2">
        {gefiltert.map((f) => {
          const m = f.methodeId ? methodeById(f.methodeId) : undefined;
          const schritt = m?.schritte.find((s) => s.nr === f.schritt);
          return (
            <li key={f.id} className="flex flex-col gap-1.5 rounded-2xl border-2 bg-card p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{gruppenName(f.gruppe)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTag(f.tag, "kurz")} · nächste {formatTag(f.srs.faellig, "kurz")}
                </span>
              </div>
              {f.denkfehler && <p>{f.denkfehler}</p>}
              {schritt && (
                <p className="text-muted-foreground">
                  {m!.name}, Schritt {schritt.nr} «{schritt.titel}»
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {URSACHEN.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => void store.aendern<Fehler>("fehlerheft", f.id, { ursache: u.id as Fehlerursache })}
                    className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", f.ursache === u.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
                  >
                    {u.text}
                  </button>
                ))}
              </div>
              <input
                defaultValue={f.notiz ?? ""}
                placeholder="Notiz: Was mache ich nächstes Mal anders?"
                onBlur={(e) => e.target.value !== (f.notiz ?? "") && void store.aendern<Fehler>("fehlerheft", f.id, { notiz: e.target.value })}
                className="rounded-lg border bg-background px-2 py-1.5 text-sm"
                aria-label="Notiz"
              />
            </li>
          );
        })}
        {gefiltert.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{filter === "faellig" ? "Heute ist nichts fällig – stark!" : "Keine Einträge."}</p>}
      </ul>
    </div>
  );
}
