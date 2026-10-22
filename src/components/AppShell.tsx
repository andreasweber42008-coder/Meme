import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { BookOpen, Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Start", icon: Home, end: true },
  { to: "/methoden", label: "Methoden", icon: BookOpen, end: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { abmelden } = useAuth();
  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-20 border-b-2 bg-background/90 backdrop-blur">
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
                className={({ isActive }) =>
                  cn("rounded-lg px-3 py-1.5 text-sm font-semibold", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={abmelden} aria-label="Abmelden">
            <LogOut /> <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Hauptnavigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn("flex flex-col items-center gap-0.5 py-2 text-xs font-bold", isActive ? "text-primary" : "text-muted-foreground")
              }
            >
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
