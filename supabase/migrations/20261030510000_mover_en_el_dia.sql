-- Ordenar el día en la Agenda: lo fijo se queda quieto y lo flexible
-- (como pasear a la perra) se puede mover arriba o abajo para cambiarle la hora.
--
-- Tus compromisos de la Agenda y lo de Google siempre son fijos.
-- Las tareas con hora siempre se pueden mover.
--
-- 1. «Hora fija» en las rutinas. Vacío = la app decide:
--    - una rutina dentro de un proyecto (una clase, el trabajo) es fija;
--    - una rutina suelta (pasear a la perra) se puede mover.
--    true = fija (con candado), false = se puede mover.
--    Solo añade una columna a una tabla que ya tiene user_id y reglas RLS.
alter table public.routines add column fixed_time boolean;

-- 2. Mover una rutina SOLO un día, sin cambiar su horario de siempre.
--    Una fila = «este día, esta vez de la rutina, empieza a esta hora».
create table public.routine_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  on_date date not null,
  -- Qué vez del día (1, 2...). Las rutinas de una vez al día usan la 1.
  slot smallint not null default 1 check (slot between 1 and 20),
  start_time time not null,
  created_at timestamptz not null default now(),
  unique (routine_id, on_date, slot)
);

create index routine_moves_user_date_idx on public.routine_moves (user_id, on_date);

-- REGLAS RLS: cada persona solo ve y cambia lo suyo, y la rutina tiene que ser suya.
alter table public.routine_moves enable row level security;

create policy "Ver mis cambios de hora" on public.routine_moves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis cambios de hora" on public.routine_moves
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );
create policy "Cambiar mis cambios de hora" on public.routine_moves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );
create policy "Borrar mis cambios de hora" on public.routine_moves
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.routine_moves from anon;
grant select, insert, update, delete on public.routine_moves to authenticated;
