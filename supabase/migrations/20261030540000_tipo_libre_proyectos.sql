-- Tipo libre en cada proyecto.
--
-- Antes un proyecto solo podía ser «Proyecto» o «Asignatura». Ahora puedes
-- escribir el tipo que quieras («Asignatura», «Deporte», «Cliente»...).
-- La app recuerda los que ya has usado y te los sugiere.
--
-- Solo añade una columna a una tabla que ya tiene user_id y reglas RLS
-- (migración 040000). Vacía = sin tipo (se muestra como «Proyecto»).
alter table public.projects
  add column if not exists label text
  check (label is null or char_length(label) between 1 and 40);

-- Las asignaturas que ya tenías conservan su nombre de tipo.
update public.projects
  set label = 'Asignatura'
  where kind = 'asignatura' and label is null;

-- Barra de horas libres a la semana (pantalla Áreas).
-- Libres al día = 24 − horas de sueño − horas de descansos.
-- Vacías = 9 h de sueño y 4 h de descansos (lo que pidió Xavi).
-- settings ya tiene user_id y reglas RLS (migración 030000).
alter table public.settings
  add column if not exists sleep_hours numeric(3, 1)
    check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  add column if not exists rest_hours numeric(3, 1)
    check (rest_hours is null or (rest_hours >= 0 and rest_hours <= 24));
