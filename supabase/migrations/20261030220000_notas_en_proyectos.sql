-- Etapa 8 (IA 2, parte 3): cada nota puede pertenecer a un proyecto (o asignatura).
-- Así, en la página del proyecto se ven sus notas y la IA puede resumirlas
-- cuando tú lo pidas. Es opcional: una nota sin proyecto funciona igual que antes.

alter table public.notes add column project_id uuid;

-- El proyecto tiene que ser del mismo usuario (la regla única (id, user_id)
-- de projects ya existe desde la etapa 3). Si borras el proyecto, la nota no
-- se borra: solo se queda sin proyecto.
alter table public.notes
  add constraint notes_project_id_user_id_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id)
  on delete set null (project_id);

create index notes_project_id_idx on public.notes (project_id);
