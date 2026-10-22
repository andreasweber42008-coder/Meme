import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { METHODEN } from "@/content";
import { UNTERTESTS } from "@/content/untertests";
import { useFortschritt } from "@/hooks/useFortschritt";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

const EINHEITEN = METHODEN.filter((m) => m.art === "einheit");

export default function Start() {
  const { data: fortschritt, isLoading } = useFortschritt();
  const verstanden = EINHEITEN.filter((m) => fortschritt?.[m.id]?.verstanden_am).length;
  const naechste = EINHEITEN.find((m) => !fortschritt?.[m.id]?.verstanden_am);
  const anteil = Math.round((verstanden / EINHEITEN.length) * 100);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Logo className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-extrabold">Hoi!</h1>
          <p className="text-sm text-muted-foreground">Schön, bist du da. Heute lernst du eine Methode kennen.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stufe 1 «Verstehen»</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={EINHEITEN.length}
            aria-valuenow={verstanden}
            aria-label="Verstandene Methoden"
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${anteil}%` }} />
          </div>
          <p className="text-sm">
            {isLoading ? "Lade Fortschritt …" : `${verstanden} von ${EINHEITEN.length} Lern-Einheiten verstanden.`}
          </p>
          {naechste ? (
            <Link to={`/methoden/${naechste.id}`} className={buttonVariants({ size: "lg" })}>
              Weiter: {naechste.name} <ArrowRight />
            </Link>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="h-5 w-5" /> Alle Methoden verstanden – stark!
            </p>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Die 9 Aufgabengruppen</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {UNTERTESTS.filter((u) => u.id !== "uebergreifend").map((u) => (
            <li key={u.id} className="rounded-xl border-2 bg-card p-3">
              <p className="font-bold leading-tight">{u.kurzname}</p>
              <p className="text-xs text-muted-foreground">
                Teil {u.teil} · {u.minuten} min
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Phase 1: Login und Methoden-Bibliothek. Lernplan, Lernpfad und Übungen folgen in den nächsten Phasen.
      </p>
    </div>
  );
}
