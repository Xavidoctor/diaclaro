-- Etapa 1, parte 2: tipo de nota y etiquetas.
-- Solo añade columnas a la tabla notes, que ya tiene user_id y reglas RLS:
-- las reglas se aplican a toda la fila, así que no hace falta crear otras.

-- Tipo de nota. Todas las que ya existen pasan a ser "nota".
alter table public.notes
  add column kind text not null default 'nota'
    check (kind in ('nota', 'lista', 'idea', 'recordatorio', 'apunte', 'enlace'));

-- Etiquetas opcionales, guardadas como una lista de textos: {dropshipping, ade}.
alter table public.notes
  add column tags text[] not null default '{}'
    check (cardinality(tags) <= 20);

-- Índice para filtrar rápido por etiqueta.
create index notes_tags_idx on public.notes using gin (tags);
