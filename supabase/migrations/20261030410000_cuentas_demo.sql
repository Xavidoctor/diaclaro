-- Cuentas de demostración: 3 cuentas para probar DíaClaro sin email.
--
-- Cómo funciona:
-- 1. Xavi crea en Supabase (Authentication → Users → Add user) tres usuarios:
--    demo1@example.com, demo2@example.com y demo3@example.com, todos con la
--    misma contraseña y marcando «Auto Confirm User». ANTES de ejecutar esto.
-- 2. Esta migración los apunta en demo_accounts y les carga datos de ejemplo.
-- 3. En /login salen los botones «Demo 1», «Demo 2» y «Demo 3». En la app,
--    el botón «Restablecer» borra todo lo de esa cuenta y carga otra vez
--    los ejemplos.
--
-- Seguridad:
-- - Una cuenta demo es un usuario normal: las reglas RLS de siempre hacen que
--   nunca vea datos de nadie más.
-- - Restablecer solo funciona si la cuenta está en demo_accounts. Si una
--   persona real lo intentara, la base de datos lo rechaza.
-- - Las cuentas demo no pueden conectar Google ni activar avisos en el móvil
--   (las comparten varias personas: lo verían los demás).
-- - Nadie puede cambiar el email ni la contraseña de una cuenta demo
--   (así nadie la "secuestra" y deja fuera a los demás).
-- - El contador de la IA no se borra al restablecer (así no se salta el tope).

-- ---------------------------------------------------------------------------
-- 1. Qué cuentas son de demostración
-- ---------------------------------------------------------------------------
create table public.demo_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 1, 2 o 3: el número que sale en el botón.
  numero smallint not null unique check (numero between 1 and 3),
  created_at timestamptz not null default now()
);

-- REGLAS RLS: cada cuenta demo solo puede ver su propia fila (para saber
-- que es demo). Nadie puede crear, cambiar ni borrar filas desde la app.
alter table public.demo_accounts enable row level security;

create policy "Ver si mi cuenta es demo" on public.demo_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.demo_accounts from anon, authenticated;
grant select on public.demo_accounts to authenticated;

-- ¿La persona que ha entrado usa una cuenta demo?
create or replace function public.es_demo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.demo_accounts where user_id = (select auth.uid())
  );
$$;

revoke all on function public.es_demo() from public, anon;
grant execute on function public.es_demo() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Cosas que una cuenta demo no puede hacer
-- ---------------------------------------------------------------------------
-- Reglas "restrictive": se suman a las de siempre (tienen que cumplirse todas).
create policy "Las cuentas demo no conectan Google" on public.google_connections
  as restrictive for insert to authenticated with check (not public.es_demo());
create policy "Las cuentas demo no cambian Google" on public.google_connections
  as restrictive for update to authenticated using (not public.es_demo());
create policy "Las cuentas demo no activan avisos" on public.push_subscriptions
  as restrictive for insert to authenticated with check (not public.es_demo());

-- Nadie cambia el email, la contraseña ni el teléfono de una cuenta demo.
-- Si Xavi algún día quiere cambiarlos, primero borra su fila de demo_accounts.
create or replace function public.proteger_cuenta_demo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.demo_accounts where user_id = old.id) then
    new.email := old.email;
    new.encrypted_password := old.encrypted_password;
    new.phone := old.phone;
  end if;
  return new;
end;
$$;

revoke all on function public.proteger_cuenta_demo() from public, anon, authenticated;

create trigger proteger_cuenta_demo
  before update on auth.users
  for each row execute function public.proteger_cuenta_demo();

-- ---------------------------------------------------------------------------
-- 3. Vaciar una cuenta demo y cargar los datos de ejemplo
-- ---------------------------------------------------------------------------
-- Es inventado: una persona de ejemplo que estudia, busca trabajo y lleva
-- su casa. No son datos de Xavi.
create or replace function public.preparar_demo(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  num smallint;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  tabla text;
  a_estudios uuid;
  a_trabajo uuid;
  a_casa uuid;
  p_ingles uuid;
  p_mates uuid;
  p_empleo uuid;
  h_agua uuid;
  h_estirar uuid;
  r_perro uuid;
begin
  -- Doble seguro: solo cuentas apuntadas como demo. Nunca una real.
  select numero into num from public.demo_accounts where user_id = uid;
  if num is null then
    raise exception 'Esta cuenta no es de demostración.';
  end if;

  -- Borra todo lo de esta cuenta en todas las tablas con user_id,
  -- menos el contador de la IA y la propia lista de cuentas demo.
  -- (Así, si mañana se añade una tabla nueva, también se vacía.)
  for tabla in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'user_id'
       and t.table_type = 'BASE TABLE'
       and c.table_name not in ('ai_usage', 'demo_accounts')
  loop
    execute format('delete from public.%I where user_id = $1', tabla) using uid;
  end loop;

  -- Perfil y horas habituales
  insert into public.profiles (user_id, display_name, motto)
    values (uid, 'Demo ' || num, 'Paso a paso, sin prisa.');
  insert into public.settings (user_id, timezone, wake_time, sleep_time, lunch_time, dinner_time)
    values (uid, 'Europe/Madrid', '08:00', '23:30', '14:00', '21:00');

  -- Áreas y proyectos
  insert into public.areas (user_id, name, weekly_minutes, personal_time, position)
    values (uid, 'Estudios', 600, false, 0) returning id into a_estudios;
  insert into public.areas (user_id, name, weekly_minutes, personal_time, position)
    values (uid, 'Trabajo', 300, false, 1) returning id into a_trabajo;
  insert into public.areas (user_id, name, weekly_minutes, personal_time, position)
    values (uid, 'Casa', null, false, 2) returning id into a_casa;
  insert into public.areas (user_id, name, weekly_minutes, personal_time, position)
    values (uid, 'Tiempo libre', null, true, 3);

  insert into public.projects (user_id, area_id, name, kind, notes)
    values (uid, a_estudios, 'Inglés', 'asignatura', 'Examen al final del trimestre.')
    returning id into p_ingles;
  insert into public.projects (user_id, area_id, name, kind)
    values (uid, a_estudios, 'Matemáticas', 'asignatura')
    returning id into p_mates;
  insert into public.projects (user_id, area_id, name, kind, notes)
    values (uid, a_trabajo, 'Buscar trabajo', 'proyecto', 'Enviar al menos dos candidaturas por semana.')
    returning id into p_empleo;
  insert into public.projects (user_id, area_id, name, kind)
    values (uid, a_casa, 'Ordenar el trastero', 'proyecto');

  -- Tareas
  insert into public.tasks (user_id, title, project_id, due_date, estimated_minutes, importance)
    values (uid, 'Repasar el tema 3 de inglés', p_ingles, hoy, 45, 'alta');
  insert into public.tasks (user_id, title, kind, project_id, due_date, estimated_minutes, hard_deadline)
    values (uid, 'Entregar los ejercicios de matemáticas', 'entrega', p_mates, hoy + 2, 90, true);
  insert into public.tasks (user_id, title, project_id, due_date, estimated_minutes)
    values (uid, 'Actualizar el currículum', p_empleo, hoy + 1, 30);
  insert into public.tasks (user_id, title, due_date, estimated_minutes)
    values (uid, 'Llamar al dentista para pedir cita', hoy, 10);
  insert into public.tasks (user_id, title)
    values (uid, 'Comprar bombillas');
  insert into public.tasks (user_id, title, project_id, due_date, estimated_minutes, done_at)
    values (uid, 'Leer el capítulo 1', p_ingles, hoy - 1, 30, now() - interval '1 day');

  -- Notas
  insert into public.notes (user_id, body, kind, pinned)
    values (uid, 'Plan para el fin de semana: mercado, paseo por el parque y llamar a Marta.', 'lista', true);
  insert into public.notes (user_id, body, kind, tags)
    values (uid, 'Idea: preparar la comida del lunes el domingo por la tarde.', 'idea', '{casa}');
  insert into public.notes (user_id, body, kind)
    values (uid, 'Renovar el abono de transporte el día 1.', 'recordatorio');
  insert into public.notes (user_id, body, kind, project_id)
    values (uid, 'Vocabulario nuevo: schedule, deadline, goal.', 'apunte', p_ingles);

  -- Agenda
  insert into public.events (user_id, title, start_date, start_time, end_time, repeat_rule)
    values (uid, 'Clase de inglés', hoy - 14, '18:00', '19:00', 'FREQ=WEEKLY;BYDAY=MO,WE');
  insert into public.events (user_id, title, start_date, start_time, end_time)
    values (uid, 'Café con Laura', hoy + 1, '11:00', '12:00');
  insert into public.events (user_id, title, start_date, part_of_day, repeat_rule)
    values (uid, 'Gimnasio', hoy - 14, 'tarde', 'FREQ=WEEKLY;BYDAY=TU,TH,SA');

  -- Rutinas
  insert into public.routines (user_id, title, times_per_day, duration_minutes)
    values (uid, 'Pasear al perro', 2, 20) returning id into r_perro;
  insert into public.routines (user_id, title, duration_minutes, part_of_day)
    values (uid, 'Leer un rato', 20, 'noche');
  insert into public.routine_logs (user_id, routine_id, on_date)
    values (uid, r_perro, hoy - 1), (uid, r_perro, hoy - 1);

  -- Hábitos
  insert into public.habits (user_id, title, direction, unit, daily_target, phrases)
    values (uid, 'Beber agua', 'mas', 'vasos', 8, '{"Un vaso más y vas genial."}')
    returning id into h_agua;
  insert into public.habits (user_id, title, direction, daily_target)
    values (uid, 'Estirar 5 minutos', 'mas', 1)
    returning id into h_estirar;
  insert into public.habit_logs (user_id, habit_id, on_date, amount)
    values (uid, h_agua, hoy - 1, 7), (uid, h_agua, hoy, 3), (uid, h_estirar, hoy - 1, 1);

  -- Empleo
  insert into public.job_applications (user_id, company, role, status, applied_on, next_follow_up, area_id)
    values (uid, 'Librería Central', 'Dependiente/a', 'enviada', hoy - 5, hoy + 2, a_trabajo);
  insert into public.job_applications (user_id, company, role, status, next_step, area_id)
    values (uid, 'Oficina Norte', 'Auxiliar administrativo/a', 'por_enviar',
            'Adaptar la carta de presentación', a_trabajo);
end;
$$;

-- preparar_demo no se puede llamar desde la app: solo desde restablecer_demo.
revoke all on function public.preparar_demo(uuid) from public, anon, authenticated;

-- El botón «Restablecer»: vacía TU cuenta demo y vuelve a cargar los ejemplos.
create or replace function public.restablecer_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_demo() then
    raise exception 'Solo se pueden restablecer las cuentas de demostración.';
  end if;
  perform public.preparar_demo((select auth.uid()));
end;
$$;

revoke all on function public.restablecer_demo() from public, anon;
grant execute on function public.restablecer_demo() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Apuntar las 3 cuentas (si ya existen) y cargarles los ejemplos
-- ---------------------------------------------------------------------------
insert into public.demo_accounts (user_id, numero)
  select u.id, d.numero
    from auth.users u
    join (values ('demo1@example.com', 1), ('demo2@example.com', 2), ('demo3@example.com', 3))
      as d (email, numero) on lower(u.email) = d.email
  on conflict do nothing;

select public.preparar_demo(user_id) from public.demo_accounts;

-- Comprobación: debería salir 3. Si sale menos, falta crear algún usuario
-- (paso 1) y hay que volver a ejecutar solo la parte 4.
select count(*) as cuentas_demo from public.demo_accounts;
