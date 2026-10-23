import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Antwortbogen } from "@/components/material/Antwortbogen";
import { Seitenbild } from "@/components/material/Seitenbild";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeicher } from "@/daten/DatenProvider";
import { GRUPPEN, type AufgabenGruppe, type MaterialDatei, type MaterialSet } from "@/daten/modelle";
import { cn } from "@/lib/utils";
import { GRUPPEN_NAMEN, GRUPPEN_REIHENFOLGE, LIZENZ_HINWEIS } from "@/material/katalog";
import { useMaterialSet, useSeiten } from "@/material/hooks";
import { setAnalysieren, setLoeschen } from "@/material/import";
import { buchstabeZuIndex, indexZuBuchstabe, schluesselAnpassen, standardBereiche, type SetBereich } from "@/material/set";

function zahl(v: string, min = 0, max = 999): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

export default function MaterialPruefen() {
  const { id = "" } = useParams();
  const set = useMaterialSet(id);
  const store = useSpeicher();
  const navigate = useNavigate();
  const { seiten, laedt, fehler } = useSeiten(set, "aufgaben");
  const [aktiveNr, setAktiveNr] = useState<number | null>(null);
  const [analysiert, setAnalysiert] = useState(false);

  const aendern = (teil: Partial<MaterialSet>) => void store.aendern<MaterialSet>("material", id, teil);

  const antworten = useMemo(() => {
    const out: Record<string, number | null> = {};
    set?.schluessel.forEach((b, i) => (out[String(set.ersteNr + i)] = buchstabeZuIndex(b)));
    return out;
  }, [set?.schluessel, set?.ersteNr]);

  const aufSeite = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const [nr, s] of Object.entries(set?.seiten ?? {})) m.set(s, [...(m.get(s) ?? []), Number(nr)]);
    return m;
  }, [set?.seiten]);

  if (!set)
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-semibold">Set nicht gefunden.</p>
        <Link to="/material" className={buttonVariants({ variant: "outline" })}>
          Zur Bibliothek
        </Link>
      </div>
    );

  const bereichAendern = (ersteNr: number, anzahl: number) => {
    const seitenNeu: Record<string, number> = {};
    for (let nr = ersteNr; nr < ersteNr + anzahl; nr++) seitenNeu[String(nr)] = set.seiten[String(nr)] ?? 1;
    aendern({ ersteNr, anzahl, schluessel: schluesselAnpassen(set, ersteNr, anzahl), seiten: seitenNeu });
  };

  const seiteZuordnen = (seite: number) => {
    if (aktiveNr === null) return;
    aendern({ seiten: { ...set.seiten, [String(aktiveNr)]: seite } });
    setAktiveNr(aktiveNr + 1 < set.ersteNr + set.anzahl ? aktiveNr + 1 : null);
  };

  const neuErkennen = async () => {
    setAnalysiert(true);
    try {
      const a = await setAnalysieren(store, id, true);
      toast.success(`Erkannt: ${a?.schluessel ?? 0} Schlüssel, ${a?.seiten ?? 0} Seiten, ${a?.loesungswege ?? 0} Lösungswege.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erkennen fehlgeschlagen.");
    } finally {
      setAnalysiert(false);
    }
  };

  const dateiAendern = (i: number, teil: Partial<MaterialDatei>) => aendern({ dateien: set.dateien.map((d, k) => (k === i ? { ...d, ...teil } : d)) });
  const bereiche = set.bereiche ?? [];
  const bereicheSetzen = (b: SetBereich[]) => aendern({ bereiche: b });
  const fehlend = set.schluessel.filter((b) => !b).length;

  return (
    <div className="flex flex-col gap-5">
      <Link to={`/material/${set.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zum Set
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold leading-tight">Prüfen</h1>
        <p className="text-sm text-muted-foreground">Kontrolliere, was die App erkannt hat. Änderungen speichern sofort.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Angaben</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label htmlFor="titel">Titel</Label>
            <Input id="titel" value={set.titel} onChange={(e) => aendern({ titel: e.target.value })} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label htmlFor="gruppe">Gruppe</Label>
            <select
              id="gruppe"
              className="h-11 rounded-xl border-2 bg-background px-3"
              value={set.gruppe}
              onChange={(e) => aendern({ gruppe: e.target.value as MaterialSet["gruppe"], textAufgaben: e.target.value === "textverstaendnis" })}
            >
              {GRUPPEN_REIHENFOLGE.map((g) => (
                <option key={g} value={g}>
                  {GRUPPEN_NAMEN[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="zeit">Zeit (min)</Label>
            <Input id="zeit" type="number" inputMode="numeric" min={0} value={set.zeitMinuten} onChange={(e) => aendern({ zeitMinuten: zahl(e.target.value, 0, 300) })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="anzahl">Anzahl</Label>
            <Input id="anzahl" type="number" inputMode="numeric" min={0} value={set.anzahl} onChange={(e) => bereichAendern(set.ersteNr, zahl(e.target.value, 0, 300))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="erste">Erste Nr.</Label>
            <Input id="erste" type="number" inputMode="numeric" min={1} value={set.ersteNr} onChange={(e) => bereichAendern(zahl(e.target.value, 1, 999), set.anzahl)} />
          </div>
          {set.analyse && (
            <div className="col-span-2 text-xs text-muted-foreground">
              Erkannt: {set.analyse.schluessel} Schlüssel · {set.analyse.seiten} Seiten · {set.analyse.loesungswege} Lösungswege
              {set.analyse.zeitMinuten ? ` · Zeit ${set.analyse.zeitMinuten} min` : ""}
              {set.analyse.fehler && <span className="block text-falsch">Fehler: {set.analyse.fehler}</span>}
            </div>
          )}
          <Button variant="outline" className="col-span-2" disabled={analysiert} onClick={() => void neuErkennen()}>
            {analysiert ? <Loader2 className="animate-spin" /> : <RefreshCw />} Neu erkennen (überschreibt Schlüssel und Seiten)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dateien</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {set.dateien.map((d, i) => (
            <div key={d.pfad} className="flex flex-col gap-1 rounded-xl border-2 p-2 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.titel ?? d.pfad.split("/").pop()}</span>
              <span className="text-xs text-muted-foreground">{d.seiten ? `${d.seiten} S.` : ""}</span>
              <select
                aria-label="Art der Datei"
                className="h-9 rounded-lg border-2 bg-background px-2 text-sm"
                value={d.rolle ?? d.art}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "abruf") dateiAendern(i, { art: "aufgaben", rolle: "abruf" });
                  else if (v === "konz" || v === "schablone") dateiAendern(i, { art: "loesungen", rolle: v });
                  else dateiAendern(i, { art: v as MaterialDatei["art"], rolle: undefined });
                }}
              >
                <option value="aufgaben">Aufgaben</option>
                <option value="abruf">Abruf-Heft</option>
                <option value="loesungen">Lösungen</option>
                <option value="gesamt">Aufgaben + Lösungen</option>
                <option value="konz">Konz-Auswertung</option>
                <option value="schablone">Auswerte-Schablone</option>
              </select>
            </div>
          ))}
          {set.quelle === "ncwiki" && <p className="text-xs text-muted-foreground">{LIZENZ_HINWEIS}</p>}
        </CardContent>
      </Card>

      {set.anzahl > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lösungsschlüssel</CardTitle>
            <p className="text-sm text-muted-foreground">
              {fehlend ? `${fehlend} ohne Schlüssel.` : "Alle Aufgaben haben einen Schlüssel."} Tippen setzt, nochmals tippen löscht.
            </p>
          </CardHeader>
          <CardContent>
            <Antwortbogen
              anzahl={set.anzahl}
              ersteNr={set.ersteNr}
              antworten={antworten}
              onChange={(nr, a) => {
                const neu = [...set.schluessel];
                neu[nr - set.ersteNr] = indexZuBuchstabe(a);
                aendern({ schluessel: neu });
              }}
              className="sm:[&_ol]:grid sm:[&_ol]:grid-cols-2"
            />
          </CardContent>
        </Card>
      )}

      {set.anzahl > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seiten der Aufgaben</CardTitle>
            <p className="text-sm text-muted-foreground">Nummer antippen, dann die Seite wählen. Danach springt die Auswahl zur nächsten Nummer.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {Array.from({ length: set.anzahl }, (_, i) => set.ersteNr + i).map((nr) => (
                <div
                  key={nr}
                  className={cn("flex items-center gap-1 rounded-lg border-2 px-1.5 py-1 text-xs font-bold", aktiveNr === nr && "border-primary bg-primary/10")}
                >
                  <button type="button" className="w-7 text-left tabular" onClick={() => setAktiveNr(aktiveNr === nr ? null : nr)} aria-pressed={aktiveNr === nr}>
                    {nr}
                  </button>
                  <input
                    aria-label={`Seite für Aufgabe ${nr}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="h-7 w-full min-w-0 rounded border bg-background px-1 text-right font-normal"
                    value={set.seiten[String(nr)] ?? ""}
                    onFocus={() => setAktiveNr(nr)}
                    onChange={(e) => aendern({ seiten: { ...set.seiten, [String(nr)]: zahl(e.target.value, 1, 999) } })}
                  />
                </div>
              ))}
            </div>
            {laedt ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Seiten werden geladen …
              </p>
            ) : fehler ? (
              <p className="text-sm text-falsch">{fehler}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {seiten.map((s) => (
                  <button
                    key={s.nr}
                    type="button"
                    onClick={() => seiteZuordnen(s.nr)}
                    disabled={aktiveNr === null}
                    className={cn("flex flex-col items-center gap-1 rounded-xl border-2 p-1 text-xs disabled:cursor-default", aktiveNr !== null && "hover:border-primary")}
                    aria-label={`Seite ${s.nr}${aktiveNr !== null ? ` für Aufgabe ${aktiveNr}` : ""}`}
                  >
                    <Seitenbild seite={s} breite={96} lazy />
                    <span className="font-bold">S. {s.nr}</span>
                    <span className="min-h-4 text-muted-foreground">
                      {s.rolle === "abruf" ? "Abruf " : ""}
                      {aufSeite.get(s.nr)?.length ? `Nr. ${Math.min(...aufSeite.get(s.nr)!)}–${Math.max(...aufSeite.get(s.nr)!)}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {set.gruppe === "simulation" && (
        <Card>
          <CardHeader>
            <CardTitle>Bereiche der Simulation</CardTitle>
            <p className="text-sm text-muted-foreground">Welche Nummern gehören zu welcher Gruppe? Nötig für Fehlerheft und Statistik.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {bereiche.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-1 rounded-xl border-2 p-2 sm:grid-cols-[1fr_4rem_4rem_4rem_auto] sm:items-center">
                <select
                  aria-label="Gruppe"
                  className="col-span-2 h-9 rounded-lg border-2 bg-background px-2 text-sm sm:col-span-1"
                  value={b.gruppe}
                  onChange={(e) => bereicheSetzen(bereiche.map((x, k) => (k === i ? { ...x, gruppe: e.target.value as AufgabenGruppe } : x)))}
                >
                  {GRUPPEN.filter((g) => g !== "konz").map((g) => (
                    <option key={g} value={g}>
                      {GRUPPEN_NAMEN[g]}
                    </option>
                  ))}
                </select>
                <div className="col-span-2 grid grid-cols-3 gap-1 sm:contents">
                  {(["von", "bis", "minuten"] as const).map((f) => (
                    <label key={f} className="flex flex-col text-[11px] font-semibold text-muted-foreground">
                      {f === "minuten" ? "min" : f}
                      <input
                        type="number"
                        inputMode="numeric"
                        className="h-9 w-full rounded-lg border-2 bg-background px-1 text-right text-sm text-foreground"
                        value={b[f]}
                        onChange={(e) => bereicheSetzen(bereiche.map((x, k) => (k === i ? { ...x, [f]: zahl(e.target.value, 0, 999) } : x)))}
                      />
                    </label>
                  ))}
                </div>
                <Button variant="ghost" size="icon" aria-label="Bereich entfernen" onClick={() => bereicheSetzen(bereiche.filter((_, k) => k !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const letzte = bereiche[bereiche.length - 1];
                  const von = letzte ? letzte.bis + 1 : set.ersteNr;
                  bereicheSetzen([...bereiche, { gruppe: "muster-zuordnen", von, bis: von + 17, minuten: 16 }]);
                }}
              >
                <Plus /> Bereich
              </Button>
              <Button variant="outline" size="sm" onClick={() => bereicheSetzen(standardBereiche(set.ersteNr))}>
                <Wand2 /> Vorschlag (8 × 18, Test-Info 2026)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {set.loesungswege && Object.keys(set.loesungswege).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lösungswege aus dem Material</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">{Object.keys(set.loesungswege).length} Aufgaben haben einen Lösungsweg aus dem Material. Die übrigen bekommen eine «Ergänzung» aus der Methode.</p>
            <details>
              <summary className="cursor-pointer font-semibold">Ansehen</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {Object.entries(set.loesungswege).map(([nr, t]) => (
                  <li key={nr} className="rounded-lg bg-muted p-2">
                    <b>{nr}:</b> <span className="whitespace-pre-line">{t.slice(0, 400)}</span>
                  </li>
                ))}
              </ul>
            </details>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => aendern({ loesungswege: {} })}>
              Lösungswege entfernen
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            aendern({ status: "geprueft" });
            toast.success("Geprüft – bereit zum Üben!");
            navigate(`/material/${set.id}`);
          }}
        >
          <CheckCircle2 /> Geprüft
        </Button>
        {set.status === "geprueft" && (
          <Badge className="self-center border-richtig text-richtig">
            bereits geprüft · Schlüssel {set.anzahl - fehlend}/{set.anzahl}
          </Badge>
        )}
        <Button
          variant="ghost"
          className="text-falsch"
          onClick={async () => {
            if (!window.confirm("Set samt Dateien aus deinem Speicher löschen?")) return;
            await setLoeschen(store, set);
            toast.success("Gelöscht.");
            navigate("/material");
          }}
        >
          <Trash2 /> Löschen
        </Button>
      </div>
    </div>
  );
}
