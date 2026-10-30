import { z } from "zod";
import { horaOpcional, textoOpcional } from "./agenda";
import { prepararProyectoDeTarea } from "./areas";
import type { Resultado } from "./bandeja";
import { esFecha } from "./fechas";

// Lo que propone la IA, después de que tú lo revises y lo cambies.
// Funciones puras, con pruebas en propuestas.test.ts.
// Aquí se comprueba de nuevo todo, porque el formulario se puede tocar.

export const MAX_ELEMENTOS = 10;

export type ElementoAGuardar =
  | {
      tipo: "tarea";
      title: string;
      details: string | null;
      due_date: string | null;
      estimated_minutes: number | null;
      project_id: string | null;
    }
  | { tipo: "nota"; body: string }
  | {
      tipo: "cita";
      title: string;
      notes: string | null;
      start_date: string;
      start_time: string | null;
      end_time: string | null;
    };

const esquema = z.object({
  tipo: z.enum(["tarea", "nota", "cita"], { error: "Elige qué es." }),
  titulo: z
    .string()
    .trim()
    .min(1, "Cada elemento necesita un título.")
    .max(200, "Los títulos admiten 200 caracteres."),
  detalle: textoOpcional.pipe(
    z.string().max(2000, "El detalle admite 2000 caracteres.").nullable(),
  ),
  fecha: textoOpcional.refine((v) => v === null || esFecha(v), {
    error: "Una de las fechas no es válida.",
  }),
  hora: horaOpcional,
  minutos: textoOpcional
    .refine((v) => v === null || /^\d+$/.test(v), {
      error: "Los minutos tienen que ser un número entero.",
    })
    .transform((v) => (v === null ? null : Number(v)))
    .refine((v) => v === null || (v >= 1 && v <= 1440), {
      error: "Los minutos van de 1 a 1440 (un día).",
    }),
});

// "16:00" + 90 → "17:30". Si se pasa de medianoche, sin hora de fin.
export function sumarMinutosAHora(
  hora: string,
  minutos: number,
): string | null {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  if (total >= 24 * 60) return null;
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(Math.floor(total / 60))}:${dos(total % 60)}`;
}

// Lee el formulario de revisión. Cada elemento i tiene sus campos con el
// número al final: "incluir-0", "tipo-0", "titulo-0"...
// Solo se guardan los que tienen marcada la casilla «incluir».
export function leerElementos(
  obtener: (campo: string) => unknown,
): Resultado<ElementoAGuardar[]> {
  const total = Math.min(Number(obtener("total")) || 0, MAX_ELEMENTOS);
  const elementos: ElementoAGuardar[] = [];

  for (let i = 0; i < total; i++) {
    if (obtener(`incluir-${i}`) !== "si") continue;
    const r = esquema.safeParse({
      tipo: obtener(`tipo-${i}`),
      titulo: obtener(`titulo-${i}`) ?? "",
      detalle: obtener(`detalle-${i}`) ?? "",
      fecha: obtener(`fecha-${i}`) ?? "",
      hora: obtener(`hora-${i}`) ?? "",
      minutos: obtener(`minutos-${i}`) ?? "",
    });
    if (!r.success) return { ok: false, error: r.error.issues[0].message };
    const d = r.data;

    if (d.tipo === "nota") {
      elementos.push({
        tipo: "nota",
        body: d.detalle ? `${d.titulo}\n${d.detalle}` : d.titulo,
      });
    } else if (d.tipo === "cita") {
      if (!d.fecha)
        return {
          ok: false,
          error: `«${d.titulo}» va a la agenda: elige su día o cámbiala a tarea.`,
        };
      elementos.push({
        tipo: "cita",
        title: d.titulo.slice(0, 120),
        notes: d.detalle,
        start_date: d.fecha,
        start_time: d.hora,
        end_time:
          d.hora && d.minutos ? sumarMinutosAHora(d.hora, d.minutos) : null,
      });
    } else {
      const proyecto = prepararProyectoDeTarea(obtener(`proyecto-${i}`));
      if (!proyecto.ok) return proyecto;
      elementos.push({
        tipo: "tarea",
        title: d.titulo,
        details: d.detalle,
        due_date: d.fecha,
        estimated_minutes: d.minutos,
        project_id: proyecto.valor,
      });
    }
  }

  if (elementos.length === 0)
    return { ok: false, error: "Marca al menos un elemento para guardar." };
  return { ok: true, valor: elementos };
}

// "Guardado: 2 tareas, 1 nota y 1 cita."
export function textoGuardado(elementos: ElementoAGuardar[]): string {
  const contar = (tipo: ElementoAGuardar["tipo"]) =>
    elementos.filter((e) => e.tipo === tipo).length;
  const partes = (
    [
      [contar("tarea"), "tarea", "tareas"],
      [contar("nota"), "nota", "notas"],
      [contar("cita"), "cita en la agenda", "citas en la agenda"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`);
  const lista =
    partes.length > 1
      ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`
      : partes[0];
  return `Guardado: ${lista}.`;
}
