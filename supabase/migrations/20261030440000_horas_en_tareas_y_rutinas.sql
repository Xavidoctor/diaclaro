-- Reservar horas del día en cualquier proyecto (Trabajo, una asignatura...).
--
-- 1. Una tarea puede tener hora (opcional). Con hora y minutos, ocupa ese
--    rato del día y sale en la Agenda. Sin hora, funciona como siempre.
-- 2. Una rutina puede ir dentro de un proyecto (opcional), por ejemplo
--    «Clase» los lunes y miércoles de 16:00 a 18:00 dentro de una asignatura.
--
-- Solo añade columnas a tablas que ya tienen user_id y reglas RLS: las
-- reglas se aplican a toda la fila, así que no hace falta crear otras.

-- La hora de la tarea. Vacía = sin hora (la app no se la inventa).
alter table public.tasks add column due_time time;

-- El proyecto de la rutina. Tiene que ser del mismo usuario. Si borras el
-- proyecto, la rutina no se borra: solo se queda sin proyecto.
alter table public.routines add column project_id uuid;

alter table public.routines
  add constraint routines_project_id_user_id_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id)
  on delete set null (project_id);

create index routines_project_id_idx on public.routines (project_id);
