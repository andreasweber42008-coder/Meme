import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { erzeugeBlatt, KONZ_REGELN, konzRegel, punktwert } from "@/aufgaben/konz";
import { useSpeicher } from "@/daten/DatenProvider";
import { usePlanStand } from "@/daten/hooks";
import { naechsteKonzRegel } from "@/plan/plan";
import { versuchSpeichern } from "@/lernpfad/protokoll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KonzDruckblatt } from "@/components/aufgaben/KonzBlattAnsicht";
import { heute } from "@/lib/datum";
import { neuerSeed } from "@/lib/zufall";

/** Konz auf Papier: Blatt + Auswerte-Schablone drucken, danach Zählung eintragen. */
export default function KonzDruck() {
  const store = useSpeicher();
  const stand = usePlanStand();
  const [regelId, setRegelId] = useState(() => naechsteKonzRegel(stand, heute()));
  const [seed, setSeed] = useState(() => neuerSeed());
  const blatt = useMemo(() => erzeugeBlatt(regelId, seed, 40, 40), [regelId, seed]);
  const regel = konzRegel(regelId);
  const [zahl, setZahl] = useState({ richtig: "", falsch: "", uebersehen: "" });
  const roh = Math.max(0, (Number(zahl.richtig) || 0) - (Number(zahl.falsch) || 0) - (Number(zahl.uebersehen) || 0));

  return (
    <div className="flex flex-col gap-4">
      <div className="nicht-drucken flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-extrabold">Konz auf Papier</h1>
          <p className="text-sm text-muted-foreground">Wie im Test: Filzstift, 8 Minuten, zeilenweise. Danach mit der Schablone zählen – bis zur letzten Markierung.</p>
        </header>
        <div className="flex flex-col gap-1">
          <Label htmlFor="regel">Regel</Label>
          <select id="regel" value={regelId} onChange={(e) => setRegelId(e.target.value)} className="h-11 rounded-xl border-2 bg-background px-2">
            {KONZ_REGELN.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}: {r.titel}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Vorschlag: die am längsten nicht geübte Regel. Jede Übung mit neuer Regel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>
            <Printer /> Blatt + Schablone drucken
          </Button>
          <Button variant="outline" onClick={() => setSeed(neuerSeed())}>
            Neues Blatt
          </Button>
        </div>
        <section className="flex flex-col gap-2 rounded-2xl border-2 p-4">
          <h2 className="font-extrabold">Resultat eintragen</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["richtig", "falsch", "uebersehen"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1">
                <Label htmlFor={k}>{k === "uebersehen" ? "übersehen" : k}</Label>
                <Input id={k} type="number" min={0} inputMode="numeric" value={zahl[k]} onChange={(e) => setZahl({ ...zahl, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="text-sm">
            Rohwert <b>{roh}</b> · Punktwert ca. <b>{punktwert(roh, regel.tabelle)}</b> von 18 (Näherung, Tabelle {regel.tabelle})
          </p>
          <Button
            disabled={!zahl.richtig}
            onClick={async () => {
              await versuchSpeichern(store, {
                gruppe: "konz",
                quelle: "konz",
                methodeId: "konz-zeilenweise",
                generator: "konz",
                seed: `${regelId}:${seed}`,
                antwort: roh,
                loesung: blatt.ziele.flat().filter(Boolean).length,
                richtig: (Number(zahl.falsch) || 0) + (Number(zahl.uebersehen) || 0) <= Math.max(1, (Number(zahl.richtig) || 0) * 0.15),
                dauerMs: 8 * 60_000,
                zielMs: 8 * 60_000,
              });
              toast.success("Gespeichert");
              setZahl({ richtig: "", falsch: "", uebersehen: "" });
              setSeed(neuerSeed());
            }}
          >
            Speichern
          </Button>
        </section>
        <p className="text-xs text-muted-foreground">Vorschau des Blatts:</p>
      </div>
      <div className="overflow-hidden rounded-xl border-2">
        <KonzDruckblatt blatt={blatt} anweisung={regel.anweisung} titel={`Konz · Regel ${regel.id}`} />
      </div>
      <div className="druck-nur">
        <KonzDruckblatt blatt={blatt} anweisung={regel.anweisung} titel={`Auswerte-Schablone · Regel ${regel.id}`} schablone />
      </div>
    </div>
  );
}
