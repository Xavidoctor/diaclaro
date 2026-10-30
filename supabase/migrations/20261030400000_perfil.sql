-- Perfil: tu nombre, tu edad, un dato sobre ti y tu frase.
-- Una tabla nueva: profiles (una fila por persona). Todo es opcional.
-- Como siempre, lleva user_id y reglas RLS: cada persona solo ve lo suyo.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Cómo quieres que te llame la app («Buenas tardes, Xavi»).
  display_name text check (char_length(display_name) <= 40),
  -- Tu edad. Vacía si no la quieres poner.
  age smallint check (age between 1 and 120),
  -- Un dato discreto sobre ti (por ejemplo, a qué te dedicas).
  about text check (char_length(about) <= 80),
  -- Tu frase motivadora.
  motto text check (char_length(motto) <= 160),
  updated_at timestamptz not null default now()
);

-- REGLAS RLS
alter table public.profiles enable row level security;

create policy "Ver mi perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mi perfil" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mi perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mi perfil" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;
