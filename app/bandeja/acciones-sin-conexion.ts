"use client";

import {
  crearTareaParaDia,
  editarTarea,
  type EditarTareaState,
  type TareaParaDiaState,
} from "@/app/bandeja/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";
import { camposDeFormulario } from "@/lib/planner/cambios-sin-conexion";

// Las mismas acciones de editar y añadir tareas, pero si no hay internet
// guardan el cambio en el móvil y lo envían al volver la red.
// La franja de arriba dice cuántos cambios están esperando.

export async function editarTareaOGuardar(
  prev: EditarTareaState,
  formData: FormData,
): Promise<EditarTareaState> {
  let resultado: EditarTareaState = prev;
  const r = await intentarOGuardar(
    async () => {
      resultado = await editarTarea(prev, formData);
    },
    {
      tipo: "editar-tarea",
      tareaId: String(formData.get("id") ?? ""),
      campos: camposDeFormulario(formData.entries()),
    },
  );
  // Sin red sale el mismo «Guardado» de siempre; la franja de arriba dice
  // que está esperando a enviarse.
  return r === "guardado" ? { guardado: true } : resultado;
}

export async function crearTareaParaDiaOGuardar(
  prev: TareaParaDiaState,
  formData: FormData,
): Promise<TareaParaDiaState> {
  let resultado: TareaParaDiaState = prev;
  const r = await intentarOGuardar(
    async () => {
      resultado = await crearTareaParaDia(prev, formData);
    },
    { tipo: "nueva-tarea", campos: camposDeFormulario(formData.entries()) },
  );
  return r === "guardado" ? { envios: prev.envios + 1 } : resultado;
}
