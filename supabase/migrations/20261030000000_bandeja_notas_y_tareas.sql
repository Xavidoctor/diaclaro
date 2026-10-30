-- Etapa 1: la Bandeja. Dos tablas, notas y tareas.
-- Cada fila lleva user_id y unas reglas (RLS) que hacen que cada persona
-- solo pueda ver y cambiar sus propias filas.

-- Rellena updated_at solo cada vez que se cambia una fila.
create or replace function public.poner_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTAS: lo que apuntas sin pensar.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  url text check (url is null or char_length(url) <= 2000),
  pinned boolean not null default false,
  archived_at timestamptz,
  deleted_at timestamptz,
  -- Índice de búsqueda en español: "proveedor" encuentra "proveedores".
  search tsvector generated always as (to_tsvector('spanish', body)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id, created_at desc);
create index notes_search_idx on public.notes using gin (search);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.poner_updated_at();

-- TAREAS: lo que tienes que hacer. Fecha y minutos solo si tú los pones.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  details text check (details is null or char_length(details) <= 10000),
  kind text not null default 'tarea' check (kind in ('tarea', 'entrega')),
  due_date date,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  -- La nota de la que salió la tarea (si salió de una).
  note_id uuid references public.notes (id) on delete set null,
  done_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks (user_id, created_at desc);
create index tasks_note_id_idx on public.tasks (note_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.poner_updated_at();

-- REGLAS RLS: sin ellas, la clave pública dejaría leerlo todo.
alter table public.notes enable row level security;
alter table public.tasks enable row level security;

create policy "Ver mis notas" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis notas" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis notas" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis notas" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mis tareas" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis tareas" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis tareas" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis tareas" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar las tablas (siempre con las reglas de arriba).
revoke all on public.notes, public.tasks from anon;
grant select, insert, update, delete on public.notes, public.tasks to authenticated;
