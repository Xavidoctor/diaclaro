-- Hábitos (parte 5): tus frases para motivarte.
-- Cada hábito puede tener hasta 20 frases cortas: las que escribes tú y las
-- ideas de la IA que tú decides guardar (la IA nunca guarda nada sola).
-- Cuando llega un aviso, sale una de ellas al azar.
-- No hace falta tabla nueva: es una columna más en "habits", que ya tiene
-- user_id y sus reglas RLS.
--
-- Antes de esto hay que haber ejecutado 20261030300000_avisos_push.sql:
-- aquí se cambia su función para que el aviso lleve una de tus frases.

alter table public.habits
  add column phrases text[] not null default '{}'
    check (cardinality(phrases) <= 20
      and char_length(array_to_string(phrases, '')) <= 20 * 200);

-- LA TAREA DE CADA 5 MINUTOS, ahora con frase. Es la misma que antes;
-- solo cambia que manda también "frase".
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
      select h.id, h.user_id, h.title, h.remind_at, h.repeat_rule, h.routine_id, h.phrases,
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
    select h.id, h.user_id, h.title, h.remind_at, h.dia,
           -- Una de tus frases, al azar (o ninguna si no tienes).
           (select f from unnest(h.phrases) as f order by random() limit 1) as frase
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
          'hora', to_char(aviso.remind_at, 'HH24:MI'),
          'frase', aviso.frase
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

-- Se vuelve a quitar el permiso por si acaso (al reemplazarla se mantiene).
revoke execute on function public.enviar_recordatorios_push() from public, anon, authenticated;
