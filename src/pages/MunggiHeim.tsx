import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, Lock, Shield, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen, useGamification, useTage } from "@/daten/hooks";
import { Munggi, type MunggiZustand } from "@/components/maskottchen/Munggi";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { Szene } from "@/munggi/Szene";
import { ARTIKEL, guthaben, MAX_SCHUTZ, PLAETZE, type Platz, type ShopArtikel } from "@/munggi/shop";
import { artikelAnziehen, artikelKaufen } from "@/munggi/aktionen";
import { TIPP_SPRUECHE } from "@/munggi/sprueche";
import { istFreierTag } from "@/lernpfad/protokoll";
import { ABZEICHEN, streak } from "@/lib/gamification";
import { formatTag, heute } from "@/lib/datum";
import { ton } from "@/lib/ton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Reiter = "shop" | "garderobe" | "abzeichen";

function Vorschau({ a, variante }: { a: ShopArtikel; variante: "a" | "b" | "c" }) {
  if (a.platz === "extra")
    return (
      <div className="flex h-20 items-center justify-center">
        <Shield className="h-12 w-12 text-info" />
      </div>
    );
  if (a.platz === "hintergrund")
    return (
      <Szene id={a.id} className="h-20 rounded-xl border-0">
        <div className="h-20" />
      </Szene>
    );
  return <Munggi variante={variante} zubehoer={{ [a.platz]: a.id }} animiert={false} className="mx-auto h-20 w-20" titel={a.name} />;
}

export default function MunggiHeim() {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const g = useGamification();
  const tage = useTage();
  const [reiter, setReiter] = useState<Reiter>("shop");
  const [platz, setPlatz] = useState<Platz | "extra">("kopf");
  const [reaktion, setReaktion] = useState<{ zustand: MunggiZustand; text: string } | null>(null);
  const xp = guthaben(g);
  const serie = streak(tage, heute(), (t) => istFreierTag(store, t));
  const inventar = new Set(g.inventar ?? []);

  function freuen(text: string) {
    setReaktion({ zustand: "feiert", text });
    setTimeout(() => setReaktion(null), 2200);
  }

  async function kaufen(a: ShopArtikel) {
    const fehler = await artikelKaufen(store, a.id);
    if (fehler === "zu-teuer") toast(`Dir fehlen noch ${a.preis - xp} XP.`);
    else if (fehler === "voll") toast(`Du hast schon ${MAX_SCHUTZ} Serien-Schutze.`);
    else if (!fehler) {
      ton.feiern();
      freuen(a.platz === "extra" ? "Danke! Deine Serie ist jetzt besser geschützt." : `${a.name}? Steht mir!`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Munggi</h1>
        <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 font-extrabold tabular-nums text-gold" aria-label={`${xp} XP Guthaben`}>
          <Sparkles className="h-4 w-4" /> {xp} XP
        </span>
      </header>

      <Szene id={g.angezogen?.hintergrund} className="h-64">
        <button
          type="button"
          className="relative flex h-64 w-full items-end justify-center pb-4"
          aria-label="Munggi antippen"
          onClick={() => {
            ton.tipp();
            setReaktion({ zustand: "freut", text: TIPP_SPRUECHE[Math.floor(Math.random() * TIPP_SPRUECHE.length)] });
            setTimeout(() => setReaktion(null), 2600);
          }}
        >
          <MeinMunggi zustand={reaktion?.zustand ?? (serie > 0 ? "neutral" : "ermutigt")} className="h-48 w-48" />
          <AnimatePresence>
            {reaktion && (
              <motion.span
                key={reaktion.text}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-1/2 top-3 max-w-[85%] -translate-x-1/2 rounded-2xl border-2 bg-card px-3 py-2 text-sm font-semibold shadow"
              >
                {reaktion.text}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </Szene>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border-2 p-2">
          <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-flamme">
            <Flame className="h-4 w-4" /> {serie}
          </p>
          <p className="text-[11px] text-muted-foreground">Tage am Stück</p>
        </div>
        <div className="rounded-2xl border-2 p-2">
          <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-info">
            <Shield className="h-4 w-4" /> {g.streakSchutz}
          </p>
          <p className="text-[11px] text-muted-foreground">Serien-Schutz</p>
        </div>
        <div className="rounded-2xl border-2 p-2">
          <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-gold">
            <Trophy className="h-4 w-4" /> {g.abzeichen.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Abzeichen</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1" role="tablist">
        {(
          [
            ["shop", "Shop"],
            ["garderobe", "Garderobe"],
            ["abzeichen", "Abzeichen"],
          ] as const
        ).map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={reiter === id} onClick={() => setReiter(id)} className={cn("rounded-xl py-2 text-sm font-bold", reiter === id ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {name}
          </button>
        ))}
      </div>

      {reiter === "shop" && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Du zahlst mit XP aus richtigen Antworten, Lektionen und Stufen. Deine gesammelten XP in der Statistik bleiben dabei gleich.</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[...PLAETZE, { id: "extra" as const, name: "Extras" }].map((p) => (
              <button key={p.id} type="button" onClick={() => setPlatz(p.id)} className={cn("shrink-0 rounded-full border-2 px-3 py-1 text-sm font-semibold", platz === p.id && "border-primary bg-primary/10 text-primary")}>
                {p.name}
              </button>
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ARTIKEL.filter((a) => a.platz === platz).map((a) => {
              const hat = inventar.has(a.id);
              const leistbar = xp >= a.preis;
              return (
                <li key={a.id} className={cn("flex flex-col gap-1.5 rounded-2xl border-2 bg-card p-2.5", hat && "border-primary/40")}>
                  <Vorschau a={a} variante={e.maskottchen} />
                  <p className="font-bold leading-tight">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.beschreibung}</p>
                  {hat ? (
                    <Button size="sm" variant="outline" onClick={() => a.platz !== "extra" && void artikelAnziehen(store, a.platz, a.id)}>
                      {g.angezogen?.[a.platz as Platz] === a.id ? (
                        <>
                          <Check /> Angezogen
                        </>
                      ) : (
                        "Anziehen"
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" variant={leistbar ? "default" : "outline"} disabled={!leistbar} onClick={() => void kaufen(a)}>
                      {leistbar ? <Sparkles /> : <Lock />} {a.preis} XP
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reiter === "garderobe" && (
        <section className="flex flex-col gap-3">
          {inventar.size === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Noch nichts gekauft. Im Shop findest du Mützen, Brillen, Hintergründe und mehr.</p>}
          {PLAETZE.map((p) => {
            const eigene = ARTIKEL.filter((a) => a.platz === p.id && inventar.has(a.id));
            if (!eigene.length) return null;
            return (
              <div key={p.id} className="flex flex-col gap-1.5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{p.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {eigene.map((a) => {
                    const an = g.angezogen?.[p.id] === a.id;
                    return (
                      <button key={a.id} type="button" aria-pressed={an} onClick={() => void artikelAnziehen(store, p.id, a.id)} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold", an && "border-primary bg-primary/10 text-primary")}>
                        {an && <Check className="mr-1 inline h-3.5 w-3.5" />}
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {reiter === "abzeichen" && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...ABZEICHEN, ...g.abzeichen.filter((a) => a.id.startsWith("methode:")).map((a) => ({ id: a.id, titel: a.titel, beschreibung: "Stufe 8 bestanden." }))].map((a) => {
            const hat = g.abzeichen.find((x) => x.id === a.id);
            return (
              <li key={a.id} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center", hat ? "border-gold bg-gold/10" : "opacity-50")}>
                <Trophy className={cn("h-8 w-8", hat ? "text-gold" : "text-muted-foreground")} />
                <p className="text-sm font-bold leading-tight">{a.titel}</p>
                <p className="text-[11px] text-muted-foreground">{hat ? `seit ${formatTag(hat.am, "kurz")}` : a.beschreibung}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
