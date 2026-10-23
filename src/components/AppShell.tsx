import type { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { CloudOff, Dumbbell, GraduationCap, Home, Menu, PawPrint } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAbgleich } from "@/daten/DatenProvider";
import { DesignUndTon } from "@/components/app/DesignUndTon";
import { Feier } from "@/components/app/Feier";
import { Erinnerungen } from "@/components/app/Erinnerungen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Heute", icon: Home, end: true },
  { to: "/pfad", label: "Lernen", icon: GraduationCap, end: false },
  { to: "/ueben", label: "Üben", icon: Dumbbell, end: false },
  { to: "/munggi", label: "Munggi", icon: PawPrint, end: false },
  { to: "/mehr", label: "Mehr", icon: Menu, end: false },
];

/** Vollbild-Seiten ohne Navigation (Lektion, Simulation, Einstufung, Druck) */
const VOLLBILD = [/^\/lektion\//, /^\/simulation\/lauf\//, /^\/einstufung/, /^\/onboarding/, /\/druck/, /^\/fokus/];

export function AppShell({ children }: { children: ReactNode }) {
  const sync = useAbgleich();
  const { pathname } = useLocation();
  const vollbild = VOLLBILD.some((r) => r.test(pathname));
  return (
    <div className={cn("min-h-dvh", !vollbild && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0")}>
      <DesignUndTon />
      <Feier />
      <Erinnerungen />
      {!vollbild && (
        <header className="nicht-drucken sticky top-0 z-20 border-b-2 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
            <Link to="/" className="flex items-center gap-2 font-extrabold">
              <Logo className="h-8 w-8" />
              Munggi
            </Link>
            <nav className="ml-6 hidden gap-1 md:flex" aria-label="Hauptnavigation">
              {NAV.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => cn("rounded-lg px-3 py-1.5 text-sm font-semibold", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            {sync.status === "fehler" || sync.status === "offline" ? (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" title="Änderungen werden später abgeglichen">
                <CloudOff className="h-4 w-4" /> offline
              </span>
            ) : null}
          </div>
        </header>
      )}

      <main className={cn("mx-auto max-w-3xl px-4", vollbild ? "py-3" : "py-5")}>{children}</main>

      {!vollbild && (
        <nav className="nicht-drucken fixed inset-x-0 bottom-0 z-20 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Hauptnavigation">
          <div className="mx-auto grid max-w-md grid-cols-5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-xs font-bold", isActive ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
