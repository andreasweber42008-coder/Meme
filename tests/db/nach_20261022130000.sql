\set ON_ERROR_STOP on
-- Fortschritt aus Migration 1 wurde übernommen, alte Tabelle ist weg.
do $$ begin
  assert (select count(*) from public.dokumente where sammlung = 'fortschritt' and id = 'kreuzblick'
          and daten ? 'verstandenAm') = 1, 'Fortschritt nicht übernommen';
  assert to_regclass('public.methoden_fortschritt') is null, 'alte Tabelle existiert noch';
end $$;

-- Abgleich: ältere Stände überschreiben nie neuere.
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
select public.dokumente_speichern('[{"sammlung":"termine","id":"a","daten":{"t":1},"geaendert_am":"2027-01-01T10:00:00Z"}]'::jsonb) \gset
select public.dokumente_speichern('[{"sammlung":"termine","id":"a","daten":{"t":0},"geaendert_am":"2027-01-01T09:00:00Z"}]'::jsonb) \gset
do $$ begin assert (select daten->>'t' from public.dokumente where id = 'a') = '1', 'älterer Stand hat überschrieben'; end $$;
select public.dokumente_speichern('[{"sammlung":"termine","id":"a","daten":{"t":2},"geaendert_am":"2027-01-01T11:00:00Z","geloescht":true}]'::jsonb) \gset
do $$ begin assert (select daten->>'t' from public.dokumente where id = 'a') = '2', 'neuerer Stand fehlt'; end $$;
do $$ begin assert (select geloescht from public.dokumente where id = 'a'), 'Löschmarke fehlt'; end $$;

-- Eigener Speicherordner: erlaubt; fremder Ordner: verboten.
insert into storage.objects (bucket_id, name) values ('material', '11111111-1111-1111-1111-111111111111/ncwiki/a.pdf');
do $$
begin
  insert into storage.objects (bucket_id, name) values ('material', '22222222-2222-2222-2222-222222222222/x.pdf');
  raise exception 'Fremder Ordner wurde nicht blockiert';
exception when insufficient_privilege then null;
end $$;

-- Fremde Identität sieht nichts und überschreibt nichts.
do $$ begin perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false); end $$;
do $$ begin assert (select count(*) from public.dokumente) = 0, 'fremde Dokumente sichtbar'; end $$;
do $$ begin assert (select count(*) from storage.objects) = 0, 'fremde Dateien sichtbar'; end $$;
do $$
begin
  -- Ein zweites Konto gibt es nicht (Ein-Konto-Sperre); der Aufruf darf trotzdem nichts Fremdes ändern.
  perform public.dokumente_speichern('[{"sammlung":"termine","id":"a","daten":{"t":99},"geaendert_am":"2030-01-01T00:00:00Z"}]'::jsonb);
exception when foreign_key_violation then null;
end $$;
reset role;
do $$ begin
  assert (select daten->>'t' from public.dokumente where id = 'a' and user_id = '11111111-1111-1111-1111-111111111111') = '2',
    'fremder Aufruf hat eigene Daten verändert';
  assert not (select public from storage.buckets where id = 'material'), 'Bucket ist öffentlich';
end $$;

-- anon darf nicht speichern.
set role anon;
do $$
begin
  perform public.dokumente_speichern('[]'::jsonb);
  raise exception 'anon darf speichern';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Jede Tabelle in public hat RLS aktiv.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'Tabelle ohne RLS: %', t;
  end loop;
end $$;

\echo 'Alle Datenbank-Prüfungen bestanden.'
