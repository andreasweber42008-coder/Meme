import { Link } from "react-router-dom";
import { Check, Crown, Lock, Star } from "lucide-react";
import { motion } from "framer-motion";
import { STUFEN } from "@/content/stufen";
import { UNTERTESTS } from "@/content/untertests";
import { einheitenFuer } from "@/lernpfad/einheiten";
import { useFortschritt } from "@/lernpfad/fortschritt";
import { GRUPPEN } from "@/daten/modelle";
import { useEinstellungen } from "@/daten/hooks";
import { Munggi } from "@/components/maskottchen/Munggi";
import { istFaellig } from "@/lib/srs";
import { heute } from "@/lib/datum";
import { cn } from "@/lib/utils";

/** Duolingo-artiger Pfad: pro Aufgabengruppe die Einheiten mit ihren 8 Stufen */
export default function Pfad() {
  const fortschritt = useFortschritt();
  const [e] = useEinstellungen();
  const tag = heute();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Lernpfad</h1>
        <p className="text-sm text-muted-foreground">Jede Methode in 8 Stufen. Aufsteigen bei {Math.round(e.beherrschung * 100)} % richtig und eingehaltenen Schritten.</p>
      </header>

      {GRUPPEN.map((g) => {
        const u = UNTERTESTS.find((x) => x.id === g)!;
        return (
          <section key={g} className="flex flex-col gap-3" aria-labelledby={`pfad-${g}`}>
            <h2 id={`pfad-${g}`} className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {u.name}
            </h2>
            {einheitenFuer(g).map((einheit) => {
              const fp = fortschritt[einheit.methodeId];
              const stufe = fp?.stufe ?? 1;
              const gemeistert = !!fp?.beherrschtAm;
              const faellig = istFaellig(fp?.srs, tag);
              return (
                <div key={einheit.methodeId} className="rounded-2xl border-2 bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link to={`/methoden/${einheit.methodeId}`} className="font-bold hover:underline">
                      {einheit.methode.name}
                    </Link>
                    {gemeistert ? (
                      <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                        <Crown className="h-3.5 w-3.5" /> gemeistert
                      </span>
                    ) : faellig ? (
                      <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs font-bold text-info">Wiederholung fällig</span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">Stufe {stufe}/8</span>
                    )}
                  </div>
                  <ol className="flex flex-wrap items-center gap-1.5" aria-label={`Stufen ${einheit.methode.name}`}>
                    {STUFEN.map((s) => {
                      const fertig = s.nr < stufe || gemeistert;
                      const aktuell = s.nr === stufe && !gemeistert;
                      const gesperrt = s.nr > stufe;
                      const inhalt = (
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-full border-b-4 text-sm font-extrabold",
                            fertig && "border-primary/60 bg-primary text-primary-foreground",
                            aktuell && "border-gold/70 bg-gold text-white",
                            gesperrt && "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {fertig ? <Check className="h-5 w-5" /> : gesperrt ? <Lock className="h-4 w-4" /> : s.nr === 8 ? <Star className="h-5 w-5" /> : s.nr}
                        </span>
                      );
                      return (
                        <li key={s.nr} title={`Stufe ${s.nr}: ${s.name}`}>
                          {gesperrt ? (
                            <span aria-label={`Stufe ${s.nr} ${s.name}, gesperrt`}>{inhalt}</span>
                          ) : (
                            <Link to={`/lektion/${einheit.methodeId}/${s.nr}`} aria-label={`Stufe ${s.nr} ${s.name}${aktuell ? ", aktuell" : ""}`}>
                              {aktuell ? (
                                <motion.span className="block" animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}>
                                  {inhalt}
                                </motion.span>
                              ) : (
                                inhalt
                              )}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {!gemeistert && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Jetzt: Stufe {stufe} «{STUFEN[stufe - 1].name}» – {STUFEN[stufe - 1].beschreibung}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed p-4">
        <Munggi zustand="ermutigt" variante={e.maskottchen} className="h-14 w-14 shrink-0" />
        <p className="text-sm">Kleine Untertests übst du täglich, grosse im Wechsel. Konz 1–2× pro Woche mit immer neuer Regel. Der Plan auf «Heute» wählt das für dich aus.</p>
      </div>
    </div>
  );
}
