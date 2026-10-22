import { Logo } from "@/components/Logo";

export function KonfigurationFehlt() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 text-center">
      <Logo className="mx-auto h-14 w-14" />
      <h1 className="text-2xl font-extrabold">Noch nicht verbunden</h1>
      <p className="text-muted-foreground">
        Munggi braucht Lovable Cloud für den Login. Sobald das Projekt verbunden ist, setzt Lovable
        <code className="mx-1 rounded bg-muted px-1">VITE_SUPABASE_URL</code> und
        <code className="mx-1 rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> automatisch.
      </p>
    </main>
  );
}
