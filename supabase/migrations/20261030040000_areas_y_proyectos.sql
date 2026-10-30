-- Etapa 3 (parte 1): Áreas y proyectos. Dos tablas nuevas:
-- areas (las grandes partes de tu vida: Estudios, Empleo...) y
-- projects (lo que hay dentro de cada área, por ejemplo cada asignatura).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() de la migración de la etapa 1.

-- ÁREAS
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- Horas a la semana que quieres darle, en minutos. Vacío = sin presupuesto.
  weekly_minutes integer check (weekly_minutes is null or weekly_minutes between 0 and 10080),
  -- Tiempo personal (un hobby, como el dropshipping): sin objetivo obligatorio,
  -- y nunca le quita tiempo a lo demás.
  personal_time boolean not null default false,
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Hace falta para que un proyecto solo pueda ir en un área tuya (ver abajo).
  unique (id, user_id)
);

create index areas_user_id_idx on public.areas (user_id, position);

create trigger areas_updated_at
  before update on public.areas
  for each row execute function public.poner_updated_at();

-- PROYECTOS: cada uno pertenece a un área. Una asignatura es un proyecto de tipo "asignatura".
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'proyecto' check (kind in ('proyecto', 'asignatura')),
  notes text check (notes is null or char_length(notes) <= 5000),
  url text check (url is null or char_length(url) <= 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- El área tiene que ser del mismo usuario. Si borras el área, se borran sus proyectos.
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete cascade
);

create index projects_area_id_idx on public.projects (area_id, user_id);
create index projects_user_id_idx on public.projects (user_id, created_at);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.poner_updated_at();

-- REGLAS RLS
alter table public.areas enable row level security;
alter table public.projects enable row level security;

create policy "Ver mis áreas" on public.areas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis áreas" on public.areas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis áreas" on public.areas
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis áreas" on public.areas
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mis proyectos" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis proyectos" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis proyectos" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis proyectos" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar las tablas (siempre con las reglas de arriba).
revoke all on public.areas, public.projects from anon;
grant select, insert, update, delete on public.areas, public.projects to authenticated;
