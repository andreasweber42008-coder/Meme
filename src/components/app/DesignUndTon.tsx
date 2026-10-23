import { useEffect } from "react";
import { useEinstellungen } from "@/daten/hooks";
import { tonEinstellen } from "@/lib/ton";

/** Wendet Design (hell/dunkel/System) und Ton-Einstellung an. */
export function DesignUndTon() {
  const [e] = useEinstellungen();
  useEffect(() => {
    tonEinstellen(e.ton);
  }, [e.ton]);
  useEffect(() => {
    try {
      localStorage.setItem("munggi-design", e.design);
    } catch {
      /* privater Modus */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const anwenden = () => document.documentElement.classList.toggle("dark", e.design === "dunkel" || (e.design === "system" && mq.matches));
    anwenden();
    mq.addEventListener("change", anwenden);
    return () => mq.removeEventListener("change", anwenden);
  }, [e.design]);
  return null;
}
