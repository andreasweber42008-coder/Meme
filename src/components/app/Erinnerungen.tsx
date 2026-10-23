import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useEinstellungen, useTage } from "@/daten/hooks";
import { testdatum } from "@/plan/plan";
import { heute, tageZwischen, uhrzeit } from "@/lib/datum";

function melden(titel: string, text: string) {
  toast(titel, { description: text, duration: 6000 });
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(titel, { body: text, icon: "/icons/icon-192.png" });
  } catch {
    /* ohne Benachrichtigungen */
  }
}

/**
 * Erinnerungen, solange die App offen ist (ohne Server-Push): Lernzeit, Serie in Gefahr,
 * in der letzten Woche früh schlafen. Für Erinnerungen bei geschlossener App: .ics-Export.
 */
export function Erinnerungen() {
  const [e] = useEinstellungen();
  const tage = useTage();
  const gezeigt = useRef(new Set<string>());
  const stand = useRef({ e, tage });
  stand.current = { e, tage };

  useEffect(() => {
    const pruefen = () => {
      const { e, tage } = stand.current;
      if (!e.onboardingFertig) return;
      // Nicht stören, während du übst oder eine Simulation läuft
      if (/^\/(lektion|training|simulation\/lauf|einstufung|fokus)/.test(window.location.pathname)) return;
      const tag = heute();
      const jetzt = uhrzeit();
      const t = tage[tag];
      const key = (k: string) => `${tag}:${k}`;
      if (jetzt >= e.erinnerung && !(t?.xp ?? 0) && !gezeigt.current.has(key("lernen"))) {
        gezeigt.current.add(key("lernen"));
        melden("Zeit für Munggi", "Dein Plan für heute wartet – schon 10 Minuten zählen.");
      }
      const d = tageZwischen(tag, testdatum(e));
      if (d >= 1 && d <= 7 && jetzt >= "21:30" && !gezeigt.current.has(key("schlaf"))) {
        gezeigt.current.add(key("schlaf"));
        melden(d === 1 ? "Morgen ist EMS" : "Genug schlafen", d === 1 ? "Tasche gepackt? Jetzt ab ins Bett." : "Ausgeschlafen bist du schneller und genauer.");
      }
    };
    pruefen();
    const i = setInterval(pruefen, 60_000);
    return () => clearInterval(i);
  }, []);
  return null;
}
