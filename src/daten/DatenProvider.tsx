import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { indexedDbAblage, speicherAblage } from "./ablage";
import { Abgleich, type AbgleichStatus } from "./abgleich";
import { Datenspeicher } from "./store";
import type { Sammlung } from "./typen";

interface DatenWert {
  store: Datenspeicher;
  abgleich: Abgleich | null;
}

const DatenContext = createContext<DatenWert | null>(null);

function ablageWaehlen() {
  try {
    if (typeof indexedDB !== "undefined") return indexedDbAblage();
  } catch {
    /* privater Modus ohne IndexedDB */
  }
  return speicherAblage();
}

export function DatenProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const store = useMemo(() => new Datenspeicher(ablageWaehlen()), []);
  const [geladen, setGeladen] = useState(false);
  const [abgleich, setAbgleich] = useState<Abgleich | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    store.laden().then(
      () => setGeladen(true),
      () => setGeladen(true),
    );
  }, [store]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId || !geladen) {
      setAbgleich(null);
      return;
    }
    const a = new Abgleich(store, supabase, userId);
    setAbgleich(a);
    void a.jetzt();
    store.aenderungsHaken = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void a.jetzt(), 1500);
    };
    const intervall = setInterval(() => void a.jetzt(), 60_000);
    const online = () => void a.jetzt();
    const sichtbar = () => document.visibilityState === "visible" && void a.jetzt();
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", sichtbar);
    return () => {
      clearInterval(intervall);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", sichtbar);
      store.aenderungsHaken = null;
    };
  }, [store, userId, geladen]);

  if (!geladen)
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  return <DatenContext.Provider value={{ store, abgleich }}>{children}</DatenContext.Provider>;
}

function useDaten(): DatenWert {
  const w = useContext(DatenContext);
  if (!w) throw new Error("useDaten ausserhalb von DatenProvider");
  return w;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSpeicher(): Datenspeicher {
  return useDaten().store;
}

const cache = new WeakMap<Datenspeicher, Map<string, { version: number; wert: unknown }>>();

/** Alle Dokumente einer Sammlung, aktualisiert sich automatisch. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSammlung<T>(sammlung: Sammlung): Array<T & { id: string }> {
  const store = useSpeicher();
  return useSyncExternalStore(
    (cb) => store.abonnieren(sammlung, cb),
    () => {
      let m = cache.get(store);
      if (!m) cache.set(store, (m = new Map()));
      const v = store.version(sammlung);
      const alt = m.get(sammlung);
      if (alt && alt.version === v) return alt.wert as Array<T & { id: string }>;
      const wert = store.alle<T>(sammlung);
      m.set(sammlung, { version: v, wert });
      return wert;
    },
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDokument<T>(sammlung: Sammlung, id: string): (T & { id: string }) | undefined {
  const alle = useSammlung<T>(sammlung);
  return useMemo(() => alle.find((d) => d.id === id), [alle, id]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAbgleich(): { status: AbgleichStatus | "lokal"; letzter: number | null; jetzt: () => void } {
  const { abgleich } = useDaten();
  const [, neu] = useState(0);
  useEffect(() => {
    if (!abgleich) return;
    const weg = abgleich.abonnieren(() => neu((n) => n + 1));
    return () => {
      weg();
    };
  }, [abgleich]);
  return {
    status: abgleich?.status ?? "lokal",
    letzter: abgleich?.letzter ?? null,
    jetzt: () => void abgleich?.jetzt(),
  };
}
