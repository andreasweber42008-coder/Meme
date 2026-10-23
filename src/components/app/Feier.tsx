import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { feiernAbonnieren, type Feier as FeierEreignis } from "@/lernpfad/protokoll";
import { methodeById } from "@/content";
import { MeinMunggi } from "@/munggi/MeinMunggi";
import { ton } from "@/lib/ton";

function text(f: FeierEreignis): { titel: string; unter: string } {
  switch (f.art) {
    case "tagesziel":
      return { titel: "Tagesziel geschafft!", unter: "Deine Serie lebt. Morgen weiter so." };
    case "abzeichen":
      return { titel: f.abzeichen.titel, unter: f.abzeichen.beschreibung };
    case "stufe":
      return { titel: `Stufe ${f.stufe} freigeschaltet`, unter: methodeById(f.methodeId)?.name ?? "" };
    case "gemeistert":
      return { titel: "Methode gemeistert!", unter: `${methodeById(f.methodeId)?.name ?? ""} – Stufe 8 «Ernstfall» bestanden.` };
  }
}

const KONFETTI = ["#f59f00", "#1f8a5b", "#1c7ed6", "#e8590c", "#ae3ec9"];

/** Feier-Overlay für Tagesziel, Abzeichen, Stufen-Aufstieg */
export function Feier() {
  const [warteschlange, setWarteschlange] = useState<FeierEreignis[]>([]);
  useEffect(
    () =>
      feiernAbonnieren((f) => {
        setWarteschlange((w) => [...w, f]);
        ton.feiern();
      }),
    [],
  );
  const aktuell = warteschlange[0];
  useEffect(() => {
    if (!aktuell) return;
    const t = setTimeout(() => setWarteschlange((w) => w.slice(1)), 2600);
    return () => clearTimeout(t);
  }, [aktuell]);
  return (
    <AnimatePresence>
      {aktuell && (
        <motion.div
          key={JSON.stringify(aktuell)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setWarteschlange((w) => w.slice(1))}
          role="status"
          aria-live="polite"
        >
          {Array.from({ length: 18 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute h-2.5 w-2.5 rounded-sm"
              style={{ background: KONFETTI[i % KONFETTI.length], left: "50%", top: "45%" }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: Math.cos((i / 18) * Math.PI * 2) * (120 + (i % 3) * 40), y: Math.sin((i / 18) * Math.PI * 2) * (120 + (i % 4) * 30) + 80, rotate: 360, opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          ))}
          <motion.div className="flex flex-col items-center gap-2 rounded-3xl border-2 bg-card p-6 text-center shadow-xl" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <MeinMunggi zustand="feiert" className="h-28 w-28" animiert />
            <p className="text-xl font-extrabold">{text(aktuell).titel}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{text(aktuell).unter}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
