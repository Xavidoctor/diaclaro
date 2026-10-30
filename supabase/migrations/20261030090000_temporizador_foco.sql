-- Etapa 5 (parte 1): Temporizador de foco. Una tabla nueva:
-- focus_sessions (cada rato de trabajo concentrado que mides con el temporizador).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.

-- Hace falta para que una sesión solo pueda apuntar a una tarea tuya (ver abajo).
-- No cambia nada de las tareas que ya tienes.
alter table public.tasks
  add constraint tasks_id_user_id_key unique (id, user_id);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- La tarea en la que trabajaste (opcional).
  task_id uuid,
  -- El día en tu zona horaria, para sumar el foco de cada día sin líos.
  on_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- Los minutos que te pusiste como objetivo y los que hiciste de verdad.
  planned_minutes integer check (planned_minutes is null or planned_minutes between 1 and 600),
  minutes integer not null check (minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at),
  -- La tarea tiene que ser del mismo usuario. Si la borras para siempre,
  -- la sesión se queda, pero sin tarea (solo se vacía task_id).
  foreign key (task_id, user_id) references public.tasks (id, user_id)
    on delete set null (task_id)
);

create index focus_sessions_user_id_idx on public.focus_sessions (user_id, on_date);
create index focus_sessions_task_id_idx on public.focus_sessions (task_id, user_id);

-- REGLAS RLS
alter table public.focus_sessions enable row level security;

create policy "Ver mis sesiones de foco" on public.focus_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis sesiones de foco" on public.focus_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis sesiones de foco" on public.focus_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis sesiones de foco" on public.focus_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.focus_sessions from anon;
grant select, insert, update, delete on public.focus_sessions to authenticated;
