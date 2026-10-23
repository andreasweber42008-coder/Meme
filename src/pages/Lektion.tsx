import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Lock } from "lucide-react";
import { methodeById } from "@/content";
import { EINHEITEN } from "@/lernpfad/einheiten";
import { useFortschritt, useVerstanden } from "@/lernpfad/fortschritt";
import { STUFEN } from "@/content/stufen";
import { Button, buttonVariants } from "@/components/ui/button";
import { EinzelLektion } from "@/lektion/EinzelLektion";
import { GedaechtnisLektion } from "@/lektion/GedaechtnisLektion";
import { KonzLektion } from "@/lektion/KonzLektion";
import { LektionsRahmen } from "@/lektion/gemeinsam";

export default function Lektion() {
  const { methodeId = "", stufe: stufeText } = useParams();
  const [params] = useSearchParams();
  const fortschritt = useFortschritt();
  const verstanden = useVerstanden();
  const einheit = EINHEITEN.find((e) => e.methodeId === methodeId);
  const methode = methodeById(methodeId);
  if (!einheit || !methode) return <Navigate to="/pfad" replace />;
  const aktuell = fortschritt[methodeId]?.stufe ?? 1;
  const stufe = Math.min(8, Math.max(1, Number(stufeText) || aktuell));
  const planId = params.get("plan") ?? undefined;

  if (stufe > aktuell)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-extrabold">Stufe {stufe} ist noch gesperrt</h1>
        <p className="text-sm text-muted-foreground">Erst Stufe {aktuell} «{STUFEN[aktuell - 1].name}» beherrschen – dann geht es weiter.</p>
        <Link to={`/lektion/${methodeId}/${aktuell}`} className={buttonVariants({ size: "lg" })}>
          Zu Stufe {aktuell}
        </Link>
      </div>
    );

  if (stufe === 1)
    return (
      <LektionsRahmen titel={`${methode.name} · Stufe 1 «Verstehen»`} untertitel={STUFEN[0].beschreibung} fortschritt={0.5}>
        <div className="flex flex-col gap-2 rounded-xl border-2 p-4">
          <p className="font-bold">{methode.kernaussage}</p>
          <ol className="list-decimal pl-5 text-sm">
            {methode.schritte.map((s) => (
              <li key={s.nr}>
                <b>{s.titel}:</b> {s.tun}
              </li>
            ))}
          </ol>
        </div>
        <Link to={`/methoden/${methode.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <BookOpen /> Ganze Methoden-Karte und Video
        </Link>
        <Button
          size="lg"
          onClick={async () => {
            await verstanden(methode.id, true);
          }}
        >
          Verstanden – weiter zu Stufe 2
        </Button>
      </LektionsRahmen>
    );

  const key = `${methodeId}:${stufe}`;
  if (einheit.format === "gedaechtnis") return <GedaechtnisLektion key={key} einheit={einheit} stufe={stufe} planId={planId} />;
  if (einheit.format === "konz") return <KonzLektion key={key} einheit={einheit} stufe={stufe} planId={planId} />;
  return <EinzelLektion key={key} einheit={einheit} stufe={stufe} planId={planId} />;
}
