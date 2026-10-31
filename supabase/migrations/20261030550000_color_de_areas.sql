-- El color de cada área: sus tareas y rutinas salen de ese color (más
-- clarito) en el día por horas de la Agenda. Vacío = verde oscuro.
-- Pocos colores a propósito, para que se distingan bien.
-- Solo añade una columna a una tabla que ya tiene user_id y reglas RLS.
alter table public.areas
  add column color text
  check (color in ('azul', 'morado', 'rosa', 'naranja', 'amarillo', 'gris'));
