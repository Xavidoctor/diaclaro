"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CLAVE_TEXTO_ASISTENTE } from "@/app/componentes/captura-rapida";
import {
  guardarPropuestas,
  interpretar,
  type GuardarState,
  type InterpretarState,
} from "@/app/ordenar/actions";
import type { Propuesta } from "@/lib/ai/interpretar-texto";
import type { GrupoOpciones } from "@/lib/planner/areas";
import { SaberMas } from "@/app/componentes/saber-mas";

// Paso 1: escribes todo lo que tienes en la cabeza.
// Paso 2: revisas lo que propone la IA, lo cambias y guardas lo que quieras.
export function OrdenarConIA({ grupos }: { grupos: GrupoOpciones[] }) {
  const [estado, pedir, pensando] = useActionState<InterpretarState, FormData>(
    interpretar,
    { intento: 0 },
  );
  const formulario = useRef<HTMLFormElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);

  // Si vienes del botón de tu asistente en Hoy, tu texto ya está
  // escrito: lo ponemos aquí y lo enviamos solo, una vez.
  useEffect(() => {
    const texto = sessionStorage.getItem(CLAVE_TEXTO_ASISTENTE);
    if (!texto || !caja.current) return;
    sessionStorage.removeItem(CLAVE_TEXTO_ASISTENTE);
    caja.current.value = texto;
    formulario.current?.requestSubmit();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <form ref={formulario} action={pedir} className="flex flex-col gap-2">
        <label htmlFor="texto-ia" className="font-medium">
          ¿Qué tienes en la cabeza?
        </label>
        <textarea
          ref={caja}
          id="texto-ia"
          name="texto"
          rows={5}
          required
          maxLength={2000}
          defaultValue={estado.texto ?? ""}
          placeholder="Por ejemplo: el jueves entrego la práctica de mates, tutoría el martes a las 10, llamar a la empresa de la entrevista, idea: repasar con fichas"
          className="input resize-y"
        />
        <button
          type="submit"
          disabled={pensando}
          className="button-primary self-start"
        >
          {pensando ? "Pensando…" : "Pedírselo"}
        </button>
        {estado.error && (
          <p role="alert" className="text-sm text-danger">
            {estado.error}
          </p>
        )}
      </form>

      {estado.propuestas && (
        <Revision
          key={estado.intento}
          propuestas={estado.propuestas}
          grupos={grupos}
        />
      )}
    </div>
  );
}

function Revision({
  propuestas,
  grupos,
}: {
  propuestas: Propuesta[];
  grupos: GrupoOpciones[];
}) {
  const [estado, guardar, guardando] = useActionState<GuardarState, FormData>(
    guardarPropuestas,
    {},
  );

  if (estado.hecho) {
    return (
      <section role="status" className="card flex flex-col gap-2">
        <p className="font-medium">{estado.hecho}</p>
        <p className="text-sm">
          <Link href="/bandeja" className="enlace">
            Ver la Bandeja
          </Link>{" "}
          ·{" "}
          <Link href="/agenda" className="enlace">
            Ver la Agenda
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form action={guardar} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Revisa antes de guardar</h2>
      <SaberMas resumen="Lo ha propuesto una IA y puede equivocarse.">
        Cambia lo que haga falta y desmarca lo que no quieras. Nada se guarda
        hasta que pulses «Guardar».
      </SaberMas>
      <input type="hidden" name="total" value={propuestas.length} />
      <ul className="flex flex-col gap-3">
        {propuestas.map((p, i) => (
          <Elemento key={i} i={i} propuesta={p} grupos={grupos} />
        ))}
      </ul>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-primary self-start"
      >
        {guardando ? "Guardando…" : "Guardar lo marcado"}
      </button>
    </form>
  );
}

function Elemento({
  i,
  propuesta: p,
  grupos,
}: {
  i: number;
  propuesta: Propuesta;
  grupos: GrupoOpciones[];
}) {
  const [tipo, setTipo] = useState(p.tipo);

  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          name={`incluir-${i}`}
          value="si"
          defaultChecked
          aria-label={`Guardar «${p.titulo}»`}
          className="h-5 w-5"
        />
        <select
          name={`tipo-${i}`}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Propuesta["tipo"])}
          aria-label="Qué es"
          className="input py-2"
        >
          <option value="tarea">Tarea</option>
          <option value="cita">Cita (agenda)</option>
          <option value="nota">Nota</option>
        </select>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          name={`titulo-${i}`}
          defaultValue={p.titulo}
          required
          maxLength={200}
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Detalle (opcional)
        <textarea
          name={`detalle-${i}`}
          defaultValue={p.detalle ?? ""}
          rows={1}
          maxLength={2000}
          className="input resize-y py-2"
        />
      </label>
      {tipo !== "nota" && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {tipo === "cita" ? "Día" : "Fecha (opcional)"}
            <input
              type="date"
              name={`fecha-${i}`}
              defaultValue={p.fecha ?? ""}
              required={tipo === "cita"}
              className="input py-2"
            />
          </label>
          {tipo === "cita" && (
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Hora (opcional)
              <input
                type="time"
                name={`hora-${i}`}
                defaultValue={p.hora ?? ""}
                className="input py-2"
              />
            </label>
          )}
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Minutos (opcional)
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              name={`minutos-${i}`}
              defaultValue={p.minutos ?? ""}
              className="input py-2"
            />
          </label>
        </div>
      )}
      {tipo === "tarea" && grupos.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Proyecto (opcional)
          <select
            name={`proyecto-${i}`}
            defaultValue={p.proyectoId ?? ""}
            className="input py-2"
          >
            <option value="">Sin proyecto</option>
            {grupos.map((g) => (
              <optgroup key={g.area} label={g.area}>
                {g.proyectos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      {p.avisos.length > 0 && (
        <ul className="text-xs text-muted">
          {p.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
