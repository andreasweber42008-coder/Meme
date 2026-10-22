import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, Search } from "lucide-react";
import { METHODEN } from "@/content";
import { UNTERTESTS } from "@/content/untertests";
import { useFortschritt } from "@/lernpfad/fortschritt";
import { Input } from "@/components/ui/input";
import { ArtBadge, EmsBadge, HerkunftBadge } from "@/components/methoden/Badges";

export default function Methoden() {
  const [suche, setSuche] = useState("");
  const fortschritt = useFortschritt();

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase();
    if (!s) return METHODEN;
    return METHODEN.filter((m) => `${m.name} ${m.kurz} ${m.ziel}`.toLowerCase().includes(s));
  }, [suche]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold">Methoden-Bibliothek</h1>
        <p className="text-sm text-muted-foreground">
          Milans Methoden als Rückgrat, mit EMS-Abgleich. NCWiki und Ergänzungen sind markiert.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Methoden durchsuchen"
          placeholder="Suchen, z. B. «Kreuzblick»"
          className="pl-9"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
      </div>

      {UNTERTESTS.map((u) => {
        const liste = gefiltert.filter((m) => m.untertest === u.id);
        if (liste.length === 0) return null;
        return (
          <section key={u.id} aria-labelledby={`gruppe-${u.id}`} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`gruppe-${u.id}`} className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
                {u.name}
              </h2>
              {u.minuten && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {u.minuten} min{u.zieltempo ? ` · ${u.zieltempo}` : ""}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {liste.map((m) => {
                const verstanden = !!fortschritt[m.id]?.verstandenAm;
                return (
                  <li key={m.id}>
                    <Link
                      to={`/methoden/${m.id}`}
                      className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3 transition-colors hover:border-primary/50"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold leading-tight">{m.name}</span>
                          {verstanden && <CheckCircle2 aria-label="verstanden" className="h-4 w-4 shrink-0 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{m.kurz}</p>
                        <div className="flex flex-wrap gap-1">
                          <HerkunftBadge herkunft={m.herkunft} />
                          <EmsBadge status={m.ems.status} />
                          <ArtBadge art={m.art} />
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {gefiltert.length === 0 && <p className="text-center text-muted-foreground">Nichts gefunden.</p>}
    </div>
  );
}
