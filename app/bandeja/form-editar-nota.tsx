"use client";

import { useState, type ReactNode } from "react";
import { editarNota } from "@/app/bandeja/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";

// El formulario «Editar» de una nota. Con internet guarda como siempre; sin
// internet guarda el cambio en el móvil y lo envía al volver la red.
// (El proyecto de la nota solo se cambia con internet.)
export function FormEditarNota({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const [esperando, setEsperando] = useState(false);

  async function guardar(formData: FormData) {
    const texto = String(formData.get("texto") ?? "").trim();
    if (!texto) return;
    const r = await intentarOGuardar(() => editarNota(formData), {
      tipo: "editar-nota",
      notaId: id,
      texto,
      tipoNota: String(formData.get("tipo") ?? ""),
      etiquetas: String(formData.get("etiquetas") ?? ""),
    });
    setEsperando(r === "guardado");
  }

  return (
    <form action={guardar} className={className}>
      {children}
      {esperando && (
        <p role="status" className="text-sm text-muted">
          Guardado en el móvil. Se enviará al volver internet.
        </p>
      )}
    </form>
  );
}
