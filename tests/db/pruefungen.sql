\set ON_ERROR_STOP on
-- 1) Vor dem ersten Konto ist die Registrierung offen.
set role anon;
do $$ begin assert public.registrierung_offen(), 'Registrierung sollte offen sein'; end $$;
reset role;

-- 2) Erstes Konto: erlaubt, Profil wird angelegt.
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ich@example.com');
do $$ begin assert (select count(*) from public.profil) = 1, 'Profil fehlt'; end $$;

-- 3) Danach ist die Registrierung zu, ein zweites Konto scheitert.
set role anon;
do $$ begin assert not public.registrierung_offen(), 'Registrierung sollte gesperrt sein'; end $$;
reset role;
do $$
begin
  insert into auth.users (email) values ('fremd@example.com');
  raise exception 'Zweites Konto wurde nicht blockiert';
exception when sqlstate 'P0001' then
  if sqlerrm not like 'Registrierung gesperrt%' then raise; end if;
end $$;

-- 4) Eigene Daten lesen und schreiben.
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
insert into public.methoden_fortschritt (methode_id, verstanden_am) values ('kreuzblick', now());
update public.profil set anzeigename = 'Ich';
do $$ begin assert (select count(*) from public.methoden_fortschritt) = 1, 'eigener Fortschritt unsichtbar'; end $$;
do $$ begin assert (select anzeigename from public.profil) = 'Ich', 'Profil nicht änderbar'; end $$;

-- 5) Fremde Identität sieht nichts und kann nichts für andere schreiben.
do $$ begin perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false); end $$;
do $$ begin assert (select count(*) from public.methoden_fortschritt) = 0, 'fremder Fortschritt sichtbar'; end $$;
do $$ begin assert (select count(*) from public.profil) = 0, 'fremdes Profil sichtbar'; end $$;
do $$
begin
  insert into public.methoden_fortschritt (user_id, methode_id) values ('11111111-1111-1111-1111-111111111111', 'quanti-drei-runden');
  raise exception 'Fremdes Schreiben wurde nicht blockiert';
exception when insufficient_privilege then null;
end $$;
reset role;

-- 6) anon sieht keine Tabellen.
set role anon;
do $$
begin
  perform count(*) from public.profil;
  raise exception 'anon darf profil lesen';
exception when insufficient_privilege then null;
end $$;
reset role;

-- 7) Jede Tabelle in public hat RLS aktiv.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'Tabelle ohne RLS: %', t;
  end loop;
end $$;

\echo 'Alle Datenbank-Prüfungen bestanden.'
