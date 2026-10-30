-- Motor de sobrecarga, parte 3: qué es importante, para saber dónde recortar.
-- Solo añade columnas a la tabla tasks, que ya tiene user_id y reglas RLS:
-- las reglas se aplican a toda la fila, así que no hace falta crear otras.

-- Importancia: alta, normal o baja. Vacía = sin indicar (se trata como normal).
alter table public.tasks
  add column importance text
    check (importance is null or importance in ('alta', 'normal', 'baja'));

-- Fecha dura: la fecha no se puede mover (un examen, una entrega).
-- La app nunca te propondrá aplazar ni acortar una tarea así.
alter table public.tasks
  add column hard_deadline boolean not null default false;
