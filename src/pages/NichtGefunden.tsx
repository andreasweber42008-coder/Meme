import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NichtGefunden() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🏔️
      </p>
      <h1 className="text-2xl font-extrabold">Hier geht’s nicht weiter</h1>
      <p className="text-muted-foreground">Diese Seite gibt es nicht.</p>
      <Button onClick={() => history.back()} variant="outline">
        Zurück
      </Button>
      <Link to="/" className="text-sm font-semibold text-primary">
        Zum Start
      </Link>
    </div>
  );
}
