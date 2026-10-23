# Munggi

Persönliche Lern-App für den Schweizer Eignungstest für das Medizinstudium (EMS). Nur für ein Konto, hinter Login.
Grundlage für alles: [`docs/REFERENZ.md`](docs/REFERENZ.md) – dort steht auch der App-Überblick (Abschnitt 9).

**Stand: fertig** – Onboarding mit Einstufungstest, tagesgenauer Plan bis zum Testtag (Matura-Modus, .ics), Lernpfad mit 8 Methoden-Stufen,
Generatoren für alle 9 Aufgabengruppen, Med-Nat- und Textbank, Fehlerheft mit Wiedervorlage, Simulationen (digital und auf Papier),
Material-Import (NCWiki, swissuniversities, eigene PDFs) mit Antwortbogen und Zeichenebene, Statistik mit Bereitschafts-Ampel,
XP, Serie, Abzeichen, Maskottchen Munggi, Offline-Betrieb als PWA.

## Mit Lovable verbinden

1. In Lovable ein Projekt anlegen und **Lovable Cloud** aktivieren.
2. Das Projekt mit GitHub verbinden. Kann Lovable dieses Repo nicht direkt übernehmen, legt es ein eigenes (privates) Repo an: Den Namen gibst du Claude, Claude pusht den Code dorthin.
3. Datenbank: Im Lovable-Chat beide Migrationen der Reihe nach unverändert ausführen lassen:
   - `supabase/migrations/20261022120000_phase1_konto_und_fortschritt.sql`
   - `supabase/migrations/20261022130000_phase2_dokumente_und_material.sql` (Dokument-Speicher, privater Bucket `material`)
4. Edge Function bereitstellen: «Stelle die Edge Function aus `supabase/functions/material-abrufen/index.ts` unverändert bereit.» Sie braucht keine eigenen Secrets (`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` setzt Lovable Cloud). `verify_jwt` eingeschaltet lassen.
5. In den Auth-Einstellungen von Lovable Cloud Site-URL und Redirect-URL auf die veröffentlichte Adresse setzen (für «Passwort vergessen»).
6. App öffnen → «Konto einrichten» → dein Konto anlegen.
7. Danach in den Auth-Einstellungen die Registrierung ausschalten. Selbst wenn sie offen bliebe, blockiert der Datenbank-Trigger `nur_ein_konto` jedes weitere Konto.
8. Veröffentlichen. Auf dem Handy über «Zum Home-Bildschirm» installieren – die App läuft dann auch offline.

Lovable Cloud setzt `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` automatisch. Lokal: `.env` nach `.env.example` anlegen.

## Entwickeln und testen

```sh
npm install
npm run dev          # http://localhost:8080
npm run check        # Typecheck, Lint, Unit-Tests, Build
npm run test:e2e     # Playwright-Rundgang (Handy + Desktop), Supabase nachgestellt
npm run test:db      # Migrationen gegen temporäres PostgreSQL: Ein-Konto-Sperre und RLS
```

Screenshots des Rundgangs: `SHOTS=<ordner> npx playwright test rundgang --project handy`.

## Datenschutz

- Fremdmaterial (NCWiki, swissuniversities, eigene Scans) kommt nie ins Repo oder in `public/`. Es liegt nur im privaten Bucket `material` hinter Login (Pfad `<user_id>/…`, RLS) und im Offline-Speicher deines Geräts.
- Row Level Security auf allen Tabellen; `npm run test:db` prüft das.
- Der Service Worker speichert nur den App-Code, nie Antworten von Lovable Cloud.
- Keine Gedächtnisprotokolle echter EMS-Tests, keine Zulassungsprognosen.
- Dieses Repo ist öffentlich – am besten auf privat stellen.
