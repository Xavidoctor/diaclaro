-- Una hora para cada vez de la rutina.
--
-- 1. Si una rutina se hace varias veces al día (por ejemplo, pasear al perro
--    2 veces), puedes poner a qué hora haces cada vez. Son opcionales:
--    la que dejes vacía se queda sin hora.
-- 2. Al marcar «Hecho» en Hoy, se apunta qué vez has hecho (1.ª, 2.ª...),
--    para poder marcar y deshacer cada una por separado.
--
-- No hay tablas nuevas: son columnas en "routines" y "routine_logs",
-- que ya tienen user_id y sus reglas RLS.

-- 1. RUTINAS: la hora de cada vez, en orden (1.ª vez, 2.ª vez...).
-- Vacío = sin horas por vez (se usa la franja Desde–Hasta de siempre).
alter table public.routines
  add column times_of_day time[]
    check (times_of_day is null or cardinality(times_of_day) between 1 and 20);

-- 2. REGISTRO: qué vez del día has hecho. Vacío en lo apuntado antes de esto
-- (o desde Foco): cuenta como la primera vez que te quedaba.
alter table public.routine_logs
  add column slot smallint check (slot is null or slot between 1 and 20);
