-- Etapa 2 (parte 1): la Agenda. Dos tablas: eventos y sus excepciones.
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() que creó la migración de la etapa 1.

-- EVENTOS: compromisos con día (tutorías, clases, citas). Pueden repetirse.
-- Hora y franja son opcionales: si no sabes la hora exacta, se queda vacía.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  -- Primer día (o el único, si no se repite).
  start_date date not null,
  start_time time,
  end_time time,
  -- Franja aproximada para cuando no hay hora exacta.
  part_of_day text check (part_of_day in ('mañana', 'tarde', 'noche')),
  -- Repetición en formato estándar RRULE, por ejemplo 'FREQ=WEEKLY;BYDAY=MO,TU,WE'.
  -- Vacío = no se repite.
  repeat_rule text check (repeat_rule is null or char_length(repeat_rule) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- La hora de fin solo con hora de inicio, y siempre después.
  check (end_time is null or (start_time is not null and end_time > start_time))
);

create index events_user_id_idx on public.events (user_id, start_date);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.poner_updated_at();

-- EXCEPCIONES: un día concreto de un evento que se repite, cancelado o cambiado
-- (por ejemplo, "esta semana la tutoría del miércoles pasa al jueves").
create table public.event_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  -- El día que tocaba según la regla.
  on_date date not null,
  cancelled boolean not null default false,
  -- Si no está cancelado: el nuevo día y, si las hay, las nuevas horas.
  new_date date,
  new_start_time time,
  new_end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, on_date),
  check (cancelled or new_date is not null),
  check (new_end_time is null or (new_start_time is not null and new_end_time > new_start_time))
);

create index event_exceptions_user_id_idx on public.event_exceptions (user_id, event_id);

create trigger event_exceptions_updated_at
  before update on public.event_exceptions
  for each row execute function public.poner_updated_at();

-- REGLAS RLS
alter table public.events enable row level security;
alter table public.event_exceptions enable row level security;

create policy "Ver mis eventos" on public.events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis eventos" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis eventos" on public.events
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis eventos" on public.events
  for delete to authenticated using ((select auth.uid()) = user_id);

-- En las excepciones, además, el evento tiene que ser tuyo.
create policy "Ver mis excepciones" on public.event_exceptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis excepciones" on public.event_exceptions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = (select auth.uid())
    )
  );
create policy "Cambiar mis excepciones" on public.event_exceptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = (select auth.uid())
    )
  );
create policy "Borrar mis excepciones" on public.event_exceptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.events, public.event_exceptions from anon;
grant select, insert, update, delete on public.events, public.event_exceptions to authenticated;
