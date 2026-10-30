-- Hábitos (parte 4): avisos con la app cerrada (notificaciones push).
--
-- Cómo funciona:
-- 1. Cada móvil u ordenador donde actives los avisos guarda aquí su
--    "dirección de avisos" (push_subscriptions). Solo tú la ves.
-- 2. Cada 5 minutos, Supabase (pg_cron) mira qué hábitos han llegado a su hora
--    de recordatorio y aún no tienen nada apuntado ese día.
-- 3. Por cada uno, pide a DíaClaro (en Vercel) que envíe el aviso (pg_net).
--    Se apunta en habit_reminder_sends para no avisar dos veces el mismo día.
--
-- Antes de esto hay que haber ejecutado 20261030270000_recordatorios_habitos.sql.
-- Todo es gratis: pg_cron y pg_net vienen con Supabase Free.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- DIRECCIONES DE AVISOS (una por móvil u ordenador)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- La dirección que da el navegador. Es única: si cambia de persona, se reemplaza.
  endpoint text not null unique check (char_length(endpoint) between 1 and 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Ver mis avisos" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Activar mis avisos" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Quitar mis avisos" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- AVISOS YA ENVIADOS (uno por hábito y día, como mucho)
create table public.habit_reminder_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null,
  on_date date not null,
  sent_at timestamptz not null default now(),
  primary key (habit_id, on_date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_reminder_sends_user_id_idx on public.habit_reminder_sends (user_id);

alter table public.habit_reminder_sends enable row level security;

-- Solo se pueden ver (los escribe la función de abajo).
create policy "Ver mis avisos enviados" on public.habit_reminder_sends
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.habit_reminder_sends from anon;
grant select on public.habit_reminder_sends to authenticated;

-- ENVÍOS EN CURSO: para saber qué dirección de avisos ya no existe
-- (por ejemplo, si desinstalas la app) y borrarla. Nadie la ve desde la app.
create table public.push_deliveries (
  request_id bigint primary key,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index push_deliveries_subscription_id_idx on public.push_deliveries (subscription_id);

alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;

-- LA TAREA QUE SE EJECUTA CADA 5 MINUTOS
-- Usa dos datos guardados en Supabase Vault (no van en el código):
--   diaclaro_avisos      → la contraseña que comparte con Vercel (AVISOS_SECRETO)
--   diaclaro_avisos_url  → la dirección de envío (opcional; por defecto la de abajo)
-- Si falta la contraseña, no hace nada.
create or replace function public.enviar_recordatorios_push()
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

  -- 1. Borra las direcciones que el navegador ya no reconoce (respuesta 404 o 410).
  delete from public.push_subscriptions s
    using public.push_deliveries d, net._http_response r
    where d.subscription_id = s.id
      and r.id = d.request_id
      and r.status_code in (404, 410);
  delete from public.push_deliveries where created_at < now() - interval '1 day';

  -- 2. Busca los recordatorios que tocan ahora.
  for aviso in
    with base as (
      select h.id, h.user_id, h.title, h.remind_at, h.repeat_rule, h.routine_id,
             timezone(coalesce(z.name, 'Europe/Madrid'), now()) as ahora
        from public.habits h
        left join public.settings s on s.user_id = h.user_id
        -- Si la zona horaria no es válida, se usa la de España.
        left join pg_catalog.pg_timezone_names z on z.name = s.timezone
       where h.active
         and h.remind_at is not null
         and exists (select 1 from public.push_subscriptions p where p.user_id = h.user_id)
    ),
    hoy as (
      select b.*, b.ahora::date as dia,
             (array['SU','MO','TU','WE','TH','FR','SA'])[extract(dow from b.ahora)::int + 1] as codigo,
             substring(b.repeat_rule from 'BYDAY=([A-Z,]+)') as dias
        from base b
    )
    select h.id, h.user_id, h.title, h.remind_at, h.dia
      from hoy h
     -- Desde su hora y hasta 3 horas después (si el móvil estaba apagado, luego ya no).
     where (h.ahora::time - h.remind_at) between interval '0' and interval '3 hours'
       -- Que toque ese día de la semana (vacío = todos los días).
       and (h.dias is null or (',' || h.dias || ',') like ('%,' || h.codigo || ',%'))
       -- Que no haya nada apuntado hoy (ni un «Hecho» de su rutina unida).
       and not exists (
         select 1 from public.habit_logs l where l.habit_id = h.id and l.on_date = h.dia)
       and not (h.routine_id is not null and exists (
         select 1 from public.routine_logs rl
          where rl.routine_id = h.routine_id and rl.on_date = h.dia))
       -- Y que no se haya avisado ya hoy.
       and not exists (
         select 1 from public.habit_reminder_sends e where e.habit_id = h.id and e.on_date = h.dia)
  loop
    insert into public.habit_reminder_sends (user_id, habit_id, on_date)
      values (aviso.user_id, aviso.id, aviso.dia)
      on conflict do nothing;

    for sub in
      select p.id, p.endpoint, p.p256dh, p.auth
        from public.push_subscriptions p where p.user_id = aviso.user_id
    loop
      select net.http_post(
        url := direccion,
        body := jsonb_build_object(
          'endpoint', sub.endpoint,
          'p256dh', sub.p256dh,
          'auth', sub.auth,
          'habito', aviso.id,
          'titulo', aviso.title,
          'hora', to_char(aviso.remind_at, 'HH24:MI')
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secreto
        )
      ) into peticion;
      insert into public.push_deliveries (request_id, subscription_id)
        values (peticion, sub.id);
      enviados := enviados + 1;
    end loop;
  end loop;

  return enviados;
end;
$$;

-- Solo la puede ejecutar la tarea programada, nunca la app ni nadie de fuera.
revoke execute on function public.enviar_recordatorios_push() from public, anon, authenticated;

-- Cada 5 minutos. (Si ya existía con este nombre, se reemplaza).
select cron.schedule(
  'diaclaro-recordatorios',
  '*/5 * * * *',
  'select public.enviar_recordatorios_push()'
);
