"use client";

import { useState } from "react";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { NuevaTarea } from "@/app/areas/nueva-tarea";
import { DesplegarAnadir } from "@/app/componentes/desplegar-anadir";

// «Añadir» dentro de un proyecto: primero solo se ve el botón; al pulsarlo,
// eliges si es algo de una vez (una tarea)
// o algo que se repite (una rutina, como una clase cada lunes a las 16:00).
// "ruta" es la página del proyecto: al guardar la rutina vuelves aquí.
export function AnadirEnProyecto({
  proyectoId,
  ruta,
}: {
  proyectoId: string;
  ruta: string;
}) {
  const [tipo, setTipo] = useState<"una" | "repite">("una");

  return (
    <DesplegarAnadir texto="Añadir tarea o rutina">
      <div
        role="radiogroup"
        aria-label="¿Qué quieres añadir?"
        className="grid grid-cols-2 gap-2"
      >
        <Opcion
          activa={tipo === "una"}
          onClick={() => setTipo("una")}
          titulo="Una vez"
          detalle="Una tarea"
        />
        <Opcion
          activa={tipo === "repite"}
          onClick={() => setTipo("repite")}
          titulo="Se repite"
          detalle="Una rutina, como una clase"
        />
      </div>
      {tipo === "una" ? (
        <NuevaTarea proyectoId={proyectoId} />
      ) : (
        <div className="card p-4">
          <FormRutina volver={ruta} proyectoId={proyectoId} />
        </div>
      )}
    </DesplegarAnadir>
  );
}

function Opcion({
  activa,
  onClick,
  titulo,
  detalle,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={`flex min-h-11 flex-col items-start rounded-xl border px-3 py-2 text-left text-sm ${
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border"
      }`}
    >
      <span className="font-medium">{titulo}</span>
      <span className={activa ? "opacity-90" : "text-muted"}>{detalle}</span>
    </button>
  );
}
