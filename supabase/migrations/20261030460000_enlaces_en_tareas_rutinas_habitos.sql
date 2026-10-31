-- Un enlace (opcional) en tareas, rutinas y hábitos: un podcast que quieres
-- escuchar, una clase grabada, un vídeo… Desde Hoy se abre con un toque.
--
-- Solo añade columnas a tablas que ya tienen user_id y reglas RLS: las
-- reglas se aplican a toda la fila, así que no hace falta crear otras.
-- Vacío = sin enlace. Solo se aceptan enlaces web (http:// o https://).

alter table public.tasks add column url text
  check (url is null or (char_length(url) <= 2000 and url ~* '^https?://'));

alter table public.routines add column url text
  check (url is null or (char_length(url) <= 2000 and url ~* '^https?://'));

alter table public.habits add column url text
  check (url is null or (char_length(url) <= 2000 and url ~* '^https?://'));
