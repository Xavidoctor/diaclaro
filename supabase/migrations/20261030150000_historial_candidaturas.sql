-- Etapa 6 (parte 2): Historial de cada candidatura. Una tabla nueva:
-- job_application_events (lo que va pasando: cambios de estado, seguimientos
-- hechos y notas que apuntas tú, cada uno con su día).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Hace falta antes la migración 20261030140000_candidaturas_empleo.sql.

-- Hace falta para que una entrada solo pueda ir en una candidatura tuya (ver abajo).
alter table public.job_applications
  add constraint job_applications_id_user_id_key unique (id, user_id);

create table public.job_application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null,
  -- El día en que pasó.
  on_date date not null,
  -- estado (cambió de estado), seguimiento (hiciste el seguimiento) o nota (lo apuntas tú).
  kind text not null check (kind in ('estado', 'seguimiento', 'nota')),
  -- El estado nuevo, solo en las entradas de tipo "estado".
  status text check (
    status is null
    or status in ('por_enviar', 'enviada', 'entrevista', 'oferta', 'rechazada', 'descartada')
  ),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  check (kind <> 'estado' or status is not null),
  check (kind <> 'nota' or note is not null),
  -- La candidatura tiene que ser del mismo usuario. Si la borras, se borra su historial.
  foreign key (application_id, user_id)
    references public.job_applications (id, user_id) on delete cascade
);

create index job_application_events_app_idx
  on public.job_application_events (application_id, user_id, on_date);
create index job_application_events_user_id_idx
  on public.job_application_events (user_id, created_at);

-- REGLAS RLS
alter table public.job_application_events enable row level security;

create policy "Ver mi historial de candidaturas" on public.job_application_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mi historial de candidaturas" on public.job_application_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mi historial de candidaturas" on public.job_application_events
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mi historial de candidaturas" on public.job_application_events
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.job_application_events from anon;
grant select, insert, update, delete on public.job_application_events to authenticated;
