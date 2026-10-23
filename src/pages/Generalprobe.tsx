import { Link } from "react-router-dom";
import { AlarmClock, BedDouble, MapPin, Timer, Wind } from "lucide-react";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import type { Testort } from "@/daten/modelle";
import { testdatum } from "@/plan/plan";
import { formatTag, heute, minutenZuZeit, plusTage, tageZwischen, zeitZuMinuten } from "@/lib/datum";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TESTORTE: Testort[] = ["Zürich", "Bern", "Basel", "Luzern", "St. Gallen", "Chur", "Freiburg"];

const CHECKLISTE = [
  { id: "einladung", text: "Einladung (ausgedruckt)" },
  { id: "ausweis", text: "Ausweis mit Foto: ID, Pass oder Führerausweis (kein Swisspass)" },
  { id: "bleistifte", text: "3 weiche Bleistifte (2B/HB), Spitzer, Radiergummi" },
  { id: "filzstift", text: "Schwarzer oder blauer Filzstift für Konz" },
  { id: "textmarker", text: "Textmarker" },
  { id: "snacks", text: "Snacks lose oder im durchsichtigen Beutel, Getränk" },
  { id: "ohrstoepsel", text: "Ohrstöpsel (erlaubt)" },
  { id: "keine-uhr", text: "Keine Uhr mitnehmen – die Zeit wird zentral angezeigt" },
  { id: "anreise", text: "Anreise mit Puffer geprüft (Fahrplan, Ausweichverbindung)" },
  { id: "schlaf", text: "Früh schlafen, Wecker gestellt" },
];

export default function Generalprobe() {
  const store = useSpeicher();
  const [e, speichern] = useEinstellungen();
  const liste = useDokument<{ erledigt: string[] }>("checklisten", "testtag");
  const erledigt = new Set(liste?.erledigt ?? []);
  const t = testdatum(e);
  const tag = heute();
  const d = tageZwischen(tag, t);
  const probeVon = plusTage(t, -14);
  const probeBis = plusTage(t, -8);
  const anreise = e.anreiseMinuten ?? 45;
  const abfahrt = zeitZuMinuten(e.testbeginn) - anreise - e.pufferMinuten;
  const wecker = abfahrt - 60;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Generalprobe</h1>
        <p className="text-sm text-muted-foreground">
          1–2 Wochen vor dem Test ({formatTag(probeVon, "kurz")}–{formatTag(probeBis, "kurz")}) einmal alles wie am Testtag: echte Uhrzeit, keine Mittagspause, gleiche Anreise.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border-2 p-4">
        <h2 className="flex items-center gap-2 font-extrabold">
          <MapPin className="h-5 w-5 text-primary" /> Testort und Anreise
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ort">Testort</Label>
            <select id="ort" value={e.testort ?? ""} onChange={(ev) => void speichern({ testort: (ev.target.value || undefined) as Testort | undefined })} className="h-11 rounded-xl border-2 bg-background px-2">
              <option value="">noch offen</option>
              {TESTORTE.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="beginn">Testbeginn</Label>
            <Input id="beginn" type="time" value={e.testbeginn} onChange={(ev) => void speichern({ testbeginn: ev.target.value })} className="w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="anreise">Anreise (Min.)</Label>
            <Input id="anreise" type="number" min={0} max={300} value={anreise} onChange={(ev) => void speichern({ anreiseMinuten: Number(ev.target.value) || 0 })} className="w-24" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="puffer">Puffer (Min.)</Label>
            <Input id="puffer" type="number" min={0} max={180} value={e.pufferMinuten} onChange={(ev) => void speichern({ pufferMinuten: Number(ev.target.value) || 0 })} className="w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlarmClock className="h-3.5 w-3.5" /> Wecker
            </p>
            <p className="text-2xl font-extrabold tabular-nums">{minutenZuZeit(Math.max(0, wecker))}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Abfahrt spätestens</p>
            <p className="text-2xl font-extrabold tabular-nums">{minutenZuZeit(Math.max(0, abfahrt))}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Wer zu spät kommt, wird nicht eingelassen – einen Nachholtermin gibt es nicht. Deshalb der Puffer.</p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-4">
        <h2 className="flex items-center gap-2 font-extrabold">
          <Timer className="h-5 w-5 text-primary" /> Probe starten
        </h2>
        <p className="text-sm">Volle Simulation ab {e.testbeginn}, Teil A und B mit {e.heftwechselMinuten} Min. Heftwechsel, ohne Mittagspause. Iss und trink nur, was du am Testtag auch dabeihast.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/simulation?art=generalprobe" className={buttonVariants({ size: "lg" })}>
            Generalprobe starten
          </Link>
          <Link to="/fokus" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Wind /> 1 Minute Fokus
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="checkliste">
        <h2 id="checkliste" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Checkliste Testtag
        </h2>
        <ul className="flex flex-col gap-1.5">
          {CHECKLISTE.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 bg-card p-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={erledigt.has(c.id)}
                  onChange={(ev) => {
                    const n = new Set(erledigt);
                    if (ev.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    void store.speichern("checklisten", "testtag", { erledigt: [...n] });
                  }}
                />
                <span className={cn(erledigt.has(c.id) && "line-through opacity-60")}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {d >= 0 && d <= 7 && (
        <section className="flex gap-3 rounded-2xl border-2 border-info/40 bg-info/5 p-4 text-sm">
          <BedDouble className="h-6 w-6 shrink-0 text-info" />
          <p>
            {d === 1
              ? "Morgen ist EMS. Nichts mehr lernen, Tasche packen, früh ins Bett."
              : d === 0
                ? "Heute ist EMS. Du hast trainiert – vertrau deinen Methoden."
                : "Letzte Woche: jeden Abend genug schlafen. Ausgeschlafen bist du schneller und genauer."}
          </p>
        </section>
      )}
    </div>
  );
}
