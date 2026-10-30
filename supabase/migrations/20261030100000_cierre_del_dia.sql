-- Etapa 5 (parte 2): Cierre del día. Una tabla nueva:
-- day_reviews (lo que escribes al acabar el día: qué has conseguido y qué cambias mañana).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() de la migración de la etapa 1.

create table public.day_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- El día que cierras, en tu zona horaria.
  on_date date not null,
  -- Las dos preguntas. Puedes dejar una vacía, pero no las dos.
  achieved text check (achieved is null or char_length(achieved) <= 3000),
  change_tomorrow text check (change_tomorrow is null or char_length(change_tomorrow) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (achieved is not null or change_tomorrow is not null),
  -- Un solo cierre por día y persona (si vuelves a guardar, se cambia).
  unique (user_id, on_date)
);

create trigger day_reviews_updated_at
  before update on public.day_reviews
  for each row execute function public.poner_updated_at();

-- REGLAS RLS
alter table public.day_reviews enable row level security;

create policy "Ver mis cierres" on public.day_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis cierres" on public.day_reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis cierres" on public.day_reviews
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis cierres" on public.day_reviews
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.day_reviews from anon;
grant select, insert, update, delete on public.day_reviews to authenticated;
