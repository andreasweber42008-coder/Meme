-- Phase 2–9: Dokumenten-Speicher (offline-first) und privater Material-Speicher.
-- Regel: Row Level Security auf ALLEN Tabellen (siehe docs/REFERENZ.md).

-- 1) Dokumente: alle Lern-Daten (Einstellungen, Versuche, Fehlerheft, Material-Sets, Plan …).
--    geaendert_am kommt vom Gerät (letzte Änderung gewinnt), server_am setzt der Server (für den Abgleich).
create table public.dokumente (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sammlung text not null check (sammlung ~ '^[a-z0-9_-]{1,40}$'),
  id text not null check (length(id) between 1 and 200),
  daten jsonb not null default '{}'::jsonb check (pg_column_size(daten) < 4000000),
  geloescht boolean not null default false,
  geaendert_am timestamptz not null,
  server_am timestamptz not null default clock_timestamp(),
  primary key (user_id, sammlung, id)
);

create index dokumente_abgleich on public.dokumente (user_id, server_am);

alter table public.dokumente enable row level security;
revoke all on public.dokumente from anon;

create policy dokumente_lesen on public.dokumente
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy dokumente_anlegen on public.dokumente
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy dokumente_aendern on public.dokumente
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy dokumente_loeschen on public.dokumente
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.setze_server_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_am := clock_timestamp();
  return new;
end;
$$;

create trigger dokumente_server_am
  before insert or update on public.dokumente
  for each row execute function public.setze_server_am();

-- Mehrere Dokumente in einem Aufruf speichern; ältere Stände überschreiben nie neuere.
-- security invoker: Row Level Security gilt auch hier.
create or replace function public.dokumente_speichern(eintraege jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  e jsonb;
  n integer := 0;
begin
  if jsonb_typeof(eintraege) <> 'array' then
    raise exception 'eintraege muss ein Array sein';
  end if;
  for e in select value from jsonb_array_elements(eintraege) loop
    insert into public.dokumente (user_id, sammlung, id, daten, geloescht, geaendert_am)
    values (
      (select auth.uid()),
      e ->> 'sammlung',
      e ->> 'id',
      coalesce(e -> 'daten', '{}'::jsonb),
      coalesce((e ->> 'geloescht')::boolean, false),
      (e ->> 'geaendert_am')::timestamptz
    )
    on conflict (user_id, sammlung, id) do update
      set daten = excluded.daten,
          geloescht = excluded.geloescht,
          geaendert_am = excluded.geaendert_am
      where public.dokumente.geaendert_am < excluded.geaendert_am;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.dokumente_speichern(jsonb) from public, anon;
grant execute on function public.dokumente_speichern(jsonb) to authenticated;

-- 2) Bisherigen Methoden-Fortschritt übernehmen und die alte Tabelle entfernen.
insert into public.dokumente (user_id, sammlung, id, daten, geaendert_am)
select
  f.user_id,
  'fortschritt',
  f.methode_id,
  jsonb_strip_nulls(jsonb_build_object(
    'stufe', f.stufe,
    'verstandenAm', f.verstanden_am,
    'beherrschtAm', f.beherrscht_am
  )),
  f.geaendert_am
from public.methoden_fortschritt f
on conflict do nothing;

drop table public.methoden_fortschritt;

-- 3) Privater Speicher für Fremdmaterial (NCWiki, swissuniversities, eigene Scans).
--    Pfad immer «<user_id>/…»; nur der eigene Ordner ist lesbar und schreibbar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('material', 'material', false, 52428800, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false;

create policy material_lesen on storage.objects
  for select to authenticated
  using (bucket_id = 'material' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy material_hochladen on storage.objects
  for insert to authenticated
  with check (bucket_id = 'material' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy material_ersetzen on storage.objects
  for update to authenticated
  using (bucket_id = 'material' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'material' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy material_loeschen on storage.objects
  for delete to authenticated
  using (bucket_id = 'material' and (storage.foldername(name))[1] = (select auth.uid())::text);
