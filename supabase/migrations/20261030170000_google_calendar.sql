-- Etapa 9: leer tu Google Calendar (solo leer, nunca cambiarlo).
-- Cada persona conecta su propia cuenta de Google. Aquí solo se guarda el
-- "permiso" que da Google (refresh token), cifrado con una clave que solo
-- tiene el servidor. Los eventos NO se copian: se leen de Google cada vez.
-- Esta tabla no va en la copia de seguridad: el permiso cifrado no sirve fuera de la app.

create table public.google_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  google_email text check (char_length(google_email) <= 320),
  refresh_token_cifrado text not null check (char_length(refresh_token_cifrado) <= 4000),
  created_at timestamptz not null default now()
);

-- REGLAS RLS: cada persona solo ve, guarda y borra su propia conexión.
alter table public.google_connections enable row level security;

create policy "Ver mi conexión con Google" on public.google_connections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mi conexión con Google" on public.google_connections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mi conexión con Google" on public.google_connections
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mi conexión con Google" on public.google_connections
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.google_connections from anon;
grant select, insert, update, delete on public.google_connections to authenticated;
