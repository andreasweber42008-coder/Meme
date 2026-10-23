import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, FileStack, Layers, Printer, RotateCcw, Timer } from "lucide-react";
import { einheitenFuer } from "@/lernpfad/einheiten";
import { useFortschritt } from "@/lernpfad/fortschritt";
import { GRUPPEN } from "@/daten/modelle";
import { UNTERTESTS } from "@/content/untertests";
import { STUFEN } from "@/content/stufen";

const KACHELN = [
  { to: "/simulation", titel: "Simulation", text: "Voll, Teil A/B oder Mini – exakte Zeiten", icon: Timer },
  { to: "/material", titel: "Material", text: "NCWiki-Serien, offizielle Aufgaben, eigene PDFs", icon: FileStack },
  { to: "/fehlerheft", titel: "Fehlerheft", text: "Wiedervorlagen und Fehler-Generalprobe", icon: RotateCcw },
  { to: "/karten", titel: "Lernkarten", text: "Tipps aus Kursskript und NCWiki", icon: Layers },
  { to: "/konz/druck", titel: "Konz auf Papier", text: "Blatt + Auswerte-Schablone drucken", icon: Printer },
  { to: "/simulation/druck", titel: "Simulation drucken", text: "Testheft, Antwortbogen, Resultate eintragen", icon: ClipboardList },
];

export default function Ueben() {
  const fortschritt = useFortschritt();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Üben</h1>
        <p className="text-sm text-muted-foreground">Zusätzlich zum Plan – frei wählbar.</p>
      </header>
      <ul className="grid grid-cols-2 gap-2">
        {KACHELN.map(({ to, titel, text, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex h-full flex-col gap-1 rounded-2xl border-2 bg-card p-3 hover:border-primary/50">
              <Icon className="h-6 w-6 text-primary" />
              <span className="font-bold">{titel}</span>
              <span className="text-xs text-muted-foreground">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Methode gezielt üben</h2>
        <ul className="flex flex-col gap-1.5">
          {GRUPPEN.flatMap((g) => einheitenFuer(g)).map((e) => {
            const fp = fortschritt[e.methodeId];
            const stufe = fp?.stufe ?? 1;
            return (
              <li key={e.methodeId} className="flex items-center gap-2 rounded-xl border-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.methode.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {UNTERTESTS.find((u) => u.id === e.gruppe)!.kurzname} · Stufe {stufe} «{STUFEN[stufe - 1].name}»
                  </p>
                </div>
                <Link to={`/lektion/${e.methodeId}/${stufe}`} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
                  Üben
                </Link>
                <Link to={`/methoden/${e.methodeId}`} aria-label={`Methode ${e.methode.name}`} className="rounded-lg border-2 p-1.5">
                  <BookOpen className="h-4 w-4" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
