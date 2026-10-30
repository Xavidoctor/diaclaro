-- Etapa 6 (parte 1): Candidaturas de empleo. Una tabla nueva:
-- job_applications (cada oferta a la que te presentas o quieres presentarte).
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.
-- Usa la función public.poner_updated_at() de la migración de la etapa 1.

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null check (char_length(company) between 1 and 120),
  -- El puesto (por ejemplo, "Administrativo contable").
  role text not null check (char_length(role) between 1 and 160),
  -- Enlace a la oferta (opcional).
  url text check (url is null or char_length(url) <= 2000),
  -- En qué punto está:
  -- por_enviar (aún no la has mandado), enviada, entrevista, oferta,
  -- rechazada (te han dicho que no) o descartada (la dejas tú).
  status text not null default 'por_enviar'
    check (status in ('por_enviar', 'enviada', 'entrevista', 'oferta', 'rechazada', 'descartada')),
  -- El día que la enviaste. Vacío si aún no la has enviado o no lo recuerdas.
  applied_on date,
  -- El día que quieres volver a mirarla (llamar, escribir...). Sale en Hoy ese día.
  next_follow_up date,
  -- Qué harás ese día (por ejemplo, "Escribir a la persona de RRHH").
  next_step text check (next_step is null or char_length(next_step) <= 300),
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_applications_user_id_idx on public.job_applications (user_id, created_at);
create index job_applications_follow_up_idx on public.job_applications (user_id, next_follow_up)
  where next_follow_up is not null;

create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.poner_updated_at();

-- REGLAS RLS
alter table public.job_applications enable row level security;

create policy "Ver mis candidaturas" on public.job_applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis candidaturas" on public.job_applications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis candidaturas" on public.job_applications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis candidaturas" on public.job_applications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo las personas con sesión iniciada pueden usar la tabla (siempre con las reglas de arriba).
revoke all on public.job_applications from anon;
grant select, insert, update, delete on public.job_applications to authenticated;
