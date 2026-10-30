-- Etapa 6 (parte 3): las candidaturas cuentan en tu área de Empleo.
-- 1) Cada candidatura puede ir en un área (normalmente «Empleo»). Es opcional.
-- 2) Cada entrada del historial puede llevar los minutos que le dedicaste
--    (preparar el CV, la entrevista...). Esos minutos cuentan en la semana del área.
-- Hace falta antes la migración 20261030150000_historial_candidaturas.sql.

alter table public.job_applications add column area_id uuid;

-- El área tiene que ser del mismo usuario. Si borras el área,
-- la candidatura no se borra: solo se queda sin área.
alter table public.job_applications
  add constraint job_applications_area_id_user_id_fkey
  foreign key (area_id, user_id) references public.areas (id, user_id)
  on delete set null (area_id);

create index job_applications_area_id_idx on public.job_applications (area_id);

-- Minutos dedicados (vacío = no lo apuntaste). Como mucho un día entero.
alter table public.job_application_events
  add column minutes integer check (minutes is null or minutes between 1 and 1440);
