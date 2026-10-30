-- Etapa 10: Hábitos. Dos tablas nuevas:
-- habits (lo que quieres seguir) y habit_logs (cada vez que apuntas algo).
-- Nada viene creado: cada persona añade los hábitos que quiera, con sus palabras.
-- Estos datos nunca se envían a la IA.
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() de la migración de la etapa 1.

-- HÁBITOS
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  -- Hacia dónde quieres ir: hacerlo más, hacerlo menos o solo verlo.
  direction text not null default 'observar'
    check (direction in ('mas', 'menos', 'observar')),
  -- Qué cuentas: "cigarrillos", "minutos", "vasos"... Vacío = solo veces.
  unit text check (unit is null or char_length(unit) between 1 and 30),
  -- Meta del día, solo si tú la pones. Con "menos" es "como mucho";
  -- con "más", "al menos". Vacío = sin meta.
  daily_target integer check (daily_target is null or daily_target between 0 and 1000),
  -- Qué días toca, en formato RRULE como las rutinas. Vacío = todos los días.
  repeat_rule text check (repeat_rule is null or char_length(repeat_rule) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Para que el registro solo pueda apuntar en hábitos de la misma persona.
  unique (id, user_id)
);

create index habits_user_id_idx on public.habits (user_id, created_at);

create trigger habits_updated_at
  before update on public.habits
  for each row execute function public.poner_updated_at();

-- REGISTRO: una fila cada vez que apuntas. "amount" es cuánto (1 por defecto).
-- Se admite 0 para poder decir "hoy, ninguno".
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  on_date date not null,
  amount integer not null default 1 check (amount between 0 and 1000),
  -- Una nota corta si quieres (por ejemplo, qué estabas haciendo).
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, on_date);
create index habit_logs_habit_id_idx on public.habit_logs (habit_id, on_date);

-- REGLAS RLS
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Ver mis hábitos" on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis hábitos" on public.habits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis hábitos" on public.habits
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis hábitos" on public.habits
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mi registro de hábitos" on public.habit_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Apuntar en mi registro de hábitos" on public.habit_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Borrar de mi registro de hábitos" on public.habit_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.habits, public.habit_logs from anon;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, delete on public.habit_logs to authenticated;
