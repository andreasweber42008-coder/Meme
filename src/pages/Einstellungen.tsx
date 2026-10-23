import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, LogOut, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAbgleich, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { GRUPPEN, type Einstellungen as E, type Testort } from "@/daten/modelle";
import { backupDatei, backupLesen } from "@/daten/backup";
import { tagesplanZuruecksetzen } from "@/plan/tagesplan";
import { useAuth } from "@/hooks/useAuth";
import { UNTERTESTS } from "@/content/untertests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Munggi, VARIANTEN, ZUSTAENDE } from "@/components/maskottchen/Munggi";
import { LernzeitFormular, MaturaFormular } from "./Onboarding";
import { emsDatum, formatTag } from "@/lib/datum";
import { cn } from "@/lib/utils";

const TESTORTE: Testort[] = ["Zürich", "Bern", "Basel", "Luzern", "St. Gallen", "Chur", "Freiburg"];

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 p-4">
      <h2 className="font-extrabold">{titel}</h2>
      {children}
    </section>
  );
}

export default function Einstellungen() {
  const store = useSpeicher();
  const { abmelden } = useAuth();
  const sync = useAbgleich();
  const [gespeichert, speichern] = useEinstellungen();
  const [e, setE] = useState<E>(gespeichert);
  const geaendert = JSON.stringify(e) !== JSON.stringify(gespeichert);
  const datei = useRef<HTMLInputElement>(null);
  useEffect(() => setE(gespeichert), [gespeichert]);

  const setzen = (teil: Partial<E>) => setE({ ...e, ...teil });

  async function sichern() {
    await speichern(e);
    await tagesplanZuruecksetzen(store);
    toast.success("Gespeichert");
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <header>
        <h1 className="text-2xl font-extrabold">Einstellungen</h1>
      </header>

      <Abschnitt titel="Test">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="maturajahr">Maturajahr</Label>
            <Input id="maturajahr" type="number" value={e.maturajahr} onChange={(ev) => setzen({ maturajahr: Number(ev.target.value) || e.maturajahr })} className="w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="testdatum">Testdatum (leer = Freitag KW 27)</Label>
            <Input id="testdatum" type="date" value={e.testdatum ?? ""} onChange={(ev) => setzen({ testdatum: ev.target.value || undefined })} className="w-44" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Aktuell: {formatTag(e.testdatum ?? emsDatum(e.maturajahr))}</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="testort">Testort</Label>
            <select id="testort" value={e.testort ?? ""} onChange={(ev) => setzen({ testort: (ev.target.value || undefined) as Testort | undefined })} className="h-11 rounded-xl border-2 bg-background px-2">
              <option value="">noch offen</option>
              {TESTORTE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="beginn">Testbeginn laut Aufgebot</Label>
            <Input id="beginn" type="time" value={e.testbeginn} onChange={(ev) => setzen({ testbeginn: ev.target.value })} className="w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="heftwechsel">Pause zwischen Teil A und B (Min.)</Label>
            <Input id="heftwechsel" type="number" min={0} max={90} value={e.heftwechselMinuten} onChange={(ev) => setzen({ heftwechselMinuten: Number(ev.target.value) || 0 })} className="w-28" />
          </div>
        </div>
      </Abschnitt>

      <Abschnitt titel="Lernzeit und Wochenrhythmus">
        <LernzeitFormular e={e} setE={setE} />
      </Abschnitt>

      <Abschnitt titel="Matura-Modus">
        <MaturaFormular e={e} setE={setE} />
      </Abschnitt>

      <Abschnitt titel="Ziele der Bereitschafts-Ampel">
        <p className="text-sm text-muted-foreground">Deine eigenen Ziele pro Gruppe – die Ampel misst nur daran, nicht an einer Zulassungsgrenze.</p>
        <ul className="flex flex-col gap-2">
          {GRUPPEN.map((g) => (
            <li key={g} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-28 font-semibold">{UNTERTESTS.find((u) => u.id === g)!.kurzname}</span>
              <label className="flex items-center gap-1">
                <Input
                  type="number"
                  min={30}
                  max={100}
                  step={5}
                  value={Math.round(e.ziele[g].genauigkeit * 100)}
                  onChange={(ev) => setzen({ ziele: { ...e.ziele, [g]: { ...e.ziele[g], genauigkeit: Math.min(1, Math.max(0.3, Number(ev.target.value) / 100)) } } })}
                  className="h-9 w-20"
                  aria-label={`Ziel richtig ${g}`}
                />
                % richtig
              </label>
              <label className="flex items-center gap-1">
                <Input
                  type="number"
                  min={50}
                  max={150}
                  step={5}
                  value={Math.round(e.ziele[g].tempo * 100)}
                  onChange={(ev) => setzen({ ziele: { ...e.ziele, [g]: { ...e.ziele[g], tempo: Math.min(1.5, Math.max(0.5, Number(ev.target.value) / 100)) } } })}
                  className="h-9 w-20"
                  aria-label={`Ziel Tempo ${g}`}
                />
                % der Zeit
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="beherrschung">Beherrschung für den Stufenaufstieg (%)</Label>
            <Input id="beherrschung" type="number" min={60} max={100} step={5} value={Math.round(e.beherrschung * 100)} onChange={(ev) => setzen({ beherrschung: Math.min(1, Math.max(0.6, Number(ev.target.value) / 100)) })} className="w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tagesziel">Tagesziel (XP)</Label>
            <Input id="tagesziel" type="number" min={10} max={500} step={10} value={e.tagesziel} onChange={(ev) => setzen({ tagesziel: Number(ev.target.value) || 50 })} className="w-28" />
          </div>
        </div>
      </Abschnitt>

      <Abschnitt titel="Darstellung und Ton">
        <div className="flex flex-wrap gap-1.5">
          {(["system", "hell", "dunkel"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setzen({ design: d })} aria-pressed={e.design === d} className={cn("rounded-full border-2 px-3 py-1 text-sm font-semibold", e.design === d && "border-primary bg-primary/10 text-primary")}>
              {d === "system" ? "Wie System" : d === "hell" ? "Hell" : "Dunkel"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={e.ton} onChange={(ev) => setzen({ ton: ev.target.checked })} className="h-4 w-4" /> Töne bei richtig, falsch und Feiern
        </label>
      </Abschnitt>

      <Abschnitt titel="Maskottchen">
        <div className="grid grid-cols-3 gap-2">
          {VARIANTEN.map((v) => (
            <button key={v.id} type="button" onClick={() => setzen({ maskottchen: v.id })} aria-pressed={e.maskottchen === v.id} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-2", e.maskottchen === v.id && "border-primary bg-primary/10")}>
              <Munggi variante={v.id} className="h-16 w-16" />
              <span className="text-center text-[11px] font-bold leading-tight">{v.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{VARIANTEN.find((v) => v.id === e.maskottchen)?.beschreibung}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ZUSTAENDE.map((z) => (
            <div key={z.id} className="flex flex-col items-center gap-1">
              <Munggi variante={e.maskottchen} zustand={z.id} className="h-16 w-16" />
              <span className="text-center text-[11px] text-muted-foreground">{z.name}</span>
            </div>
          ))}
        </div>
      </Abschnitt>

      <Abschnitt titel="Daten">
        <p className="text-sm">
          Abgleich mit Lovable Cloud: <b>{sync.status === "lokal" ? "nur lokal" : sync.status}</b>
          {sync.letzter ? ` · zuletzt ${new Date(sync.letzter).toLocaleTimeString("de-CH")}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={sync.jetzt}>
            <RefreshCw /> Jetzt abgleichen
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([backupDatei(store.exportieren())], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `munggi-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}
          >
            <Download /> Sicherung exportieren
          </Button>
          <Button variant="outline" onClick={() => datei.current?.click()}>
            <Upload /> Sicherung importieren
          </Button>
          <input
            ref={datei}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (!f) return;
              try {
                const n = await store.einmischen(backupLesen(await f.text()), false);
                toast.success(`${n} Einträge übernommen (neuere Stände bleiben erhalten)`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import fehlgeschlagen");
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Die Sicherung enthält deinen Fortschritt, aber keine PDFs – das Material bleibt im privaten Speicher hinter deinem Login.</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/offiziell" className="font-semibold text-primary">Offizielle Infos und Fristen →</Link>
        </div>
      </Abschnitt>

      <Button variant="ghost" onClick={abmelden} className="self-start">
        <LogOut /> Abmelden
      </Button>

      {geaendert && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t-2 bg-background/95 p-3 backdrop-blur md:bottom-0">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button variant="outline" onClick={() => setE(gespeichert)}>
              Verwerfen
            </Button>
            <Button className="flex-1" onClick={() => void sichern()}>
              Speichern
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
