import { Munggi, type MunggiZustand } from "@/components/maskottchen/Munggi";
import { useEinstellungen, useGamification } from "@/daten/hooks";

/** Munggi mit deiner gewählten Variante und den angezogenen Gegenständen */
export function MeinMunggi({ zustand = "neutral", className, animiert = true, titel }: { zustand?: MunggiZustand; className?: string; animiert?: boolean; titel?: string }) {
  const [e] = useEinstellungen();
  const g = useGamification();
  const { hintergrund: _h, ...zubehoer } = g.angezogen ?? {};
  void _h;
  return <Munggi zustand={zustand} variante={e.maskottchen} zubehoer={zubehoer} className={className} animiert={animiert} titel={titel} />;
}
