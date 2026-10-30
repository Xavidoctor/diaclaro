-- Etapa 3 (parte 2): cada tarea puede pertenecer a un proyecto (o asignatura).
-- Es opcional: una tarea sin proyecto sigue funcionando igual que antes.

-- Hace falta para que una tarea solo pueda ir en un proyecto tuyo (ver abajo).
alter table public.projects add constraint projects_id_user_id_key unique (id, user_id);

alter table public.tasks add column project_id uuid;

-- El proyecto tiene que ser del mismo usuario. Si borras el proyecto,
-- la tarea no se borra: solo se queda sin proyecto.
alter table public.tasks
  add constraint tasks_project_id_user_id_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id)
  on delete set null (project_id);

create index tasks_project_id_idx on public.tasks (project_id);
