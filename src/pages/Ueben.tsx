import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList, FileStack, Layers, MapPin, Printer, RotateCcw, Timer, type LucideIcon } from "lucide-react";
import { useSammlung } from "@/daten/DatenProvider";
import type { Fehler } from "@/daten/modelle";
import { istFaellig } from "@/lib/srs";
import { heute } from "@/lib/datum";

interface Kachel {
  to: string;
  titel: string;
  text: string;
  icon: LucideIcon;
  marke?: string;
}

function Bereich({ titel, kacheln }: { titel: string; kacheln: Kachel[] }) {
  return (
    <section className="flex flex-col gap-1.5" aria-labelledby={`ueben-${titel}`}>
      <h2 id={`ueben-${titel}`} className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        {titel}
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {kacheln.map(({ to, titel: t, text, icon: Icon, marke }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3 hover:border-primary/50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold">
                  {t}
                  {marke && <span className="rounded-full bg-flamme px-2 py-0.5 text-[11px] font-extrabold text-white">{marke}</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Ueben() {
  const fehler = useSammlung<Fehler>("fehlerheft");
  const faellig = fehler.filter((f) => !f.erledigt && istFaellig(f.srs, heute())).length;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Üben</h1>
        <p className="text-sm text-muted-foreground">Zusätzlich zum Tagespfad. Methoden lernst du unter «Lernen».</p>
      </header>
      <Bereich
        titel="Wiederholen"
        kacheln={[{ to: "/fehlerheft", titel: "Fehlerheft", text: "Deine Fehler mit Ursache und Wiedervorlage", icon: RotateCcw, marke: faellig ? `${faellig} fällig` : undefined }]}
      />
      <Bereich
        titel="Wie im Test"
        kacheln={[
          { to: "/simulation", titel: "Simulation", text: "Voll, Teil A/B oder Mini – exakte Zeiten", icon: Timer },
          { to: "/generalprobe", titel: "Generalprobe", text: "Zur echten Uhrzeit, mit Anreise", icon: MapPin },
        ]}
      />
      <Bereich
        titel="Material"
        kacheln={[
          { to: "/material", titel: "Übungsserien", text: "NCWiki, offizielle Aufgaben, eigene PDFs", icon: FileStack },
          { to: "/karten", titel: "Lernkarten", text: "Tipps aus Kursskript und NCWiki", icon: Layers },
        ]}
      />
      <Bereich
        titel="Auf Papier"
        kacheln={[
          { to: "/konz/druck", titel: "Konz drucken", text: "Blatt + Auswerte-Schablone", icon: Printer },
          { to: "/simulation/druck", titel: "Simulation drucken", text: "Testheft und Antwortbogen, danach Resultate eintragen", icon: ClipboardList },
        ]}
      />
    </div>
  );
}
