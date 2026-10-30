-- Etapa 11 (parte 1): enlazar documentos de Google Drive a un proyecto o asignatura.
-- Se usa el permiso "drive.file": DíaClaro solo ve los archivos que TÚ eliges
-- en el selector de Google, nunca el resto de tu Drive. Tampoco lee lo que hay
-- dentro: solo guarda el nombre y el enlace para abrirlo.

-- 1. Si la persona ha dado también el permiso de Drive.
alter table public.google_connections
  add column drive boolean not null default false;

-- 2. Los documentos enlazados a cada proyecto.
create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  drive_file_id text not null check (char_length(drive_file_id) between 1 and 200),
  title text not null check (char_length(title) between 1 and 500),
  url text not null check (char_length(url) <= 2000 and url like 'https://%'),
  mime_type text check (mime_type is null or char_length(mime_type) <= 200),
  created_at timestamptz not null default now(),
  -- El proyecto tiene que ser tuyo. Si lo borras, se borran sus enlaces
  -- (el documento sigue en tu Drive).
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  unique (user_id, project_id, drive_file_id)
);

create index project_documents_project_idx on public.project_documents (project_id, user_id);

-- REGLAS RLS: cada persona solo ve, crea y borra sus propios enlaces.
alter table public.project_documents enable row level security;

create policy "Ver mis documentos" on public.project_documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis documentos" on public.project_documents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Borrar mis documentos" on public.project_documents
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.project_documents from anon;
grant select, insert, delete on public.project_documents to authenticated;
