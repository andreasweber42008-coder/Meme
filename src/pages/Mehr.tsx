import { Link } from "react-router-dom";
import { BarChart3, BookOpen, CalendarDays, FileStack, Landmark, Layers, LogOut, MapPin, RotateCcw, Settings, Wind } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAbgleich } from "@/daten/DatenProvider";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/statistik", titel: "Statistik und Ampel", icon: BarChart3 },
  { to: "/woche", titel: "Plan und Kalender", icon: CalendarDays },
  { to: "/fehlerheft", titel: "Fehlerheft", icon: RotateCcw },
  { to: "/methoden", titel: "Methoden-Bibliothek", icon: BookOpen },
  { to: "/material", titel: "Material", icon: FileStack },
  { to: "/karten", titel: "Lernkarten", icon: Layers },
  { to: "/generalprobe", titel: "Generalprobe und Testtag", icon: MapPin },
  { to: "/fokus", titel: "1 Minute Fokus", icon: Wind },
  { to: "/offiziell", titel: "Offizielles und Fristen", icon: Landmark },
  { to: "/einstellungen", titel: "Einstellungen und Backup", icon: Settings },
];

export default function Mehr() {
  const { abmelden } = useAuth();
  const sync = useAbgleich();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Mehr</h1>
      <ul className="flex flex-col gap-1.5">
        {LINKS.map(({ to, titel, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3 font-semibold hover:border-primary/50">
              <Icon className="h-5 w-5 text-primary" /> {titel}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Abgleich: {sync.status === "lokal" ? "nur lokal" : sync.status}</p>
      <Button variant="ghost" onClick={abmelden} className="self-start">
        <LogOut /> Abmelden
      </Button>
    </div>
  );
}
