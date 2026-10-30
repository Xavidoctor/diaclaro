-- Despierto y Levantado. Cambia la tabla day_starts de "Empiezo el día":
-- * awake_time: la hora a la que pulsaste "Despierto" (aún en la cama). Vacía si no lo pulsaste.
-- * start_time pasa a poder estar vacía: si has pulsado "Despierto" pero aún no "Levantado".
-- No hace falta tocar las reglas RLS: siguen valiendo para toda la fila.

alter table public.day_starts
  add column awake_time time;

alter table public.day_starts
  alter column start_time drop not null;

-- Cada fila tiene que tener al menos una de las dos horas.
alter table public.day_starts
  add constraint day_starts_alguna_hora
  check (awake_time is not null or start_time is not null);
