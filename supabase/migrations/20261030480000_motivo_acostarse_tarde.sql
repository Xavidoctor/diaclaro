-- «¿Por qué te acostaste más tarde?»: al corregir la hora a la que te
-- dormiste anoche, puedes apuntar (si quieres) qué estabas haciendo.
-- Sirve para ver en «Tu semana» («Tus noches») en qué se fueron esas horas.
--
-- Dos columnas nuevas en bedtimes (la tabla ya tiene user_id y reglas RLS,
-- así que cada persona sigue viendo solo lo suyo):
-- * late_reason: el motivo elegido de una lista corta (o vacío).
-- * late_note: unas palabras tuyas, por ejemplo «terminando la tienda» (o vacío).

alter table public.bedtimes
  add column late_reason text
    check (late_reason in ('pantallas', 'trabajo', 'planes', 'no-podia', 'otro')),
  add column late_note text
    check (char_length(late_note) <= 200);
