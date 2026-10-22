import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthWert {
  session: Session | null;
  laedt: boolean;
  /** true, wenn der Nutzer über den Link «Passwort vergessen» kam */
  passwortWiederherstellung: boolean;
  abmelden: () => Promise<void>;
}

const AuthContext = createContext<AuthWert | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [passwortWiederherstellung, setPasswortWiederherstellung] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLaedt(false);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, neueSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswortWiederherstellung(true);
      if (event === "USER_UPDATED" || event === "SIGNED_OUT") setPasswortWiederherstellung(false);
      setSession(neueSession);
      setLaedt(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLaedt(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const wert = useMemo<AuthWert>(
    () => ({
      session,
      laedt,
      passwortWiederherstellung,
      abmelden: async () => {
        await supabase?.auth.signOut();
        setPasswortWiederherstellung(false);
      },
    }),
    [session, laedt, passwortWiederherstellung],
  );

  return <AuthContext.Provider value={wert}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthWert {
  const wert = useContext(AuthContext);
  if (!wert) throw new Error("useAuth ausserhalb von AuthProvider");
  return wert;
}
