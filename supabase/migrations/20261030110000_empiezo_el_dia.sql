-- Etapa 4 (parte 2): Empiezo el día. Una tabla nueva:
-- day_starts (a qué hora empezaste cada día y, si quieres, a qué hora te acostarás ese día).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.

create table public.day_starts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- El día, en tu zona horaria.
  on_date date not null,
  -- La hora a la que pulsaste "Empiezo el día", en tu zona horaria.
  start_time time not null,
  -- Hora de acostarte solo para ese día. Vacía = la de Ajustes.
  sleep_time time,
  created_at timestamptz not null default now(),
  -- Un solo inicio por día y persona.
  unique (user_id, on_date)
);

-- REGLAS RLS
alter table public.day_starts enable row level security;

create policy "Ver mis inicios de día" on public.day_starts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis inicios de día" on public.day_starts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis inicios de día" on public.day_starts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis inicios de día" on public.day_starts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.day_starts from anon;
grant select, insert, update, delete on public.day_starts to authenticated;
