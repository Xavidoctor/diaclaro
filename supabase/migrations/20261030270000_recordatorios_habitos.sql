-- Hábitos (parte 3): recordatorios.
-- Cada hábito puede tener una hora para recordártelo (opcional, la pones tú).
-- Desde esa hora, si ese día aún no has apuntado nada, Hoy te lo recuerda.
-- Vacío = sin recordatorio. La hora es la de tu zona horaria (la de Ajustes).
-- No hace falta tabla nueva: es una columna más en "habits", que ya tiene
-- user_id y sus reglas RLS.

alter table public.habits
  add column remind_at time;
