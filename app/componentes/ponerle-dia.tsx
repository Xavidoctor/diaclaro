"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { MoverTareas } from "@/app/componentes/mover-tareas";

// «Ponerle día» en una tarea sin día: al pulsarlo salen «Hoy» y «Otro día»
// (con calendario). Así la lista no se llena de botones.
export function PonerleDia({ id, hoy }: { id: string; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="enlace inline-flex items-center gap-1 self-start text-sm"
      >
        <CalendarPlus aria-hidden className="size-4" />
        Ponerle día
      </button>
    );
  return <MoverTareas ids={[id]} hoy={hoy} textoHoy="Hoy" />;
}
