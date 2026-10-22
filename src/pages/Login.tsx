import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { authFehlerText, MIN_PASSWORT_LAENGE } from "@/lib/auth-fehler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

type Modus = "anmelden" | "einrichten" | "vergessen";

export default function Login() {
  const { session, laedt } = useAuth();
  const [modus, setModus] = useState<Modus>("anmelden");
  const [registrierungOffen, setRegistrierungOffen] = useState(false);
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase
      ?.rpc("registrierung_offen")
      .then(({ data }) => setRegistrierungOffen(data === true))
      .then(undefined, () => setRegistrierungOffen(false));
  }, []);

  if (!laedt && session) return <Navigate to="/" replace />;

  async function absenden(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setFehler(null);
    setInfo(null);
    setBeschaeftigt(true);
    try {
      if (modus === "anmelden") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
        if (error) setFehler(authFehlerText(error.message));
      } else if (modus === "einrichten") {
        if (passwort.length < MIN_PASSWORT_LAENGE) {
          setFehler(`Nimm mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwort,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) setFehler(authFehlerText(error.message));
        else if (!data.session) setInfo("Fast geschafft! Bestätige deine E-Mail-Adresse über den Link im Mail.");
        setRegistrierungOffen(false);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/passwort-neu`,
        });
        if (error) setFehler(authFehlerText(error.message));
        else setInfo("Wenn die Adresse stimmt, ist ein Link zum Zurücksetzen unterwegs.");
      }
    } finally {
      setBeschaeftigt(false);
    }
  }

  const titel = { anmelden: "Anmelden", einrichten: "Konto einrichten", vergessen: "Passwort vergessen" }[modus];
  const knopf = { anmelden: "Los geht's", einrichten: "Konto erstellen", vergessen: "Link senden" }[modus];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-16 w-16" />
        <h1 className="text-3xl font-extrabold tracking-tight">Munggi</h1>
        <p className="text-muted-foreground">Dein Weg zum EMS – Schritt für Schritt.</p>
      </div>

      {registrierungOffen && modus !== "vergessen" && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
          {(["anmelden", "einrichten"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={modus === m}
              onClick={() => setModus(m)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                modus === m ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {m === "anmelden" ? "Anmelden" : "Konto einrichten"}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={absenden} className="flex flex-col gap-4" aria-label={titel}>
            {modus === "einrichten" && (
              <p className="text-sm text-muted-foreground">
                Einmalig: Diese App erlaubt genau ein Konto. Danach ist die Registrierung für immer gesperrt.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {modus !== "vergessen" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="passwort">Passwort</Label>
                <Input
                  id="passwort"
                  type="password"
                  autoComplete={modus === "einrichten" ? "new-password" : "current-password"}
                  required
                  minLength={modus === "einrichten" ? MIN_PASSWORT_LAENGE : undefined}
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                />
              </div>
            )}
            {fehler && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {fehler}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                {info}
              </p>
            )}
            <Button type="submit" size="lg" disabled={beschaeftigt}>
              {beschaeftigt && <Loader2 className="animate-spin" />}
              {knopf}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center">
        {modus === "vergessen" ? (
          <Button variant="link" onClick={() => setModus("anmelden")}>
            Zurück zum Anmelden
          </Button>
        ) : (
          modus === "anmelden" && (
            <Button variant="link" onClick={() => setModus("vergessen")}>
              Passwort vergessen?
            </Button>
          )
        )}
      </div>
    </main>
  );
}
