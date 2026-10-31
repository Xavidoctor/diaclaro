-- «Así te conozco»: ¿uso lo que sueles tardar de verdad?
--
-- DíaClaro aprende cuánto tardas de verdad en tus tareas (tu «factor») y lo
-- usa al avisarte de que no te cabe el día, en Día difícil y al organizarte
-- el día. Con esta casilla puedes decirle que no lo use y que cuente solo
-- los minutos que tú pones.
--
-- Solo añade una columna a una tabla que ya tiene user_id y reglas RLS: las
-- reglas se aplican a toda la fila, así que no hace falta crear otras.
-- Por defecto, sí se usa (como hasta ahora).

alter table public.settings
  add column use_real_pace boolean not null default true;
