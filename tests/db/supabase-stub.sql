-- Minimaler Nachbau der Supabase-Umgebung für lokale Migrations-Tests.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase vergibt Tabellenrechte standardmässig an anon und authenticated; RLS muss schützen.
alter default privileges in schema public grant all on tables to anon, authenticated;
