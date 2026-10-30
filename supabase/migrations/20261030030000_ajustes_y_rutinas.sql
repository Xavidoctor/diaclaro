-- Etapa 2 (parte 2): Ajustes y Rutinas. Tres tablas nuevas:
-- settings (tus preferencias), routines (lo que haces a menudo) y
-- routine_logs (cada vez que marcas una rutina como hecha).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() de la migración de la etapa 1.

-- AJUSTES: una sola fila por persona. Todo es opcional menos la zona horaria.
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/Madrid' check (char_length(timezone) between 1 and 60),
  wake_time time,
  sleep_time time,
  lunch_time time,
  dinner_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.poner_updated_at();

-- RUTINAS: cosas que haces a menudo con horario flexible (por ejemplo, pasear al perro).
-- Días, veces, minutos y franja son opcionales: la app no se los inventa.
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  -- Qué días toca, en formato RRULE como la agenda. Vacío = todos los días.
  repeat_rule text check (repeat_rule is null or char_length(repeat_rule) <= 500),
  times_per_day integer not null default 1 check (times_per_day between 1 and 20),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  -- Franja flexible: "entre las 10:00 y las 13:00", o solo "por la mañana", o nada.
  window_start time,
  window_end time,
  part_of_day text check (part_of_day in ('mañana', 'tarde', 'noche')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end is null or (window_start is not null and window_end > window_start))
);

create index routines_user_id_idx on public.routines (user_id, created_at);

create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.poner_updated_at();

-- REGISTRO: una fila cada vez que marcas una rutina como hecha.
create table public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  on_date date not null,
  -- Minutos reales, solo si los apuntas.
  minutes integer check (minutes is null or minutes between 1 and 1440),
  created_at timestamptz not null default now()
);

create index routine_logs_user_date_idx on public.routine_logs (user_id, on_date);
create index routine_logs_routine_id_idx on public.routine_logs (routine_id);

-- REGLAS RLS
alter table public.settings enable row level security;
alter table public.routines enable row level security;
alter table public.routine_logs enable row level security;

create policy "Ver mis ajustes" on public.settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis ajustes" on public.settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis ajustes" on public.settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Ver mis rutinas" on public.routines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis rutinas" on public.routines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis rutinas" on public.routines
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis rutinas" on public.routines
  for delete to authenticated using ((select auth.uid()) = user_id);

-- En el registro, además, la rutina tiene que ser tuya.
create policy "Ver mi registro" on public.routine_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Apuntar en mi registro" on public.routine_logs
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );
create policy "Borrar de mi registro" on public.routine_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.settings, public.routines, public.routine_logs from anon;
grant select, insert, update on public.settings to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, delete on public.routine_logs to authenticated;
