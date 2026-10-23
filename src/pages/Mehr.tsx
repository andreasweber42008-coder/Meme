import { Link } from "react-router-dom";
import { BarChart3, BookOpen, CalendarDays, ChevronRight, FileStack, Landmark, Layers, LogOut, MapPin, RotateCcw, Settings, Wind, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAbgleich } from "@/daten/DatenProvider";
import { Button } from "@/components/ui/button";

const GRUPPEN: Array<{ titel: string; links: Array<{ to: string; titel: string; text: string; icon: LucideIcon }> }> = [
  {
    titel: "Planen",
    links: [
      { to: "/woche", titel: "Woche und Kalender", text: "Countdown, Wochenplan, .ics-Export, Termine", icon: CalendarDays },
      { to: "/generalprobe", titel: "Testtag", text: "Anreise, Checkliste, Generalprobe", icon: MapPin },
      { to: "/offiziell", titel: "Offizielles", text: "Fristen und Unterlagen", icon: Landmark },
    ],
  },
  {
    titel: "Auswerten",
    links: [
      { to: "/statistik", titel: "Statistik", text: "Ampel, Trends, Schritt-Fehler", icon: BarChart3 },
      { to: "/fehlerheft", titel: "Fehlerheft", text: "Wiedervorlagen", icon: RotateCcw },
    ],
  },
  {
    titel: "Nachschlagen",
    links: [
      { to: "/methoden", titel: "Methoden-Bibliothek", text: "Alle Methoden mit Schritten und Videos", icon: BookOpen },
      { to: "/material", titel: "Material", text: "NCWiki, offizielle Aufgaben, eigene PDFs", icon: FileStack },
      { to: "/karten", titel: "Lernkarten", text: "Tipps zum Wiederholen", icon: Layers },
      { to: "/fokus", titel: "1 Minute Fokus", text: "Atemübung", icon: Wind },
    ],
  },
  {
    titel: "Konto",
    links: [{ to: "/einstellungen", titel: "Einstellungen", text: "Lernzeit, Matura, Ziele, Design, Backup", icon: Settings }],
  },
];

export default function Mehr() {
  const { abmelden } = useAuth();
  const sync = useAbgleich();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Mehr</h1>
      {GRUPPEN.map((g) => (
        <section key={g.titel} className="flex flex-col gap-1.5" aria-labelledby={`mehr-${g.titel}`}>
          <h2 id={`mehr-${g.titel}`} className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {g.titel}
          </h2>
          <ul className="overflow-hidden rounded-2xl border-2 bg-card">
            {g.links.map(({ to, titel, text, icon: Icon }, i) => (
              <li key={to} className={i > 0 ? "border-t" : undefined}>
                <Link to={to} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{titel}</span>
                    <span className="block truncate text-xs text-muted-foreground">{text}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Abgleich: {sync.status === "lokal" ? "nur lokal" : sync.status}</p>
      <Button variant="ghost" onClick={abmelden} className="self-start">
        <LogOut /> Abmelden
      </Button>
    </div>
  );
}
