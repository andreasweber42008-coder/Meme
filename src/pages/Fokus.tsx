import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { planErledigt } from "@/lernpfad/protokoll";
import { Munggi } from "@/components/maskottchen/Munggi";
import { Button } from "@/components/ui/button";
import { Uhr, useCountdown } from "@/lektion/gemeinsam";
import { heute } from "@/lib/datum";
import { ton } from "@/lib/ton";

const PHASEN = [
  { text: "Einatmen", skala: 1.35 },
  { text: "Halten", skala: 1.35 },
  { text: "Ausatmen", skala: 0.8 },
  { text: "Halten", skala: 0.8 },
];

/** 1 Minute Fokus: Box-Atmung 4-4-4-4 vor Simulationen und am Testtag. */
export default function Fokus() {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const navigate = useNavigate();
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [phase, setPhase] = useState(0);
  const rest = useCountdown(60, laeuft, () => {
    setLaeuft(false);
    setFertig(true);
    ton.fertig();
  });

  useEffect(() => {
    if (!laeuft) return;
    const t = setInterval(() => {
      setPhase((p) => (p + 1) % 4);
      ton.tipp();
    }, 4000);
    return () => clearInterval(t);
  }, [laeuft]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-2xl font-extrabold">1 Minute Fokus</h1>
      <div className="relative flex h-64 w-64 items-center justify-center">
        <motion.div
          className="absolute inset-6 rounded-full bg-primary/20"
          animate={{ scale: laeuft ? PHASEN[phase].skala : 1 }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />
        <Munggi zustand="fokussiert" variante={e.maskottchen} className="relative h-32 w-32" />
      </div>
      {laeuft ? (
        <>
          <p className="text-xl font-bold" aria-live="polite">
            {PHASEN[phase].text} … 4
          </p>
          <Uhr sekunden={rest} warnung={0} />
        </>
      ) : fertig ? (
        <>
          <p className="max-w-xs text-muted-foreground">Schultern locker, Blick weich. Du kennst deine Methoden – jetzt einfach anwenden.</p>
          <Button
            size="lg"
            onClick={async () => {
              await planErledigt(store, `${heute()}:fokus`, 1, 2);
              navigate(-1);
            }}
          >
            Bereit
          </Button>
        </>
      ) : (
        <>
          <p className="max-w-xs text-muted-foreground">Box-Atmung: 4 Sekunden ein, 4 halten, 4 aus, 4 halten. Setz dich aufrecht hin.</p>
          <Button
            size="lg"
            onClick={() => {
              setPhase(0);
              setLaeuft(true);
            }}
          >
            Starten
          </Button>
        </>
      )}
    </div>
  );
}
