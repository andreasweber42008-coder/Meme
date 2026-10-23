import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileUp,
  Hourglass,
  Layers,
  Library,
  Link2,
  Loader2,
  Play,
  ShieldCheck,
  Square,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeicher } from "@/daten/DatenProvider";
import type { MaterialDatei, MaterialSet } from "@/daten/modelle";
import { untertestById } from "@/content/untertests";
import { cn } from "@/lib/utils";
import { erkenneGruppe } from "@/material/erkennung";
import {
  ERLAUBTE_HOSTS,
  GRUPPEN_NAMEN,
  GRUPPEN_REIHENFOLGE,
  katalogNachGruppe,
  LIZENZ_HINWEIS,
  OFFIZIELL,
  urlErlaubt,
  type KatalogSet,
  type OffiziellEintrag,
} from "@/material/katalog";
import { useLaeufe, useMaterialSets, type SetMitId } from "@/material/hooks";
import {
  artAusName,
  eigenesSetAnlegen,
  infoKartenImportieren,
  katalogSetImportieren,
  katalogSetMitDateien,
  offiziellSetImportieren,
  urlSetImportieren,
} from "@/material/import";
import { bewerten, doppelStand, letzterLauf, type LaufMitId } from "@/material/set";
import { ERLAUBTE_TYPEN, MAX_BYTES } from "@/material/speicher";

type Tab = "meine" | "ncwiki" | "offiziell" | "eigene";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "meine", label: "Meine Sets" },
  { id: "ncwiki", label: "NCWiki" },
  { id: "offiziell", label: "Offiziell" },
  { id: "eigene", label: "Eigene" },
];

type Gruppe = MaterialSet["gruppe"];

function fehlerText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function ohne(f: Record<string, string>, id: string): Record<string, string> {
  const rest = { ...f };
  delete rest[id];
  return rest;
}

function standardMinuten(g: Gruppe): number {
  if (g === "simulation") return 235;
  const m = untertestById(g).minuten;
  if (!m) return 0;
  return m.split("+").reduce((s, x) => s + (parseInt(x, 10) || 0), 0);
}

export default function MaterialBibliothek() {
  const [params, setParams] = useSearchParams();
  const sets = useMaterialSets();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? (sets.length ? "meine" : "ncwiki")) as Tab;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">Material</h1>
        <p className="text-sm text-muted-foreground">Übungsserien und Simulationen mit Antwortbogen, Doppeldurchgang und Fehlerheft.</p>
      </header>

      <div role="tablist" aria-label="Material" className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn(
              "truncate rounded-xl px-1 py-2 text-xs font-bold sm:text-sm",
              tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "meine" && <MeineSets sets={sets} />}
        {tab === "ncwiki" && <NcwikiKatalog sets={sets} />}
        {tab === "offiziell" && <Offiziell sets={sets} />}
        {tab === "eigene" && <Eigene />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Meine Sets */

function MeineSets({ sets }: { sets: SetMitId[] }) {
  const laeufe = useLaeufe();
  const gruppen = useMemo(
    () =>
      GRUPPEN_REIHENFOLGE.map((g) => ({
        g,
        liste: sets.filter((s) => s.gruppe === g).sort((a, b) => (b.jahr ?? 0) - (a.jahr ?? 0) || a.titel.localeCompare(b.titel, "de")),
      })).filter((x) => x.liste.length),
    [sets],
  );

  if (sets.length === 0)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Library className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Noch kein Material importiert.</p>
          <p className="text-sm text-muted-foreground">Hol dir NCWiki-Serien mit einem Tipp oder lade eigene PDFs hoch.</p>
          <Link to="?tab=ncwiki" className={buttonVariants()}>
            Zum NCWiki-Katalog
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <div className="flex flex-col gap-5">
      {gruppen.map(({ g, liste }) => (
        <section key={g} className="flex flex-col gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{GRUPPEN_NAMEN[g]}</h2>
          <ul className="flex flex-col gap-2">
            {liste.map((s) => (
              <SetZeile key={s.id} set={s} laeufe={laeufe} />
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">{LIZENZ_HINWEIS}. Alles liegt nur in deinem privaten Speicher.</p>
    </div>
  );
}

function SetZeile({ set, laeufe }: { set: SetMitId; laeufe: LaufMitId[] }) {
  const letzter = letzterLauf(laeufe, set.id);
  const doppel = doppelStand(laeufe, set.id);
  const b = letzter && set.anzahl > 0 ? bewerten(set, letzter.antworten) : null;
  return (
    <li className="flex items-center gap-2 rounded-2xl border-2 bg-card p-3">
      <Link to={`/material/${set.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-bold leading-tight">{set.titel}</span>
        <span className="flex flex-wrap gap-1">
          <Badge className={set.status === "geprueft" ? "border-richtig text-richtig" : "border-gold"}>{set.status === "geprueft" ? "geprüft" : "neu"}</Badge>
          {set.quelle === "ncwiki" && <Badge className="border-herkunft-ncwiki text-herkunft-ncwiki">NCWiki</Badge>}
          {set.quelle === "offiziell" && <Badge>swissuniversities</Badge>}
          {set.quelle === "eigen" && <Badge>Eigen</Badge>}
          {doppel.stand === "zweiter-offen" && (
            <Badge className="border-flamme text-flamme">
              <Hourglass className="h-3 w-3" /> 2. Durchgang offen
            </Badge>
          )}
          {doppel.stand === "fertig" && <Badge className="border-richtig text-richtig">Doppeldurchgang fertig</Badge>}
        </span>
        <span className="text-xs text-muted-foreground">
          {set.anzahl > 0 ? `${set.anzahl} Aufgaben` : "ohne Bogen"}
          {set.zeitMinuten ? ` · ${set.zeitMinuten} min` : ""}
          {b ? ` · zuletzt ${b.richtig}/${b.gewertet}` : " · noch nicht bearbeitet"}
        </span>
      </Link>
      {set.status !== "geprueft" ? (
        <Link to={`/material/${set.id}/pruefen`} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={`${set.titel} prüfen`}>
          <ClipboardCheck /> <span className="hidden sm:inline">Prüfen</span>
        </Link>
      ) : (
        <Link to={`/material/${set.id}`} className={buttonVariants({ size: "sm" })} aria-label={`${set.titel} starten`}>
          <Play /> <span className="hidden sm:inline">Starten</span>
        </Link>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ NCWiki */

function NcwikiKatalog({ sets }: { sets: SetMitId[] }) {
  const store = useSpeicher();
  const vorhanden = useMemo(() => new Set(sets.map((s) => s.katalogId ?? s.id)), [sets]);
  const katalog = useMemo(() => katalogNachGruppe(), []);
  const [aktiv, setAktiv] = useState<{ id: string; schritt: string } | null>(null);
  const [bulk, setBulk] = useState<{ gruppe: Gruppe; fertig: number; gesamt: number } | null>(null);
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const stopp = useRef(false);
  const beschaeftigt = aktiv !== null || bulk !== null;

  const importieren = async (k: KatalogSet): Promise<boolean> => {
    setAktiv({ id: k.id, schritt: "Starte …" });
    try {
      await katalogSetImportieren(store, k, (schritt) => setAktiv({ id: k.id, schritt }));
      setFehler((f) => ohne(f, k.id));
      return true;
    } catch (e) {
      setFehler((f) => ({ ...f, [k.id]: fehlerText(e) }));
      return false;
    } finally {
      setAktiv(null);
    }
  };

  const einzeln = async (k: KatalogSet) => {
    if (await importieren(k)) toast.success(`«${k.titel}» ist bereit. Kurz prüfen, dann los!`);
    else toast.error(`«${k.titel}» konnte nicht abgerufen werden.`);
  };

  const alleEinerGruppe = async (gruppe: Gruppe, liste: KatalogSet[]) => {
    const offen = liste.filter((k) => !vorhanden.has(k.id));
    if (offen.length === 0) return;
    stopp.current = false;
    let ok = 0;
    setBulk({ gruppe, fertig: 0, gesamt: offen.length });
    for (const [i, k] of offen.entries()) {
      if (stopp.current) break;
      if (await importieren(k)) ok++;
      setBulk({ gruppe, fertig: i + 1, gesamt: offen.length });
    }
    setBulk(null);
    toast.success(`${ok} von ${offen.length} Sets importiert.`);
  };

  const selbstHochladen = async (k: KatalogSet, files: FileList | null) => {
    if (!files?.length) return;
    setAktiv({ id: k.id, schritt: "Hochladen …" });
    try {
      await katalogSetMitDateien(store, k, [...files], (schritt) => setAktiv({ id: k.id, schritt }));
      setFehler((f) => ohne(f, k.id));
      toast.success(`«${k.titel}» ist bereit.`);
    } catch (e) {
      toast.error(fehlerText(e));
    } finally {
      setAktiv(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-herkunft-ncwiki/40">
        <CardContent className="flex flex-col gap-2 pt-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0 text-herkunft-ncwiki" /> {LIZENZ_HINWEIS}
          </p>
          <p className="text-muted-foreground">
            Die App holt die Dateien direkt von NCWiki bzw. Google Drive in deinen privaten Speicher. Prozentrang-Vergleiche werden nicht übernommen.
          </p>
          <Link to="/karten" className="font-semibold text-primary underline">
            Kursskript als Lernkarten
          </Link>
        </CardContent>
      </Card>

      {bulk && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-4">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>
                {GRUPPEN_NAMEN[bulk.gruppe]}: {bulk.fertig}/{bulk.gesamt}
              </span>
              <Button size="sm" variant="ghost" onClick={() => (stopp.current = true)}>
                <Square /> Stopp
              </Button>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={bulk.gesamt} aria-valuenow={bulk.fertig}>
              <div className="h-full bg-primary transition-all" style={{ width: `${(bulk.fertig / bulk.gesamt) * 100}%` }} />
            </div>
            {aktiv && <p className="truncate text-xs text-muted-foreground">{aktiv.schritt}</p>}
          </CardContent>
        </Card>
      )}

      {katalog.map(({ gruppe, jahre }) => {
        const alle = jahre.flatMap((j) => j.sets);
        const da = alle.filter((k) => vorhanden.has(k.id)).length;
        return (
          <details key={gruppe} className="group rounded-2xl border-2 bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-3">
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
              <span className="flex-1 font-bold">{GRUPPEN_NAMEN[gruppe]}</span>
              <Badge>
                {da}/{alle.length}
              </Badge>
            </summary>
            <div className="flex flex-col gap-3 border-t-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                disabled={beschaeftigt || da === alle.length}
                onClick={() => void alleEinerGruppe(gruppe, alle)}
              >
                <Layers /> Alle einer Gruppe importieren ({alle.length - da})
              </Button>
              {jahre.map(({ jahr, sets: liste }) => (
                <div key={jahr} className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-extrabold text-muted-foreground">{jahr}</h3>
                  <ul className="flex flex-col gap-1.5">
                    {liste.map((k) => (
                      <KatalogZeile
                        key={k.id}
                        k={k}
                        importiert={vorhanden.has(k.id)}
                        laeuft={aktiv?.id === k.id ? aktiv.schritt : null}
                        fehler={fehler[k.id]}
                        gesperrt={beschaeftigt}
                        onImport={() => void einzeln(k)}
                        onDateien={(f) => void selbstHochladen(k, f)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function KatalogZeile({
  k,
  importiert,
  laeuft,
  fehler,
  gesperrt,
  onImport,
  onDateien,
}: {
  k: KatalogSet;
  importiert: boolean;
  laeuft: string | null;
  fehler?: string;
  gesperrt: boolean;
  onImport: () => void;
  onDateien: (f: FileList | null) => void;
}) {
  const datei = useRef<HTMLInputElement>(null);
  return (
    <li className="flex flex-col gap-2 rounded-xl border-2 p-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold leading-tight">{k.titel}</span>
          <span className="text-xs text-muted-foreground">
            {k.anzahl > 0 ? `${k.anzahl} Aufgaben · ` : ""}
            {k.zeitMinuten} min · {k.dateien.length} Datei{k.dateien.length === 1 ? "" : "en"}
          </span>
          {k.hinweis && <span className="text-xs text-muted-foreground">{k.hinweis}</span>}
        </div>
        {importiert ? (
          <Link to={`/material/${k.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })} aria-label={`${k.titel} öffnen`}>
            <CheckCircle2 className="text-richtig" /> <span className="hidden sm:inline">Importiert</span>
          </Link>
        ) : (
          <Button size="sm" variant="outline" disabled={gesperrt} onClick={onImport} aria-label={`${k.titel} importieren`}>
            {laeuft ? <Loader2 className="animate-spin" /> : <Download />} <span className="hidden sm:inline">Importieren</span>
          </Button>
        )}
      </div>
      {laeuft && <p className="truncate text-xs text-muted-foreground">{laeuft}</p>}
      {fehler && !importiert && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-falsch/10 p-2 text-xs">
          <span>{fehler}</span>
          <span className="text-muted-foreground">Lade die PDFs im Browser von nc-wiki.ch herunter und hier hoch.</span>
          <input
            ref={datei}
            type="file"
            accept={ERLAUBTE_TYPEN.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              onDateien(e.target.files);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" className="self-start" disabled={gesperrt} onClick={() => datei.current?.click()}>
            <Upload /> Selbst hochladen
          </Button>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ Offiziell */

function GruppenAuswahl({ id, value, onChange }: { id: string; value: Gruppe; onChange: (g: Gruppe) => void }) {
  return (
    <select id={id} className="h-11 w-full rounded-xl border-2 bg-background px-3" value={value} onChange={(e) => onChange(e.target.value as Gruppe)}>
      {GRUPPEN_REIHENFOLGE.map((g) => (
        <option key={g} value={g}>
          {GRUPPEN_NAMEN[g]}
        </option>
      ))}
    </select>
  );
}

function Offiziell({ sets }: { sets: SetMitId[] }) {
  const store = useSpeicher();
  const navigate = useNavigate();
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [titel, setTitel] = useState("");
  const [gruppe, setGruppe] = useState<Gruppe>("simulation");
  const [minuten, setMinuten] = useState(0);
  const vorhanden = new Set(sets.map((s) => s.id));

  const ausfuehren = async (schluessel: string, f: () => Promise<void>) => {
    setLaeuft(schluessel);
    try {
      await f();
    } catch (e) {
      toast.error(fehlerText(e));
    } finally {
      setLaeuft(null);
    }
  };

  const eintrag = (o: OffiziellEintrag) =>
    ausfuehren(o.id, async () => {
      if (o.art === "info") {
        const n = await infoKartenImportieren(store, o);
        toast.success(`${n} Lernkarten aus «${o.titel}».`);
        navigate("/karten");
      } else {
        const id = await offiziellSetImportieren(store, o);
        toast.success(`«${o.titel}» importiert. Prüf Anzahl und Schlüssel.`);
        navigate(`/material/${id}/pruefen`);
      }
    });

  const urlOk = urlErlaubt(url);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {OFFIZIELL.map((o) => (
          <li key={o.id} className="flex items-center gap-2 rounded-2xl border-2 bg-card p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-bold leading-tight">{o.titel}</span>
              <span className="text-xs text-muted-foreground">{o.beschreibung}</span>
            </div>
            {o.art === "set" && vorhanden.has(o.id) ? (
              <Link to={`/material/${o.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <CheckCircle2 className="text-richtig" /> <span className="hidden sm:inline">Importiert</span>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled={laeuft !== null} onClick={() => void eintrag(o)}>
                {laeuft === o.id ? <Loader2 className="animate-spin" /> : <Download />}
                <span className="hidden sm:inline">{o.art === "info" ? "Lernkarten" : "Importieren"}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Andere offizielle PDF
          </CardTitle>
          <p className="text-sm text-muted-foreground">Erlaubt sind nur Adressen von {ERLAUBTE_HOSTS.join(", ")}.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="o-url">Adresse (https://…)</Label>
            <Input id="o-url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.swissuniversities.ch/…pdf" />
            {url && !urlOk && <span className="text-xs text-falsch">Diese Adresse ist nicht freigegeben.</span>}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="o-titel">Titel</Label>
            <Input id="o-titel" value={titel} onChange={(e) => setTitel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="o-gruppe">Gruppe</Label>
              <GruppenAuswahl id="o-gruppe" value={gruppe} onChange={setGruppe} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="o-min">Zeit (min)</Label>
              <Input id="o-min" type="number" min={0} inputMode="numeric" value={minuten} onChange={(e) => setMinuten(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <Button
            disabled={!urlOk || laeuft !== null}
            onClick={() =>
              void ausfuehren("url", async () => {
                const id = await urlSetImportieren(store, url, titel, gruppe, minuten);
                toast.success("Importiert. Jetzt prüfen.");
                navigate(`/material/${id}/pruefen`);
              })
            }
          >
            {laeuft === "url" ? <Loader2 className="animate-spin" /> : <Download />} Importieren
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Eigene */

function Eigene() {
  const store = useSpeicher();
  const navigate = useNavigate();
  const eingabe = useRef<HTMLInputElement>(null);
  const [dateien, setDateien] = useState<Array<{ file: File; art: MaterialDatei["art"] }>>([]);
  const [titel, setTitel] = useState("");
  const [gruppe, setGruppe] = useState<Gruppe>("quanti");
  const [minuten, setMinuten] = useState(standardMinuten("quanti"));
  const [anzahl, setAnzahl] = useState(18);
  const [ersteNr, setErsteNr] = useState(1);
  const [laeuft, setLaeuft] = useState<string | null>(null);

  const gruppeSetzen = (g: Gruppe) => {
    setGruppe(g);
    setMinuten(standardMinuten(g));
    setAnzahl(g === "simulation" ? 144 : g === "konz" ? 0 : 18);
  };

  const hinzufuegen = (liste: FileList | null) => {
    if (!liste?.length) return;
    const neu = [...liste].filter((f) => {
      const ok = (ERLAUBTE_TYPEN as readonly string[]).includes(f.type) && f.size <= MAX_BYTES;
      if (!ok) toast.error(`«${f.name}»: nur PDF/PNG/JPEG/WebP bis 50 MB.`);
      return ok;
    });
    if (!neu.length) return;
    if (!titel && dateien.length === 0) {
      const name = neu[0].name.replace(/\.[^.]+$/, "");
      setTitel(name);
      const g = erkenneGruppe(name);
      if (g) gruppeSetzen(g);
    }
    setDateien((d) => [...d, ...neu.map((file) => ({ file, art: artAusName(file.name) }))]);
  };

  const anlegen = async () => {
    setLaeuft("Starte …");
    try {
      const id = await eigenesSetAnlegen(store, dateien, { titel, gruppe, zeitMinuten: minuten, anzahl, ersteNr }, setLaeuft);
      toast.success("Hochgeladen. Jetzt kurz prüfen!");
      navigate(`/material/${id}/pruefen`);
    } catch (e) {
      toast.error(fehlerText(e));
    } finally {
      setLaeuft(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-4 w-4" /> Eigene PDFs oder Scans
        </CardTitle>
        <p className="text-sm text-muted-foreground">Mehrere Dateien möglich (z. B. Aufgaben und Lösungen). Sie liegen nur in deinem privaten Speicher.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <input
          ref={eingabe}
          type="file"
          multiple
          accept={ERLAUBTE_TYPEN.join(",")}
          className="hidden"
          onChange={(e) => {
            hinzufuegen(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => eingabe.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            hinzufuegen(e.dataTransfer.files);
          }}
          className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <Upload className="h-6 w-6" />
          Dateien wählen oder hierher ziehen
        </button>

        {dateien.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {dateien.map((d, i) => (
              <li key={`${d.file.name}-${i}`} className="flex items-center gap-2 rounded-xl border-2 p-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{d.file.name}</span>
                <select
                  aria-label={`Art von ${d.file.name}`}
                  className="h-9 rounded-lg border-2 bg-background px-1 text-sm"
                  value={d.art}
                  onChange={(e) => setDateien((l) => l.map((x, k) => (k === i ? { ...x, art: e.target.value as MaterialDatei["art"] } : x)))}
                >
                  <option value="aufgaben">Aufgaben</option>
                  <option value="loesungen">Lösungen</option>
                  <option value="gesamt">Beides</option>
                </select>
                <Button variant="ghost" size="sm" aria-label={`${d.file.name} entfernen`} onClick={() => setDateien((l) => l.filter((_, k) => k !== i))}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Feld label="Titel" id="e-titel">
          <Input id="e-titel" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Quanti Probelauf Kanti" />
        </Feld>
        <Feld label="Gruppe" id="e-gruppe">
          <GruppenAuswahl id="e-gruppe" value={gruppe} onChange={gruppeSetzen} />
        </Feld>
        <div className="grid grid-cols-3 gap-2">
          <Feld label="Zeit (min)" id="e-min">
            <Input id="e-min" type="number" min={0} inputMode="numeric" value={minuten} onChange={(e) => setMinuten(Math.max(0, Number(e.target.value) || 0))} />
          </Feld>
          <Feld label="Anzahl" id="e-anz">
            <Input id="e-anz" type="number" min={0} inputMode="numeric" value={anzahl} onChange={(e) => setAnzahl(Math.max(0, Number(e.target.value) || 0))} />
          </Feld>
          <Feld label="Erste Nr." id="e-erste">
            <Input id="e-erste" type="number" min={1} inputMode="numeric" value={ersteNr} onChange={(e) => setErsteNr(Math.max(1, Number(e.target.value) || 1))} />
          </Feld>
        </div>
        <Button size="lg" disabled={dateien.length === 0 || laeuft !== null} onClick={() => void anlegen()}>
          {laeuft ? <Loader2 className="animate-spin" /> : <Upload />} {laeuft ?? "Hochladen und erkennen"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Feld({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
