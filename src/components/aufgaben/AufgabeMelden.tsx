import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import type { Aufgabe } from "@/aufgaben/typen";
import type { Meldung } from "@/daten/modelle";
import { useSpeicher } from "@/daten/DatenProvider";
import { Button } from "@/components/ui/button";
import { neueId } from "@/lib/zufall";

/** «Aufgabe melden»: unklare oder fehlerhafte generierte Aufgabe – wird nicht mehr gezeigt. */
export function AufgabeMelden({ aufgabe }: { aufgabe: Aufgabe }) {
  const store = useSpeicher();
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  if (!offen)
    return (
      <button type="button" onClick={() => setOffen(true)} className="flex items-center gap-1 self-start text-xs font-semibold text-muted-foreground hover:text-foreground">
        <Flag className="h-3.5 w-3.5" /> Aufgabe melden
      </button>
    );
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 p-3">
      <label htmlFor="meldung" className="text-sm font-bold">
        Was stimmt nicht?
      </label>
      <textarea id="meldung" value={text} onChange={(e) => setText(e.target.value)} rows={2} className="rounded-lg border-2 bg-background p-2 text-sm" placeholder="z. B. «Zwei Antworten sind richtig»" />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await store.speichern<Meldung>("meldungen", neueId(), { zeit: Date.now(), generator: aufgabe.generator, seed: aufgabe.seed, schwierigkeit: aufgabe.schwierigkeit, text: text.trim() || "ohne Text", quelle: aufgabe.quelle });
            toast.success("Danke! Die Aufgabe kommt nicht mehr dran.");
            setOffen(false);
          }}
        >
          Melden
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
