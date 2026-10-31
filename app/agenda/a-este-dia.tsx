"use client";

import { useActionState } from "react";
import { CalendarPlus } from "lucide-react";
import { moverTareasA, type MoverTareasState } from "@/app/bandeja/actions";

// Un toque: la tarea sin día pasa al día que estás viendo en la Agenda.
export function AEsteDia({
  id,
  dia,
  texto,
}: {
  id: string;
  dia: string;
  texto: string; // «Poner hoy» o «Poner en este día»
}) {
  const [estado, accion, guardando] = useActionState<
    MoverTareasState,
    FormData
  >(moverTareasA, {});
  return (
    <form action={accion} className="flex flex-col gap-1 text-sm">
      <input type="hidden" name="ids" value={id} />
      <input type="hidden" name="dia" value={dia} />
      <button
        type="submit"
        disabled={guardando}
        className="enlace inline-flex items-center gap-1 self-start"
      >
        <CalendarPlus aria-hidden className="size-4" />
        {texto}
      </button>
      {estado.error && (
        <p role="alert" className="text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
