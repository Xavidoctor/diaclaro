-- "Me voy a dormir": la hora real a la que te acuestas cada noche.
-- Sirve para calcular tus horas de sueño de verdad en Áreas → Progreso
-- (hasta ahora se usaba la hora prevista de Ajustes).
--
-- Tabla nueva: bedtimes.
-- * on_date: el día que terminas. Si te acuestas a la 01:00 del sábado,
--   la noche sigue siendo la del viernes.
-- * bed_time: la hora, en tu zona horaria. Las de antes de las 12:00 se
--   entienden como pasada la medianoche.
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.

create table public.bedtimes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date date not null,
  bed_time time not null,
  created_at timestamptz not null default now(),
  -- Una sola hora de acostarte por noche y persona (si la cambias, se sobrescribe).
  unique (user_id, on_date)
);

-- REGLAS RLS
alter table public.bedtimes enable row level security;

create policy "Ver mis horas de dormir" on public.bedtimes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis horas de dormir" on public.bedtimes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis horas de dormir" on public.bedtimes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis horas de dormir" on public.bedtimes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.bedtimes from anon;
grant select, insert, update, delete on public.bedtimes to authenticated;
