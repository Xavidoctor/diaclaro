-- Secciones que se pueden esconder: Empleo y Documentos importantes.
-- Dos columnas nuevas en settings (la tabla ya lleva user_id y reglas RLS:
-- cada persona solo ve y cambia sus ajustes).
-- Vacío (null) = automático: la sección se ve solo si ya la usas.
-- true = siempre se ve. false = escondida. Nada se borra.

alter table public.settings
  add column show_jobs boolean,
  add column show_documents boolean;
