-- Rutinas con modo foco.
--
-- 1. Cada rutina puede tener el modo foco activado (para estudiar, entrenar...).
--    Con foco, puedes pedir un aviso unos minutos antes de que empiece
--    (por si vienes de comer o de otra cosa). Los minutos los eliges tú.
-- 2. Los ratos de foco pueden ir unidos a una rutina (además de a una tarea).
-- 3. Cada 5 minutos, Supabase mira qué rutinas con aviso están a punto de
--    empezar y manda el aviso al móvil, igual que los recordatorios de hábitos.
--
-- Antes de esto hay que haber ejecutado 20261030300000_avisos_push.sql
-- (usa sus direcciones de avisos y su contraseña en Vault).
-- No hay tablas con datos nuevos: son columnas en "routines" y "focus_sessions",
-- que ya tienen user_id y sus reglas RLS. La tabla de avisos enviados también
-- lleva user_id y RLS.

-- 1. RUTINAS: modo foco y aviso antes de empezar (opcional).
alter table public.routines
  add column focus boolean not null default false,
  -- Cuántos minutos antes de la hora de inicio (window_start) te avisa. Vacío = sin aviso.
  add column focus_alarm_minutes integer
    check (focus_alarm_minutes is null or focus_alarm_minutes between 1 and 120),
  add constraint routines_focus_alarm_check
    check (focus_alarm_minutes is null or (focus and window_start is not null));

-- 2. RATOS DE FOCO unidos a una rutina (opcional).
-- La rutina tiene que ser del mismo usuario. Si la borras, el rato de foco
-- se queda, pero sin rutina (solo se vacía routine_id).
alter table public.focus_sessions
  add column routine_id uuid,
  add constraint focus_sessions_routine_fk
    foreign key (routine_id, user_id) references public.routines (id, user_id)
    on delete set null (routine_id);

create index focus_sessions_routine_id_idx on public.focus_sessions (routine_id, user_id);

-- 3. AVISOS DE RUTINAS YA ENVIADOS (uno por rutina y día, como mucho)
create table public.routine_reminder_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null,
  on_date date not null,
  sent_at timestamptz not null default now(),
  primary key (routine_id, on_date),
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade
);

create index routine_reminder_sends_user_id_idx on public.routine_reminder_sends (user_id);

alter table public.routine_reminder_sends enable row level security;

-- Solo se pueden ver (los escribe la función de abajo).
create policy "Ver mis avisos de rutinas enviados" on public.routine_reminder_sends
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.routine_reminder_sends from anon;
grant select on public.routine_reminder_sends to authenticated;

-- LA TAREA QUE SE EJECUTA CADA 5 MINUTOS (avisos de rutinas)
-- Es como la de los hábitos, pero mira las rutinas con foco y aviso.
create or replace function public.enviar_avisos_rutinas()
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
      select r.id, r.user_id, r.title, r.window_start, r.focus_alarm_minutes,
             r.repeat_rule, r.times_per_day,
             timezone(coalesce(z.name, 'Europe/Madrid'), now()) as ahora
        from public.routines r
        left join public.settings s on s.user_id = r.user_id
        -- Si la zona horaria no es válida, se usa la de España.
        left join pg_catalog.pg_timezone_names z on z.name = s.timezone
       where r.active
         and r.focus
         and r.focus_alarm_minutes is not null
         and r.window_start is not null
         and exists (select 1 from public.push_subscriptions p where p.user_id = r.user_id)
    ),
    hoy as (
      select b.*, b.ahora::date as dia,
             (array['SU','MO','TU','WE','TH','FR','SA'])[extract(dow from b.ahora)::int + 1] as codigo,
             substring(b.repeat_rule from 'BYDAY=([A-Z,]+)') as dias,
             b.window_start - make_interval(mins => b.focus_alarm_minutes) as alarma
        from base b
    )
    select h.id, h.user_id, h.title, h.window_start, h.focus_alarm_minutes, h.dia
      from hoy h
     -- Desde la hora del aviso hasta que empieza (con 5 minutos de margen,
     -- porque la tarea pasa cada 5 minutos). Más tarde ya no tiene sentido.
     where (h.ahora::time - h.alarma)
             between interval '0' and make_interval(mins => h.focus_alarm_minutes + 5)
       -- Que toque ese día de la semana (vacío = todos los días).
       and (h.dias is null or (',' || h.dias || ',') like ('%,' || h.codigo || ',%'))
       -- Que aún no la hayas completado hoy.
       and (select count(*) from public.routine_logs l
             where l.routine_id = h.id and l.on_date = h.dia) < h.times_per_day
       -- Y que no se haya avisado ya hoy.
       and not exists (
         select 1 from public.routine_reminder_sends e where e.routine_id = h.id and e.on_date = h.dia)
  loop
    insert into public.routine_reminder_sends (user_id, routine_id, on_date)
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
          'rutina', aviso.id,
          'titulo', left(aviso.title, 100),
          'hora', to_char(aviso.window_start, 'HH24:MI'),
          'minutos', aviso.focus_alarm_minutes
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
revoke execute on function public.enviar_avisos_rutinas() from public, anon, authenticated;

-- Cada 5 minutos. (Si ya existía con este nombre, se reemplaza).
select cron.schedule(
  'diaclaro-avisos-rutinas',
  '*/5 * * * *',
  'select public.enviar_avisos_rutinas()'
);
