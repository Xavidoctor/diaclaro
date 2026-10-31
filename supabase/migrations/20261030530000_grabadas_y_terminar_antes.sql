-- El día por horas de la Agenda:
--
-- 1. «Clase grabada»: si una rutina grabada se junta con algo que no lo
--    está (otra clase, el trabajo), la app la deja para otro momento y la
--    puedes mover. Si no se junta con nada, va a su hora como siempre.
--    Solo añade una columna a una tabla que ya tiene user_id y reglas RLS.
alter table public.routines
  add column recorded boolean not null default false;

-- 2. «Ya ha terminado»: la hora a la que acabó una rutina ese día (por
--    ejemplo, la clase terminó antes). Vacío = acaba a su hora de siempre.
--    routine_moves ya tiene user_id y reglas RLS (migración 510000).
alter table public.routine_moves add column end_time time;
