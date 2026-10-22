import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { authFehlerText, MIN_PASSWORT_LAENGE } from "@/lib/auth-fehler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function PasswortNeu() {
  const { session, laedt } = useAuth();
  const navigate = useNavigate();
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);

  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (passwort.length < MIN_PASSWORT_LAENGE) {
      setFehler(`Nimm mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`);
      return;
    }
    setBeschaeftigt(true);
    const { error } = await supabase.auth.updateUser({ password: passwort });
    setBeschaeftigt(false);
    if (error) setFehler(authFehlerText(error.message));
    else navigate("/", { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-extrabold">Neues Passwort</h1>
      {!laedt && !session ? (
        <p className="text-muted-foreground">
          Der Link ist abgelaufen oder ungültig. <Link className="font-semibold text-primary" to="/login">Fordere einen neuen an.</Link>
        </p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={speichern} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="neu">Neues Passwort</Label>
                <Input
                  id="neu"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORT_LAENGE}
                  required
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                />
              </div>
              {fehler && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {fehler}
                </p>
              )}
              <Button type="submit" size="lg" disabled={beschaeftigt}>
                Speichern
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
