import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEinstellungen } from "@/daten/hooks";
import type { Einstellungen, Studienwunsch } from "@/daten/modelle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Munggi, VARIANTEN } from "@/components/maskottchen/Munggi";
import { emsDatum, formatTag, testanmeldungBis, voranmeldungBis, WOCHENTAGE_KURZ } from "@/lib/datum";
import { neueId } from "@/lib/zufall";
import { cn } from "@/lib/utils";

const STUDIEN: Array<{ id: Studienwunsch; name: string }> = [
  { id: "humanmedizin", name: "Humanmedizin" },
  { id: "zahnmedizin", name: "Zahnmedizin" },
  { id: "veterinaermedizin", name: "Veterinärmedizin" },
  { id: "chiropraktik", name: "Chiropraktik" },
];

export function WochentagWahl({ wert, onWahl, label }: { wert: number; onWahl: (w: number) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <div className="grid grid-cols-7 gap-1">
        {WOCHENTAGE_KURZ.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => onWahl(i + 1)}
            aria-pressed={wert === i + 1}
            className={cn("rounded-lg border-2 py-1.5 text-xs font-bold", wert === i + 1 ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Minuten pro Wochentag, Prüfungen, Zeiträume – auch in den Einstellungen verwendet */
export function LernzeitFormular({ e, setE }: { e: Einstellungen; setE: (e: Einstellungen) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Minuten pro Tag</span>
        <div className="grid grid-cols-7 gap-1">
          {WOCHENTAGE_KURZ.map((t, i) => (
            <label key={t} className="flex flex-col items-center gap-1 text-xs font-bold">
              {t}
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                step={5}
                value={e.minutenProTag[i]}
                onChange={(ev) => {
                  const m = [...e.minutenProTag];
                  m[i] = Math.max(0, Math.min(300, Number(ev.target.value) || 0));
                  setE({ ...e, minutenProTag: m });
                }}
                className="h-10 px-1 text-center"
                aria-label={`Minuten am ${t}`}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Milan: kleine Untertests täglich ~5–10 Min., grosse paarweise. 0 = freier Tag.</p>
      </div>
      <WochentagWahl label="Simulations-Tag" wert={e.wochenrhythmus.simulationstag} onWahl={(w) => setE({ ...e, wochenrhythmus: { ...e.wochenrhythmus, simulationstag: w } })} />
      <WochentagWahl label="Schwächen-Tag" wert={e.wochenrhythmus.schwaechentag} onWahl={(w) => setE({ ...e, wochenrhythmus: { ...e.wochenrhythmus, schwaechentag: w } })} />
      <WochentagWahl label="Freier Tag" wert={e.wochenrhythmus.freierTag} onWahl={(w) => setE({ ...e, wochenrhythmus: { ...e.wochenrhythmus, freierTag: w } })} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="erinnerung">Erinnerung um</Label>
        <Input id="erinnerung" type="time" value={e.erinnerung} onChange={(ev) => setE({ ...e, erinnerung: ev.target.value })} className="w-32" />
      </div>
    </div>
  );
}

export function MaturaFormular({ e, setE }: { e: Einstellungen; setE: (e: Einstellungen) => void }) {
  const [fach, setFach] = useState("");
  const [datum, setDatum] = useState("");
  const [zr, setZr] = useState<{ von: string; bis: string; art: "pruefungswoche" | "ferien" }>({ von: "", bis: "", art: "ferien" });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Maturaprüfungen</span>
        <ul className="flex flex-col gap-1">
          {[...e.maturapruefungen]
            .sort((a, b) => a.datum.localeCompare(b.datum))
            .map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-sm">
                <span className="flex-1">
                  <b>{p.fach}</b> · {formatTag(p.datum, "mittel")}
                </span>
                <button type="button" aria-label={`${p.fach} entfernen`} onClick={() => setE({ ...e, maturapruefungen: e.maturapruefungen.filter((x) => x.id !== p.id) })}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Fach, z. B. Mathematik" value={fach} onChange={(ev) => setFach(ev.target.value)} className="min-w-0 flex-1" aria-label="Fach" />
          <Input type="date" value={datum} onChange={(ev) => setDatum(ev.target.value)} className="w-40" aria-label="Datum der Prüfung" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Prüfung hinzufügen"
            disabled={!fach.trim() || !datum}
            onClick={() => {
              setE({ ...e, maturapruefungen: [...e.maturapruefungen, { id: neueId(), fach: fach.trim(), datum }] });
              setFach("");
              setDatum("");
            }}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Prüfungswochen und Ferien</span>
        <ul className="flex flex-col gap-1">
          {e.zeitraeume.map((z) => (
            <li key={z.id} className="flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-sm">
              <span className="flex-1">
                <b>{z.art === "ferien" ? "Ferien" : "Prüfungswoche"}</b> · {formatTag(z.von, "kurz")} – {formatTag(z.bis, "kurz")}
              </span>
              <button type="button" aria-label="Zeitraum entfernen" onClick={() => setE({ ...e, zeitraeume: e.zeitraeume.filter((x) => x.id !== z.id) })}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select value={zr.art} onChange={(ev) => setZr({ ...zr, art: ev.target.value as "ferien" | "pruefungswoche" })} className="h-11 rounded-xl border-2 bg-background px-2 text-sm" aria-label="Art">
            <option value="ferien">Ferien</option>
            <option value="pruefungswoche">Prüfungswoche</option>
          </select>
          <Input type="date" value={zr.von} onChange={(ev) => setZr({ ...zr, von: ev.target.value })} className="w-40" aria-label="von" />
          <Input type="date" value={zr.bis} onChange={(ev) => setZr({ ...zr, bis: ev.target.value })} className="w-40" aria-label="bis" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Zeitraum hinzufügen"
            disabled={!zr.von || !zr.bis || zr.bis < zr.von}
            onClick={() => {
              setE({ ...e, zeitraeume: [...e.zeitraeume, { id: neueId(), ...zr }] });
              setZr({ von: "", bis: "", art: zr.art });
            }}
          >
            <Plus />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Matura-Modus: In Prüfungswochen nur kurze Einheiten, am Prüfungstag frei, danach Intensivphase.</p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [gespeichert, speichern] = useEinstellungen();
  const [e, setE] = useState<Einstellungen>(gespeichert);
  const [schritt, setSchritt] = useState(0);
  const navigate = useNavigate();
  const schritte = ["Hoi!", "Dein Ziel", "Matura", "Lernzeit"];

  async function fertig(einstufung: boolean) {
    await speichern({ ...e, onboardingFertig: true });
    navigate(einstufung ? "/einstufung" : "/", { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div className="flex gap-1.5" aria-label={`Schritt ${schritt + 1} von ${schritte.length}`}>
        {schritte.map((s, i) => (
          <span key={s} className={cn("h-2 flex-1 rounded-full", i <= schritt ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {schritt === 0 && (
        <section className="flex flex-col items-center gap-4 text-center">
          <Munggi zustand="freut" variante={e.maskottchen} className="h-36 w-36" animiert />
          <h1 className="text-2xl font-extrabold">Hoi, ich bin Munggi!</h1>
          <p className="text-muted-foreground">Ich begleite dich bis zum EMS: jeden Tag ein Plan, Methoden in 8 Stufen und Simulationen zur echten Zeit. Wähl meinen Look:</p>
          <div className="grid w-full grid-cols-3 gap-2">
            {VARIANTEN.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setE({ ...e, maskottchen: v.id })}
                aria-pressed={e.maskottchen === v.id}
                className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-2", e.maskottchen === v.id && "border-primary bg-primary/10")}
              >
                <Munggi variante={v.id} zustand="neutral" className="h-20 w-20" />
                <span className="text-xs font-bold">{v.name.split("«")[1]?.replace("»", "") ?? v.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {schritt === 1 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-extrabold">Dein Ziel</h1>
          <div className="flex flex-col gap-1">
            <Label htmlFor="maturajahr">Maturajahr (= Jahr deines EMS)</Label>
            <Input id="maturajahr" type="number" min={2026} max={2035} value={e.maturajahr} onChange={(ev) => setE({ ...e, maturajahr: Number(ev.target.value) || e.maturajahr })} className="w-32" />
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <p>
              EMS: <b>{formatTag(emsDatum(e.maturajahr))}</b> (Freitag der KW 27)
            </p>
            <p>Voranmeldung bis {formatTag(voranmeldungBis(e.maturajahr), "mittel")} · Testanmeldung bis {formatTag(testanmeldungBis(e.maturajahr), "mittel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Bitte mit der offiziellen Seite von swissuniversities abgleichen. Abweichendes Datum kannst du in den Einstellungen setzen.</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Studienwunsch</span>
            <div className="grid grid-cols-2 gap-2">
              {STUDIEN.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={e.studienwunsch === s.id}
                  onClick={() => setE({ ...e, studienwunsch: s.id })}
                  className={cn("rounded-xl border-2 p-2.5 text-sm font-semibold", e.studienwunsch === s.id && "border-primary bg-primary/10")}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {schritt === 2 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-extrabold">Matura-Modus</h1>
          <p className="text-sm text-muted-foreground">Trag deine Prüfungen ein, soweit du sie kennst. Du kannst das später jederzeit ändern.</p>
          <MaturaFormular e={e} setE={setE} />
        </section>
      )}

      {schritt === 3 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-extrabold">Deine Lernzeit</h1>
          <LernzeitFormular e={e} setE={setE} />
        </section>
      )}

      <div className="flex gap-2">
        {schritt > 0 && (
          <Button variant="outline" size="lg" onClick={() => setSchritt(schritt - 1)}>
            <ChevronLeft /> Zurück
          </Button>
        )}
        {schritt < schritte.length - 1 ? (
          <Button size="lg" className="flex-1" onClick={() => setSchritt(schritt + 1)}>
            Weiter <ChevronRight />
          </Button>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <Button size="lg" onClick={() => void fertig(true)}>
              Zum Einstufungstest (~20 Min.)
            </Button>
            <Button variant="ghost" onClick={() => void fertig(false)}>
              Später
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
