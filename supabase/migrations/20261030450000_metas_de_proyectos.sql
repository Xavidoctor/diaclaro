-- Metas de los proyectos: lo que quieres conseguir y para cuándo.
-- En una asignatura, una meta puede ser una entrega o un examen.
--
-- Cada meta tiene:
--   - un título (lo escribes tú),
--   - un tipo: meta, entrega o examen,
--   - una fecha (opcional: si aún no la sabes, se deja vacía),
--   - un recordatorio (opcional): el día y la hora a la que quieres el aviso.
--     Usa los mismos avisos con la app cerrada que los hábitos
--     (hace falta haber ejecutado 20261030300000_avisos_push.sql).
--
-- Como siempre, cada fila lleva user_id y reglas RLS: cada persona solo ve lo suyo.

create table public.project_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null default 'meta' check (kind in ('meta', 'entrega', 'examen')),
  due_date date,
  -- El momento del aviso, en tu hora (la zona horaria de Ajustes). Vacío = sin aviso.
  remind_at timestamp,
  -- Cuándo se envió el aviso (para no mandarlo dos veces). Se vacía si cambias la hora.
  reminder_sent_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- El proyecto tiene que ser tuyo. Si borras el proyecto, se borran sus metas.
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index project_goals_project_id_idx on public.project_goals (project_id, user_id);
create index project_goals_user_id_idx on public.project_goals (user_id, due_date);
-- Para que la tarea de los avisos encuentre rápido los pendientes.
create index project_goals_avisos_idx on public.project_goals (remind_at)
  where remind_at is not null and reminder_sent_at is null and done_at is null;

create trigger project_goals_updated_at
  before update on public.project_goals
  for each row execute function public.poner_updated_at();

-- REGLAS RLS
alter table public.project_goals enable row level security;

create policy "Ver mis metas" on public.project_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis metas" on public.project_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Cambiar mis metas" on public.project_goals
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis metas" on public.project_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.project_goals from anon;
grant select, insert, update, delete on public.project_goals to authenticated;

-- LOS AVISOS DE LAS METAS (cada 5 minutos, como los de los hábitos)
-- Usa la misma contraseña de Vault (diaclaro_avisos) y la misma dirección.
create or replace function public.enviar_avisos_metas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  secreto text;
  direccion text;
  aviso record;
  sub record;
  peticion bigint;
  enviados integer := 0;
begin
  select decrypted_secret into secreto
    from vault.decrypted_secrets where name = 'diaclaro_avisos' limit 1;
  if secreto is null then
    return 0;
  end if;
  select decrypted_secret into direccion
    from vault.decrypted_secrets where name = 'diaclaro_avisos_url' limit 1;
  direccion := coalesce(direccion, 'https://diaclaro.vercel.app/api/avisos/enviar');

  for aviso in
    with base as (
      select g.id, g.user_id, g.title, g.kind, g.due_date, g.remind_at,
             g.project_id, p.area_id, p.name as proyecto,
             timezone(coalesce(z.name, 'Europe/Madrid'), now()) as ahora
        from public.project_goals g
        join public.projects p on p.id = g.project_id
        left join public.settings s on s.user_id = g.user_id
        -- Si la zona horaria no es válida, se usa la de España.
        left join pg_catalog.pg_timezone_names z on z.name = s.timezone
       where g.remind_at is not null
         and g.reminder_sent_at is null
         and g.done_at is null
         and exists (select 1 from public.push_subscriptions ps where ps.user_id = g.user_id)
    )
    select b.*
      from base b
     -- Desde su hora y hasta 3 horas después (si el móvil estaba apagado, luego ya no).
     where (b.ahora - b.remind_at) between interval '0' and interval '3 hours'
  loop
    update public.project_goals set reminder_sent_at = now() where id = aviso.id;

    for sub in
      select ps.id, ps.endpoint, ps.p256dh, ps.auth
        from public.push_subscriptions ps where ps.user_id = aviso.user_id
    loop
      select net.http_post(
        url := direccion,
        body := jsonb_build_object(
          'endpoint', sub.endpoint,
          'p256dh', sub.p256dh,
          'auth', sub.auth,
          'meta', aviso.id,
          'titulo', left(aviso.title, 100),
          'hora', to_char(aviso.remind_at, 'HH24:MI'),
          'tipo', aviso.kind,
          'proyecto', left(aviso.proyecto, 100),
          'ruta', '/areas/' || aviso.area_id || '/proyectos/' || aviso.project_id,
          -- Cuántos días faltan (vacío si la meta no tiene fecha).
          'dias', aviso.due_date - aviso.ahora::date
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secreto
        )
      ) into peticion;
      -- Así la tarea de los hábitos borra las direcciones que ya no existen.
      insert into public.push_deliveries (request_id, subscription_id)
        values (peticion, sub.id);
      enviados := enviados + 1;
    end loop;
  end loop;

  return enviados;
end;
$$;

-- Solo la puede ejecutar la tarea programada, nunca la app ni nadie de fuera.
revoke execute on function public.enviar_avisos_metas() from public, anon, authenticated;

-- Cada 5 minutos. (Si ya existía con este nombre, se reemplaza).
select cron.schedule(
  'diaclaro-avisos-metas',
  '*/5 * * * *',
  'select public.enviar_avisos_metas()'
);
