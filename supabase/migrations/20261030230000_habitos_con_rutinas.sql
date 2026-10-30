-- Hábitos (parte 2): unir un hábito con una rutina.
-- Si un hábito va unido a una rutina, cada «Hecho» de esa rutina
-- cuenta solo como 1 en el hábito: no hace falta apuntarlo dos veces.

-- Para que la unión solo pueda apuntar a rutinas de la misma persona.
alter table public.routines
  add constraint routines_id_user_id_key unique (id, user_id);

-- Rutina unida (opcional). Si borras la rutina, el hábito se queda, pero sin unir.
alter table public.habits
  add column routine_id uuid,
  add constraint habits_routine_fk
    foreign key (routine_id, user_id) references public.routines (id, user_id)
    on delete set null (routine_id);

create index habits_routine_id_idx on public.habits (routine_id);
