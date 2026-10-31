"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  guardarSeccionesAction,
  type SeccionesState,
} from "@/app/ajustes/acciones-secciones";
import { SaberMas } from "@/app/componentes/saber-mas";
import type { Secciones } from "@/lib/planner/secciones";

// «Secciones de la app»: enciende o apaga Empleo y Documentos importantes.
// Apagadas no se borra nada: solo dejan de salir en Hoy, Áreas y el panel.
export function FormSecciones({ secciones }: { secciones: Secciones }) {
  const [estado, formAction, guardando] = useActionState<
    SeccionesState,
    FormData
  >(guardarSeccionesAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <SaberMas resumen="Enciende solo lo que uses.">
        Si apagas una sección, no se borra nada: sus datos siguen guardados y
        puedes volver a encenderla cuando quieras.
      </SaberMas>
      <Casilla
        nombre="empleo"
        titulo="Empleo"
        texto="Las ofertas a las que te presentas y sus seguimientos."
        marcada={secciones.empleo}
        href="/empleo"
      />
      <Casilla
        nombre="documentos"
        titulo="Documentos importantes"
        texto="DNI, billetes, entradas… guardados en tu Google Drive."
        marcada={secciones.documentos}
        href="/documentos"
      />
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-primary self-start py-2"
      >
        {guardando ? "Guardando…" : estado.guardado ? "Guardado" : "Guardar"}
      </button>
    </form>
  );
}

function Casilla({
  nombre,
  titulo,
  texto,
  marcada,
  href,
}: {
  nombre: string;
  titulo: string;
  texto: string;
  marcada: boolean;
  href: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={`seccion-${nombre}`}
        type="checkbox"
        name={nombre}
        defaultChecked={marcada}
        className="mt-1 size-5 accent-primary"
      />
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor={`seccion-${nombre}`} className="font-medium">
          {titulo}
        </label>
        <span className="text-sm text-muted">{texto}</span>
        {marcada && (
          <Link href={href} className="enlace self-start text-sm">
            Abrir {titulo.toLowerCase()}
          </Link>
        )}
      </div>
    </div>
  );
}
