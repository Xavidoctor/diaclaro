-- Motor de sobrecarga, parte 4: cuántas veces al día usas la IA.
-- La clave de Groq es una sola para toda la app (plan gratuito con límite),
-- así que cada persona tiene un tope diario para que nadie la agote.

create table public.ai_usage (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date date not null,
  calls integer not null default 0 check (calls >= 0),
  primary key (user_id, on_date)
);

-- REGLAS RLS: cada persona solo ve y cambia su propio contador.
alter table public.ai_usage enable row level security;

create policy "Ver mi uso de IA" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mi uso de IA" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mi uso de IA" on public.ai_usage
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon;
grant select, insert, update on public.ai_usage to authenticated;
