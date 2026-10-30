-- Etapa 4 (parte 3): recordar los días difíciles. Una tabla nueva:
-- hard_days (qué día fue difícil, por qué, y qué tareas decidiste conservar).
-- Sirve para que el cierre de ese día celebre lo conservado.
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.

create table public.hard_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- El día, en tu zona horaria.
  on_date date not null,
  -- El motivo que elegiste.
  reason text not null check (reason in ('tarde', 'imprevisto', 'energia')),
  -- Las tareas que la app te propuso conservar ese día.
  kept_task_ids uuid[] not null default '{}' check (cardinality(kept_task_ids) <= 100),
  created_at timestamptz not null default now(),
  -- Un solo día difícil por día y persona (si vuelves a aceptar, se cambia).
  unique (user_id, on_date)
);

-- REGLAS RLS
alter table public.hard_days enable row level security;

create policy "Ver mis días difíciles" on public.hard_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis días difíciles" on public.hard_days
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis días difíciles" on public.hard_days
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis días difíciles" on public.hard_days
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.hard_days from anon;
grant select, insert, update, delete on public.hard_days to authenticated;
