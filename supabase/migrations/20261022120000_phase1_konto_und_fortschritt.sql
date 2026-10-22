-- Phase 1: nur ein Konto, Profil, Methoden-Fortschritt.
-- Regel: Row Level Security auf ALLEN Tabellen (siehe docs/REFERENZ.md).

-- 1) Nur ein einziges Konto.
--    Sobald ein Konto existiert, schlägt jede weitere Registrierung fehl –
--    auch wenn die Registrierung in den Auth-Einstellungen noch offen ist.
--    Die E-Mail-Adresse steht bewusst nirgends im Code.
create or replace function public.nur_ein_konto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sperre gegen zwei gleichzeitige Registrierungen.
  perform pg_advisory_xact_lock(hashtext('munggi_nur_ein_konto'));
  if exists (select 1 from auth.users) then
    raise exception 'Registrierung gesperrt: Diese App hat bereits ein Konto.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.nur_ein_konto() from public, anon, authenticated;

drop trigger if exists nur_ein_konto on auth.users;
create trigger nur_ein_konto
  before insert on auth.users
  for each row execute function public.nur_ein_konto();

-- 2) Ist die Registrierung noch offen? Verrät nur ein Bit (für die Login-Seite).
create or replace function public.registrierung_offen()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from auth.users);
$$;

revoke all on function public.registrierung_offen() from public;
grant execute on function public.registrierung_offen() to anon, authenticated;

-- 3) Hilfsfunktion: geaendert_am aktuell halten.
create or replace function public.setze_geaendert_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;

-- 4) Profil (eine Zeile pro Konto).
create table public.profil (
  id uuid primary key references auth.users (id) on delete cascade,
  anzeigename text,
  einstellungen jsonb not null default '{}'::jsonb,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);

alter table public.profil enable row level security;
revoke all on public.profil from anon;

create policy profil_lesen on public.profil
  for select to authenticated
  using (id = (select auth.uid()));

create policy profil_anlegen on public.profil
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profil_aendern on public.profil
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create trigger profil_geaendert_am
  before update on public.profil
  for each row execute function public.setze_geaendert_am();

create or replace function public.neues_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profil (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.neues_profil() from public, anon, authenticated;

drop trigger if exists neues_profil on auth.users;
create trigger neues_profil
  after insert on auth.users
  for each row execute function public.neues_profil();

-- 5) Fortschritt pro Methode (Stufe 1–8, Wiederholung).
create table public.methoden_fortschritt (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  methode_id text not null check (methode_id ~ '^[a-z0-9-]+$'),
  stufe smallint not null default 1 check (stufe between 1 and 8),
  verstanden_am timestamptz,
  beherrscht_am timestamptz,
  naechste_wiederholung date,
  stats jsonb not null default '{}'::jsonb,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  primary key (user_id, methode_id)
);

alter table public.methoden_fortschritt enable row level security;
revoke all on public.methoden_fortschritt from anon;

create policy fortschritt_lesen on public.methoden_fortschritt
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy fortschritt_anlegen on public.methoden_fortschritt
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy fortschritt_aendern on public.methoden_fortschritt
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy fortschritt_loeschen on public.methoden_fortschritt
  for delete to authenticated
  using (user_id = (select auth.uid()));

create trigger fortschritt_geaendert_am
  before update on public.methoden_fortschritt
  for each row execute function public.setze_geaendert_am();
