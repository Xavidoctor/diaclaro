-- Motor de sobrecarga, parte 2: cuánto has tardado de verdad en cada tarea.
-- Solo añade una columna a la tabla tasks, que ya tiene user_id y reglas RLS:
-- las reglas se aplican a toda la fila, así que no hace falta crear otras.

-- Minutos reales. Se rellena solo si lo dices al marcar la tarea como hecha;
-- si no lo sabes, se queda vacío (la app no se lo inventa).
alter table public.tasks
  add column actual_minutes integer
    check (actual_minutes is null or actual_minutes between 1 and 1440);
