import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Download, Eye, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSammlung, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import type { Lernkarte } from "@/daten/modelle";
import { UNTERTESTS } from "@/content/untertests";
import type { UntertestId } from "@/content/schema";
import { formatTag, heute } from "@/lib/datum";
import { istFaellig, naechsteWiederholung } from "@/lib/srs";
import { cn } from "@/lib/utils";
import { testdatum } from "@/plan/plan";
import { KURSSKRIPT, LIZENZ_HINWEIS, OFFIZIELL } from "@/material/katalog";
import { infoKartenImportieren, kursskriptImportieren } from "@/material/import";

type Karte = Lernkarte & { id: string };

const QUELLEN: Record<Lernkarte["quelle"], { label: string; klasse: string }> = {
  ncwiki: { label: "NCWiki", klasse: "border-herkunft-ncwiki text-herkunft-ncwiki" },
  milan: { label: "Milan", klasse: "border-herkunft-milan text-herkunft-milan" },
  "test-info": { label: "Test-Info", klasse: "border-info text-info" },
};

/** Neue Karten pro Tag, damit der Stapel nicht erschlägt */
const NEUE_PRO_TAG = 20;

function untertestName(id: UntertestId): string {
  return UNTERTESTS.find((u) => u.id === id)?.kurzname ?? id;
}

export default function Lernkarten() {
  const store = useSpeicher();
  const karten = useSammlung<Lernkarte>("karten");
  const [einstellungen] = useEinstellungen();
  const tag = heute();
  const [gruppe, setGruppe] = useState<UntertestId | "alle">("alle");
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => karten.filter((k) => gruppe === "alle" || k.gruppe === gruppe), [karten, gruppe]);
  const stapel = useMemo(() => {
    const faellig = gefiltert.filter((k) => istFaellig(k.srs, tag)).sort((a, b) => (a.srs!.faellig < b.srs!.faellig ? -1 : 1));
    const heuteGelernt = gefiltert.filter((k) => k.srs?.zuletzt === tag && k.srs.fach === 0).length;
    const neu = gefiltert.filter((k) => !k.srs).slice(0, Math.max(0, NEUE_PRO_TAG - heuteGelernt));
    return [...faellig, ...neu];
  }, [gefiltert, tag]);
  const karte: Karte | undefined = stapel[0];
  const gruppenMitKarten = useMemo(() => [...new Set(karten.map((k) => k.gruppe))], [karten]);
  const testInfo = OFFIZIELL.find((o) => o.art === "info");

  const bewerten = async (richtig: boolean) => {
    if (!karte) return;
    setAufgedeckt(false);
    await store.aendern<Lernkarte>("karten", karte.id, { srs: naechsteWiederholung(karte.srs, richtig, tag, testdatum(einstellungen)) });
  };

  const importieren = async (art: "kursskript" | "testinfo") => {
    setLaeuft("Starte …");
    try {
      const n = art === "kursskript" ? await kursskriptImportieren(store, setLaeuft) : await infoKartenImportieren(store, testInfo!, setLaeuft);
      toast.success(`${n} Lernkarten bereit. Viel Spass beim Wiederholen!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(null);
    }
  };

  const liste = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return s ? gefiltert.filter((k) => `${k.titel} ${k.text}`.toLowerCase().includes(s)) : gefiltert;
  }, [gefiltert, suche]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">Lernkarten</h1>
        <p className="text-sm text-muted-foreground">Tipps aus Kursskript und Test-Info, mit Wiederholung im richtigen Abstand.</p>
      </header>

      {gruppenMitKarten.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Gruppe filtern">
          {(["alle", ...gruppenMitKarten] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gruppe === g}
              onClick={() => {
                setGruppe(g);
                setAufgedeckt(false);
              }}
              className={cn("rounded-full border-2 px-3 py-1 text-xs font-bold", gruppe === g ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
            >
              {g === "alle" ? "Alle" : untertestName(g)}
            </button>
          ))}
        </div>
      )}

      {karten.length === 0 ? null : karte ? (
        <Card className="min-h-[16rem]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-1">
              <Badge className={QUELLEN[karte.quelle].klasse}>{QUELLEN[karte.quelle].label}</Badge>
              <Badge>{untertestName(karte.gruppe)}</Badge>
              {!karte.srs && <Badge className="border-gold">neu</Badge>}
              <span className="ml-auto text-xs font-semibold text-muted-foreground tabular">{stapel.length} offen</span>
            </div>
            <CardTitle className="pt-2 text-lg">{karte.titel}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {aufgedeckt ? (
              <>
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{karte.text}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => void bewerten(false)}>
                    <RotateCcw /> Nochmal
                  </Button>
                  <Button onClick={() => void bewerten(true)}>
                    <Check /> Sitzt
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Was weisst du dazu? Überleg kurz, dann deck auf.</p>
                <Button onClick={() => setAufgedeckt(true)}>
                  <Eye /> Aufdecken
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Check className="h-8 w-8 text-richtig" />
            <p className="font-bold">Für heute alles wiederholt. Stark!</p>
            <p className="text-sm text-muted-foreground">Morgen kommen die nächsten Karten.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Karten importieren
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Die App teilt die PDFs an Überschriften auf. Die Karten liegen nur in deinem privaten Speicher. Erneutes Importieren behält deinen Lernstand.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" disabled={laeuft !== null} onClick={() => void importieren("kursskript")}>
            {laeuft ? <Loader2 className="animate-spin" /> : <Download />} {KURSSKRIPT.titel}
          </Button>
          {testInfo && (
            <Button variant="outline" disabled={laeuft !== null} onClick={() => void importieren("testinfo")}>
              {laeuft ? <Loader2 className="animate-spin" /> : <Download />} {testInfo.titel} (swissuniversities)
            </Button>
          )}
          {laeuft && <p className="text-xs text-muted-foreground">{laeuft}</p>}
          <p className="text-xs text-muted-foreground">{LIZENZ_HINWEIS}</p>
          <Link to="/material" className="text-sm font-semibold text-primary underline">
            Zur Material-Bibliothek
          </Link>
        </CardContent>
      </Card>

      {karten.length > 0 && (
        <details className="rounded-2xl border-2 bg-card">
          <summary className="cursor-pointer p-3 font-bold">Alle Karten ({gefiltert.length})</summary>
          <div className="flex flex-col gap-2 border-t-2 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Karten durchsuchen" placeholder="Suchen" className="pl-9" value={suche} onChange={(e) => setSuche(e.target.value)} />
            </div>
            <ul className="flex flex-col gap-1.5">
              {liste.slice(0, 200).map((k) => (
                <li key={k.id} className="flex items-start gap-2 rounded-xl border-2 p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{k.titel}</p>
                    <p className="text-xs text-muted-foreground">
                      {untertestName(k.gruppe)} · {k.srs ? `fällig ${formatTag(k.srs.faellig, "kurz")}` : "neu"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`${k.titel} löschen`}
                    onClick={() => {
                      if (window.confirm("Karte löschen?")) void store.loeschen("karten", k.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
