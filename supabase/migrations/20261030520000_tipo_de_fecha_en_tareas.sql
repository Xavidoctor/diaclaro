-- Tres formas de poner una tarea:
--   - «Un día»: para hacerla ese día (como hasta ahora).
--   - «Con fecha límite»: desde que la apuntas hasta ese día. Sale en Hoy
--     todos los días hasta entonces («quedan 3 días»). Por ejemplo, el tema 1.
--   - «Sin día»: pendiente, sin fecha. Se queda sin due_date (como hasta ahora).
--
-- Solo añade una columna a una tabla que ya tiene user_id y reglas RLS:
-- las reglas se aplican a toda la fila, así que no hace falta crear otras.
alter table public.tasks
  add column due_kind text not null default 'dia'
  check (due_kind in ('dia', 'limite'));
