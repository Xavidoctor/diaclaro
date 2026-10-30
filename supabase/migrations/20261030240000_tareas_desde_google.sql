-- Etapa 9, parte 3: pasar un evento de tu Google Calendar a tus tareas.
-- Guarda de qué evento de Google salió la tarea, para no crearla dos veces
-- y para que la Agenda sepa que ya la tienes. DíaClaro sigue sin escribir
-- nada en Google: la tarea solo existe en DíaClaro.
-- Las reglas RLS de tasks ya protegen esta columna (cada uno ve lo suyo).

alter table public.tasks
  add column google_event text
    check (google_event is null or char_length(google_event) <= 1100);

-- Una sola tarea por evento de Google y día, para cada persona
-- (sin contar las que están en la papelera).
create unique index tasks_google_event_idx
  on public.tasks (user_id, google_event)
  where google_event is not null and deleted_at is null;
