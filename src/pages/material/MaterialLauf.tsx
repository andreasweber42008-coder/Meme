import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardCheck,
  Flag,
  Hourglass,
  Lock,
  NotebookPen,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Antwortbogen } from "@/components/material/Antwortbogen";
import { SeitenViewer } from "@/components/material/SeitenViewer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import type { Fehler, Fehlerursache, Lauf } from "@/daten/modelle";
import { BUCHSTABEN } from "@/aufgaben/typen";
import { heute, uhrzeit } from "@/lib/datum";
import { neueId } from "@/lib/zufall";
import { cn } from "@/lib/utils";
import { testdatum } from "@/plan/plan";
import { GRUPPEN_NAMEN, LIZENZ_HINWEIS } from "@/material/katalog";
import { useLaeufe, useMaterialSet, useSeiten, type SetMitId } from "@/material/hooks";
import {
  bewerten,
  bewertungNachGruppe,
  doppelStand,
  doppelVergleich,
  fehlerEintrag,
  fehlerId,
  indexZuBuchstabe,
  loesungswegFuer,
  partnerFuerNeuenLauf,
  URSACHEN,
  ursacheVorschlag,
  versucheAusLauf,
  zeitLimitMs,
  type DoppelKategorie,
  type LaufMitId,
} from "@/material/set";

/* ------------------------------------------------------------------ Hilfen */

function dauerText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sek).padStart(2, "0")}` : `${m}:${String(sek).padStart(2, "0")}`;
}

function datumText(ms: number): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(ms);
}

/** Einprägezeit der Gedächtnistests laut Test-Info 2026 */
function einpraegeMinuten(gruppe: SetMitId["gruppe"]): number | null {
  if (gruppe === "figuren-lernen") return 4;
  if (gruppe === "fakten-lernen") return 6;
  return null;
}

const KATEGORIE_TEXT: Record<DoppelKategorie, { label: string; text: string; farbe: string }> = {
  "beide-richtig": { label: "Sitzt", text: "In beiden Durchgängen richtig.", farbe: "text-richtig" },
  zeitproblem: { label: "Zeitproblem", text: "Unter Zeitdruck falsch, ohne Zeit richtig. Hier hilft Tempo-Training.", farbe: "text-flamme" },
  verstaendnis: { label: "Verständnis", text: "In beiden Durchgängen falsch. Hier lohnt sich die Methode.", farbe: "text-falsch" },
  unsicher: { label: "Unsicher", text: "Mit Zeit richtig, ohne Zeit falsch – vielleicht geraten.", farbe: "text-info" },
};

/* ------------------------------------------------------------------ Seite */

export default function MaterialLauf() {
  const { id = "" } = useParams();
  const set = useMaterialSet(id);
  const laeufe = useLaeufe(id);
  const store = useSpeicher();
  const [laufId, setLaufId] = useState<string | null>(null);
  const [ergebnisId, setErgebnisId] = useState<string | null>(null);

  const starten = useCallback(
    async (modus: Lauf["modus"]) => {
      if (!set) return;
      const partner = partnerFuerNeuenLauf(laeufe, set.id, modus);
      const neu = neueId();
      const lauf: Lauf = { setId: set.id, modus, start: Date.now(), antworten: {}, ...(partner ? { partnerLaufId: partner } : {}) };
      await store.speichern("laeufe", neu, lauf);
      setErgebnisId(null);
      setLaufId(neu);
    },
    [set, laeufe, store],
  );

  if (!set)
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-semibold">Dieses Set gibt es (noch) nicht auf diesem Gerät.</p>
        <Link to="/material" className={buttonVariants({ variant: "outline" })}>
          Zur Bibliothek
        </Link>
      </div>
    );

  const lauf = laeufe.find((l) => l.id === laufId);
  if (lauf && lauf.ende === undefined)
    return (
      <Durchgang
        set={set}
        lauf={lauf}
        onPause={() => setLaufId(null)}
        onFertig={(fertigId) => {
          setLaufId(null);
          setErgebnisId(fertigId);
        }}
      />
    );

  const ergebnis = ergebnisId ? laeufe.find((l) => l.id === ergebnisId) : undefined;
  if (ergebnis) return <Ergebnis set={set} lauf={ergebnis} laeufe={laeufe} onStart={starten} onZurueck={() => setErgebnisId(null)} />;

  return <StartAnsicht set={set} laeufe={laeufe} onStart={starten} onWeiter={setLaufId} onErgebnis={setErgebnisId} />;
}

/* ------------------------------------------------------------------ Start */

function StartAnsicht({
  set,
  laeufe,
  onStart,
  onWeiter,
  onErgebnis,
}: {
  set: SetMitId;
  laeufe: LaufMitId[];
  onStart: (m: Lauf["modus"]) => void;
  onWeiter: (id: string) => void;
  onErgebnis: (id: string) => void;
}) {
  const store = useSpeicher();
  const offen = laeufe.filter((l) => l.ende === undefined).sort((a, b) => b.start - a.start)[0];
  const fertig = laeufe.filter((l) => l.ende !== undefined).sort((a, b) => (b.ende ?? 0) - (a.ende ?? 0));
  const doppel = doppelStand(laeufe, set.id);
  const mitSchluessel = set.schluessel.filter(Boolean).length;
  const hatZeit = set.zeitMinuten > 0;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/material" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Bibliothek
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold leading-tight">{set.titel}</h1>
        <div className="flex flex-wrap gap-1">
          <Badge className={set.quelle === "ncwiki" ? "border-herkunft-ncwiki text-herkunft-ncwiki" : ""}>
            {set.quelle === "ncwiki" ? "NCWiki" : set.quelle === "offiziell" ? "swissuniversities" : "Eigenes"}
          </Badge>
          <Badge>{GRUPPEN_NAMEN[set.gruppe]}</Badge>
          {set.jahr && <Badge>{set.jahr}</Badge>}
          <Badge className={set.status === "geprueft" ? "border-richtig text-richtig" : "border-gold text-foreground"}>
            {set.status === "geprueft" ? "geprüft" : "neu"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {set.anzahl > 0 ? `${set.anzahl} Aufgaben` : "Ohne Antwortbogen"}
          {hatZeit ? ` · ${set.zeitMinuten} min` : ""}
          {set.anzahl > 0 ? ` · Schlüssel für ${mitSchluessel}/${set.anzahl}` : ""}
        </p>
        {set.hinweis && <p className="text-sm text-muted-foreground">{set.hinweis}</p>}
      </header>

      {set.status !== "geprueft" && (
        <Card className="border-gold/60">
          <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
            <AlertTriangle className="h-5 w-5 shrink-0 text-gold" aria-hidden />
            <p className="flex-1 text-sm">Die Erkennung ist eine Vermutung. Prüf kurz Schlüssel und Seiten, dann stimmt die Auswertung.</p>
            <Link to={`/material/${set.id}/pruefen`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ClipboardCheck /> Prüfen
            </Link>
          </CardContent>
        </Card>
      )}

      {offen && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm">
              Offener Durchgang ({offen.modus === "zeit" ? "mit Zeit" : "ohne Zeit"}) vom {datumText(offen.start)}.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => onWeiter(offen.id)}>
                <Play /> Weiter
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Offenen Durchgang verwerfen?")) void store.loeschen("laeufe", offen.id);
                }}
              >
                Verwerfen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Doppeldurchgang</CardTitle>
          <p className="text-sm text-muted-foreground">
            Erst mit Originalzeit, dann dasselbe Set ohne Zeit. So siehst Du, was ein Zeitproblem ist und was ein Verständnisproblem.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ol className="flex flex-col gap-1 text-sm">
            <li className="flex items-center gap-2">
              {doppel.stand !== "offen" ? <Check className="h-4 w-4 text-richtig" /> : <Timer className="h-4 w-4 text-muted-foreground" />}
              1. Durchgang mit Zeit{doppel.mitZeit?.ende ? ` · ${datumText(doppel.mitZeit.ende)}` : ""}
            </li>
            <li className="flex items-center gap-2">
              {doppel.stand === "fertig" ? <Check className="h-4 w-4 text-richtig" /> : <Hourglass className="h-4 w-4 text-muted-foreground" />}
              2. Durchgang ohne Zeit{doppel.ohneZeit?.ende ? ` · ${datumText(doppel.ohneZeit.ende)}` : ""}
            </li>
          </ol>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" variant={doppel.stand === "zweiter-offen" ? "outline" : "default"} disabled={!hatZeit || !!offen} onClick={() => onStart("zeit")}>
              <Timer /> Mit Zeit{hatZeit ? ` (${set.zeitMinuten} min)` : ""}
            </Button>
            <Button className="flex-1" variant={doppel.stand === "zweiter-offen" || !hatZeit ? "default" : "outline"} disabled={!!offen} onClick={() => onStart("ohne-zeit")}>
              <Hourglass /> {doppel.stand === "zweiter-offen" ? "2. Durchgang ohne Zeit" : "Ohne Zeit"}
            </Button>
          </div>
          {doppel.stand === "fertig" && doppel.ohneZeit && (
            <Button variant="link" className="self-start px-0" onClick={() => onErgebnis(doppel.ohneZeit!.id)}>
              Vergleich ansehen
            </Button>
          )}
        </CardContent>
      </Card>

      {fertig.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Bisherige Durchgänge</h2>
          <ul className="flex flex-col gap-2">
            {fertig.slice(0, 8).map((l) => {
              const b = bewerten(set, l.antworten);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onErgebnis(l.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left hover:border-primary/50"
                  >
                    {l.modus === "zeit" ? <Timer className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Hourglass className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 text-sm">
                      <span className="font-bold">{set.anzahl > 0 ? `${b.richtig}/${b.gewertet} richtig` : "Fertig"}</span>
                      <span className="text-muted-foreground"> · {l.modus === "zeit" ? "mit Zeit" : "ohne Zeit"} · {datumText(l.ende!)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to={`/material/${set.id}/pruefen`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ClipboardCheck /> Schlüssel und Seiten
        </Link>
      </div>
      {set.quelle === "ncwiki" && <p className="text-xs text-muted-foreground">Quelle: NCWiki · {LIZENZ_HINWEIS}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ Durchgang */

function Durchgang({ set, lauf, onPause, onFertig }: { set: SetMitId; lauf: LaufMitId; onPause: () => void; onFertig: (id: string) => void }) {
  const store = useSpeicher();
  const { seiten, laedt, fehler } = useSeiten(set, "aufgaben");
  const [index, setIndex] = useState(0);
  const [bogenOffen, setBogenOffen] = useState(false);
  const [countdown, setCountdown] = useState(false);
  const [jetzt, setJetzt] = useState(Date.now());
  const [manuellAbruf, setManuellAbruf] = useState(false);
  const abgegeben = useRef(false);

  const limit = zeitLimitMs(set, lauf.modus);
  const ende = limit !== null ? lauf.start + limit : null;
  const rest = ende !== null ? ende - jetzt : null;

  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Gedächtnistests mit separatem Abruf-Heft: erst Einprägen (Bogen und Notizen gesperrt), dann Abruf
  const hatAbruf = set.dateien.some((d) => d.rolle === "abruf");
  const einpraegen = einpraegeMinuten(set.gruppe);
  const phase: "einpraegen" | "abruf" | null = !hatAbruf
    ? null
    : lauf.modus === "zeit" && einpraegen
      ? jetzt - lauf.start < einpraegen * 60_000
        ? "einpraegen"
        : "abruf"
      : manuellAbruf
        ? "abruf"
        : "einpraegen";
  const sichtbar = useMemo(
    () => (phase === null ? seiten : seiten.filter((s) => (phase === "abruf" ? s.rolle === "abruf" : s.rolle !== "abruf"))),
    [seiten, phase],
  );
  useEffect(() => setIndex(0), [phase]);
  const gesperrt = phase === "einpraegen";

  const abgeben = useCallback(async () => {
    if (abgegeben.current) return;
    abgegeben.current = true;
    const aktuell = store.hole<Lauf>("laeufe", lauf.id) ?? lauf;
    const schluss = Date.now();
    const dauerMs = limit !== null ? Math.min(schluss - aktuell.start, limit) : schluss - aktuell.start;
    const b = bewerten(set, aktuell.antworten);
    const fertig: LaufMitId = { ...aktuell, id: lauf.id, ende: schluss, dauerMs, richtig: b.richtig };
    await store.aendern<Lauf>("laeufe", lauf.id, { ende: schluss, dauerMs, richtig: b.richtig });
    if (aktuell.partnerLaufId) await store.aendern<Lauf>("laeufe", aktuell.partnerLaufId, { partnerLaufId: lauf.id });
    const versuche = versucheAusLauf(set, fertig, heute());
    if (versuche.length)
      await store.einmischen(
        versuche.map((v) => ({ sammlung: "versuche", id: v.id, daten: v.daten, geloescht: false, geaendert: schluss })),
        false,
      );
    if (set.anzahl > 0) toast.success(`${b.richtig} von ${b.gewertet} richtig – stark, dass Du dranbleibst!`);
    onFertig(lauf.id);
  }, [store, lauf, limit, set, onFertig]);

  useEffect(() => {
    if (rest !== null && rest <= 0 && !abgegeben.current) {
      toast("Zeit ist um. Der Bogen wird ausgewertet.");
      void abgeben();
    }
  }, [rest, abgeben]);

  const antworten = lauf.antworten;
  const aendern = useCallback(
    (nr: number, a: number | null) => {
      const alt = store.hole<Lauf>("laeufe", lauf.id);
      void store.aendern<Lauf>("laeufe", lauf.id, { antworten: { ...(alt?.antworten ?? {}), [String(nr)]: a } });
    },
    [store, lauf.id],
  );

  const zuAufgabe = useCallback(
    (nr: number) => {
      const s = set.seiten[String(nr)];
      const i = sichtbar.findIndex((x) => x.nr === s);
      if (i >= 0) {
        setIndex(i);
        setBogenOffen(false);
      }
    },
    [set.seiten, sichtbar],
  );

  const aktiveNr = useMemo(() => {
    const seite = sichtbar[index]?.nr;
    const treffer = Object.entries(set.seiten).find(([, s]) => s === seite);
    return treffer ? Number(treffer[0]) : undefined;
  }, [sichtbar, index, set.seiten]);

  const restAnkreuzen = (b: number) => {
    const alt = store.hole<Lauf>("laeufe", lauf.id)?.antworten ?? {};
    const neu = { ...alt };
    for (let i = 0; i < set.anzahl; i++) {
      const k = String(set.ersteNr + i);
      if (typeof neu[k] !== "number") neu[k] = b;
    }
    void store.aendern<Lauf>("laeufe", lauf.id, { antworten: neu });
  };

  const offen = Array.from({ length: set.anzahl }, (_, i) => antworten[String(set.ersteNr + i)]).filter((a) => typeof a !== "number").length;
  const abgebenFragen = () => {
    const text = set.anzahl > 0 && offen > 0 ? `Noch ${offen} leer. Im EMS gibt es keinen Abzug – trotzdem abgeben?` : "Abgeben und auswerten?";
    if (window.confirm(text)) void abgeben();
  };

  const bogen = set.anzahl > 0 && (
    <div className="flex flex-col gap-3">
      <Antwortbogen
        anzahl={set.anzahl}
        ersteNr={set.ersteNr}
        antworten={antworten}
        onChange={aendern}
        gesperrt={gesperrt}
        sperrHinweis="Einprägen: Bogen gesperrt"
        aktiveNr={aktiveNr}
        onNrWaehlen={Object.keys(set.seiten).length ? zuAufgabe : undefined}
      />
      {!gesperrt && offen > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border-2 border-dashed p-2">
          <span className="text-xs font-semibold text-muted-foreground">Leere ankreuzen mit (immer derselbe Buchstabe):</span>
          <div className="flex gap-1">
            {BUCHSTABEN.map((b, i) => (
              <Button key={b} variant="outline" size="sm" className="h-8 w-8 px-0" onClick={() => restAnkreuzen(i)}>
                {b}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={`Durchgang ${set.titel}`}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 px-2 sm:px-3">
        <Button variant="ghost" size="icon" aria-label="Pausieren und schliessen" onClick={onPause}>
          <X />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{set.titel}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lauf.modus === "zeit" ? "mit Zeit" : "ohne Zeit"}
            {phase ? ` · ${phase === "einpraegen" ? "Einprägen" : "Abruf"}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCountdown((c) => !c)}
          className="flex flex-col items-end rounded-lg px-2 py-1 text-right tabular hover:bg-muted"
          aria-label={countdown ? "Uhrzeit zeigen" : "Restzeit zeigen"}
          title="Im EMS gibt es keine Restzeit-Ansage. Tippen wechselt die Anzeige."
        >
          {countdown && rest !== null ? (
            <span className={cn("text-base font-extrabold", rest < 60_000 && "text-falsch")}>{dauerText(rest)}</span>
          ) : (
            <span className="flex items-center gap-1 text-base font-extrabold">
              <Clock className="h-4 w-4" aria-hidden /> {uhrzeit(new Date(jetzt))}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {ende !== null ? `Ende ${uhrzeit(new Date(ende))}` : `seit ${dauerText(jetzt - lauf.start)}`}
          </span>
        </button>
        <Button size="sm" onClick={abgebenFragen}>
          <Flag /> <span className="hidden sm:inline">Abgeben</span>
        </Button>
      </header>

      {phase === "einpraegen" && (
        <div className="flex shrink-0 items-center gap-2 border-b-2 bg-gold/15 px-3 py-2 text-sm">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">Einprägephase: keine Notizen, Antwortbogen gesperrt.</span>
          {lauf.modus !== "zeit" && (
            <Button size="sm" variant="outline" onClick={() => setManuellAbruf(true)}>
              Zum Abruf
            </Button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <SeitenViewer
          className="min-w-0 flex-1 p-2"
          setId={set.id}
          seiten={sichtbar}
          laedt={laedt}
          fehler={fehler}
          index={index}
          onIndex={setIndex}
          notizenGesperrt={gesperrt}
        />
        {set.anzahl > 0 && <aside className="hidden w-80 shrink-0 overflow-y-auto border-l-2 p-3 md:block">{bogen}</aside>}
      </div>

      {set.anzahl > 0 && (
        <div className="shrink-0 border-t-2 bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
            onClick={() => setBogenOffen((o) => !o)}
            aria-expanded={bogenOffen}
          >
            <span>
              Antwortbogen · {set.anzahl - offen}/{set.anzahl}
            </span>
            {bogenOffen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
          {bogenOffen && <div className="max-h-[55dvh] overflow-y-auto px-3 pb-3">{bogen}</div>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Ergebnis */

function Ergebnis({
  set,
  lauf,
  laeufe,
  onStart,
  onZurueck,
}: {
  set: SetMitId;
  lauf: LaufMitId;
  laeufe: LaufMitId[];
  onStart: (m: Lauf["modus"]) => void;
  onZurueck: () => void;
}) {
  const store = useSpeicher();
  const navigate = useNavigate();
  const [einstellungen] = useEinstellungen();
  const fehlerheft = useSammlung<Fehler>("fehlerheft");
  const imHeft = useMemo(() => new Set(fehlerheft.map((f) => f.id)), [fehlerheft]);
  const b = useMemo(() => bewerten(set, lauf.antworten), [set, lauf.antworten]);
  const [offenNr, setOffenNr] = useState<number | null>(null);
  const [ansicht, setAnsicht] = useState<"aufgaben" | "loesungen" | null>(null);
  const [index, setIndex] = useState(0);
  const aufgabenSeiten = useSeiten(ansicht === "aufgaben" ? set : undefined, "aufgaben");
  const loesungsSeiten = useSeiten(ansicht === "loesungen" ? set : undefined, "loesungen");
  const viewer = ansicht === "loesungen" ? loesungsSeiten : aufgabenSeiten;

  const partner = lauf.partnerLaufId ? laeufe.find((l) => l.id === lauf.partnerLaufId && l.ende !== undefined) : undefined;
  const mitZeit = lauf.modus === "zeit" ? lauf : partner?.modus === "zeit" ? partner : undefined;
  const ohneZeit = lauf.modus === "ohne-zeit" ? lauf : partner?.modus === "ohne-zeit" ? partner : undefined;
  const vergleich = mitZeit && ohneZeit ? doppelVergleich(set, mitZeit, ohneZeit) : null;
  const kategorie = useMemo(() => new Map(vergleich?.aufgaben.map((a) => [a.nr, a.kategorie]) ?? []), [vergleich]);
  const nachGruppe = set.gruppe === "simulation" ? bewertungNachGruppe(set, b) : null;
  const falsche = b.aufgaben.filter((a) => a.gewertet && !a.richtig);
  const ohneSchluessel = b.aufgaben.filter((a) => !a.gewertet).length;
  const doppel = doppelStand(laeufe, set.id);

  const insHeft = async (nr: number, ursache: Fehlerursache) => {
    const f = fehlerEintrag(set, nr, ursache, heute(), { testtag: testdatum(einstellungen) });
    if (!f) {
      toast.error("Für diese Aufgabe ist keine Gruppe bekannt. Leg die Bereiche im Prüfmodus fest.");
      return false;
    }
    await store.speichern("fehlerheft", f.id, f.daten);
    return true;
  };

  const alleInsHeft = async () => {
    let n = 0;
    for (const a of falsche) {
      if (imHeft.has(fehlerId(set.id, a.nr))) continue;
      if (await insHeft(a.nr, ursacheVorschlag(kategorie.get(a.nr), a.antwort))) n++;
    }
    toast.success(n ? `${n} Aufgaben im Fehlerheft. Morgen kommen sie wieder.` : "Alles schon im Fehlerheft.");
  };

  const seiteZeigen = (nr: number) => {
    const s = set.seiten[String(nr)];
    setAnsicht("aufgaben");
    setIndex(s ? s - 1 : 0);
  };

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onZurueck} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {set.titel}
      </button>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">Auswertung</h1>
        <p className="text-sm text-muted-foreground">
          {lauf.modus === "zeit" ? "Mit Zeit" : "Ohne Zeit"} · {lauf.ende ? datumText(lauf.ende) : ""} · Dauer {dauerText(lauf.dauerMs ?? 0)}
        </p>
      </header>

      {set.anzahl > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            <p className="text-3xl font-extrabold tabular">
              {b.richtig} <span className="text-lg font-bold text-muted-foreground">von {b.gewertet} richtig</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Im EMS sind im Schnitt etwa 50 % richtig. Jede Aufgabe, die Du hier verstehst, sitzt beim nächsten Mal.
            </p>
            {ohneSchluessel > 0 && (
              <p className="text-sm">
                {ohneSchluessel} Aufgaben ohne Schlüssel.{" "}
                <Link className="font-semibold text-primary underline" to={`/material/${set.id}/pruefen`}>
                  Im Prüfmodus ergänzen
                </Link>
              </p>
            )}
            {nachGruppe && Object.keys(nachGruppe).length > 0 && (
              <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {Object.entries(nachGruppe).map(([g, e]) => (
                  <li key={g} className="flex justify-between gap-2 rounded-lg bg-muted px-2 py-1">
                    <span className="truncate">{GRUPPEN_NAMEN[g as keyof typeof GRUPPEN_NAMEN]}</span>
                    <span className="shrink-0 font-bold tabular">
                      {e!.richtig}/{e!.gesamt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 text-sm">Fertig! Dieses Set hat keinen Antwortbogen – vergleiche mit den Lösungen.</CardContent>
        </Card>
      )}

      {vergleich ? (
        <Card>
          <CardHeader>
            <CardTitle>Doppeldurchgang</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {(Object.keys(KATEGORIE_TEXT) as DoppelKategorie[]).map((k) => (
              <div key={k} className="rounded-xl border-2 p-2">
                <p className={cn("text-2xl font-extrabold tabular", KATEGORIE_TEXT[k].farbe)}>{vergleich.anzahl[k]}</p>
                <p className="text-sm font-bold">{KATEGORIE_TEXT[k].label}</p>
                <p className="text-xs text-muted-foreground">{KATEGORIE_TEXT[k].text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        lauf.modus === "zeit" &&
        doppel.stand === "zweiter-offen" &&
        doppel.mitZeit?.id === lauf.id && (
          <Card className="border-primary/50">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm">Jetzt dasselbe Set ohne Zeit: So trennst Du Zeitprobleme von Verständnisproblemen.</p>
              <Button onClick={() => onStart("ohne-zeit")}>
                <Hourglass /> 2. Durchgang ohne Zeit
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {set.anzahl > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Aufgaben</h2>
            {falsche.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void alleInsHeft()}>
                <NotebookPen /> Alle Falschen ins Fehlerheft
              </Button>
            )}
          </div>
          <ul className="flex flex-col gap-1">
            {b.aufgaben.map((a) => {
              const k = kategorie.get(a.nr);
              const offen = offenNr === a.nr;
              return (
                <li key={a.nr} className="rounded-xl border-2 bg-card">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    onClick={() => setOffenNr(offen ? null : a.nr)}
                    aria-expanded={offen}
                  >
                    <span className="w-8 shrink-0 font-bold tabular text-muted-foreground">{a.nr}</span>
                    {a.gewertet ? (
                      a.richtig ? (
                        <Check className="h-5 w-5 shrink-0 text-richtig" aria-label="richtig" />
                      ) : (
                        <X className="h-5 w-5 shrink-0 text-falsch" aria-label="falsch" />
                      )
                    ) : (
                      <span className="h-5 w-5 shrink-0 text-center text-muted-foreground">?</span>
                    )}
                    <span className="flex-1 truncate">
                      Deine: <b>{indexZuBuchstabe(a.antwort) ?? "–"}</b> · Lösung: <b>{indexZuBuchstabe(a.loesung) ?? "?"}</b>
                    </span>
                    {k && k !== "beide-richtig" && <Badge className={KATEGORIE_TEXT[k].farbe}>{KATEGORIE_TEXT[k].label}</Badge>}
                    {imHeft.has(fehlerId(set.id, a.nr)) && <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="im Fehlerheft" />}
                    {offen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>
                  {offen && (
                    <AufgabeDetail
                      set={set}
                      nr={a.nr}
                      falsch={a.gewertet && !a.richtig}
                      imHeft={imHeft.has(fehlerId(set.id, a.nr))}
                      vorschlag={ursacheVorschlag(k, a.antwort)}
                      onHeft={async (u) => {
                        if (await insHeft(a.nr, u)) toast.success(`Aufgabe ${a.nr} ist im Fehlerheft.`);
                      }}
                      onSeite={set.seiten[String(a.nr)] ? () => seiteZeigen(a.nr) : undefined}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant={ansicht === "aufgaben" ? "secondary" : "outline"} size="sm" onClick={() => (setAnsicht(ansicht === "aufgaben" ? null : "aufgaben"), setIndex(0))}>
            <BookOpen /> Aufgaben
          </Button>
          {set.dateien.some((d) => d.art !== "aufgaben") && (
            <Button variant={ansicht === "loesungen" ? "secondary" : "outline"} size="sm" onClick={() => (setAnsicht(ansicht === "loesungen" ? null : "loesungen"), setIndex(0))}>
              <ClipboardCheck /> Lösungen
            </Button>
          )}
        </div>
        {ansicht && (
          <SeitenViewer
            className="h-[75dvh] rounded-2xl border-2 p-2"
            setId={set.id}
            seiten={viewer.seiten}
            laedt={viewer.laedt}
            fehler={viewer.fehler}
            index={index}
            onIndex={setIndex}
            markierungPraefix={ansicht === "loesungen" ? "L" : ""}
          />
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onZurueck}>
          <RotateCcw /> Zum Set
        </Button>
        <Button variant="ghost" onClick={() => navigate("/material")}>
          Zur Bibliothek
        </Button>
      </div>
    </div>
  );
}

function AufgabeDetail({
  set,
  nr,
  falsch,
  imHeft,
  vorschlag,
  onHeft,
  onSeite,
}: {
  set: SetMitId;
  nr: number;
  falsch: boolean;
  imHeft: boolean;
  vorschlag: Fehlerursache;
  onHeft: (u: Fehlerursache) => void;
  onSeite?: () => void;
}) {
  const weg = loesungswegFuer(set, nr);
  const [ursache, setUrsache] = useState<Fehlerursache>(vorschlag);
  return (
    <div className="flex flex-col gap-3 border-t-2 px-3 py-3 text-sm">
      {weg?.herkunft === "material" && (
        <div className="flex flex-col gap-1">
          <Badge className="self-start border-herkunft-ncwiki text-herkunft-ncwiki">Lösungsweg aus dem Material</Badge>
          <p className="whitespace-pre-line">{weg.text}</p>
        </div>
      )}
      {weg?.herkunft === "ergaenzung" && (
        <div className="flex flex-col gap-1">
          <Badge className="self-start border-herkunft-ergaenzung text-herkunft-ergaenzung">Ergänzung</Badge>
          <p className="text-muted-foreground">
            Das Material hat keinen Lösungsweg. Geh die Aufgabe mit der Methode{" "}
            <Link to={`/methoden/${weg.methodeId}`} className="font-semibold text-primary underline">
              {weg.methodeName}
            </Link>{" "}
            durch:
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {weg.schritte?.map((s) => (
              <li key={s.nr}>
                <b>{s.titel}:</b> {s.tun}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!weg && <p className="text-muted-foreground">Kein Lösungsweg verfügbar. Leg im Prüfmodus die Bereiche fest.</p>}
      {onSeite && (
        <Button variant="link" size="sm" className="self-start px-0" onClick={onSeite}>
          Aufgabe im Heft ansehen
        </Button>
      )}
      {falsch && (
        <div className="flex flex-col gap-2 rounded-xl bg-muted p-2">
          <span className="text-xs font-bold">Woran lag es?</span>
          <div className="flex flex-wrap gap-1">
            {URSACHEN.map((u) => (
              <button
                key={u.id}
                type="button"
                aria-pressed={ursache === u.id}
                onClick={() => setUrsache(u.id)}
                className={cn(
                  "rounded-full border-2 px-3 py-1 text-xs font-bold",
                  ursache === u.id ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}
              >
                {u.label}
              </button>
            ))}
          </div>
          <Button size="sm" className="self-start" onClick={() => onHeft(ursache)}>
            <NotebookPen /> {imHeft ? "Im Fehlerheft aktualisieren" : "Ins Fehlerheft"}
          </Button>
        </div>
      )}
    </div>
  );
}
