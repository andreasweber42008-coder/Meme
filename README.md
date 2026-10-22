# Munggi

Persönliche Lern-App für den Schweizer Eignungstest für das Medizinstudium (EMS). Nur für ein Konto, hinter Login.
Grundlage für alles: [`docs/REFERENZ.md`](docs/REFERENZ.md).

**Stand: Phase 1** – Login (nur ein Konto), Methoden aus deinen Notizen (`src/content/methoden.json`), Methoden-Bibliothek.

## Mit Lovable verbinden

1. In Lovable ein Projekt anlegen und **Lovable Cloud** aktivieren.
2. Das Projekt mit GitHub verbinden. Kann Lovable dieses Repo nicht direkt übernehmen, legt es ein eigenes (privates) Repo an: Den Namen gibst du Claude, Claude pusht den Code dorthin.
3. Datenbank: Im Lovable-Chat die Migration ausführen lassen, z. B. «Führe die SQL-Migration aus `supabase/migrations/20261022120000_phase1_konto_und_fortschritt.sql` unverändert aus.»
4. In den Auth-Einstellungen von Lovable Cloud Site-URL und Redirect-URL auf die veröffentlichte Adresse setzen (für «Passwort vergessen»).
5. App öffnen → «Konto einrichten» → dein Konto anlegen.
6. Danach in den Auth-Einstellungen die Registrierung ausschalten. Selbst wenn sie offen bliebe, blockiert der Datenbank-Trigger `nur_ein_konto` jedes weitere Konto.
7. Veröffentlichen. Auf dem Handy über «Zum Home-Bildschirm» hinzufügen (vollwertige PWA ab Phase 3).

Lovable Cloud setzt `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` automatisch. Lokal: `.env` nach `.env.example` anlegen.

## Entwickeln und testen

```sh
npm install
npm run dev          # http://localhost:8080
npm run check        # Typecheck, Lint, Unit-Tests, Build
npm run test:e2e     # Playwright-Rundgang (Handy + Desktop), Supabase nachgestellt
npm run test:db      # Migrationen gegen temporäres PostgreSQL: Ein-Konto-Sperre und RLS
```

## Datenschutz

- Fremdmaterial (NCWiki, swissuniversities, eigene Scans) kommt nie ins Repo oder in `public/`. Es liegt nur im privaten Speicher hinter Login (ab Phase 2).
- Row Level Security auf allen Tabellen; `npm run test:db` prüft das.
- Dieses Repo ist öffentlich – am besten auf privat stellen.
