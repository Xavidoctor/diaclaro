import { z } from "zod";
import {
  CODIGOS,
  horaOpcional,
  prepararCambioDia,
  textoOpcional,
  type CambioDia,
} from "./agenda";
import { prepararProyectoDeTarea } from "./areas";
import type { Resultado } from "./bandeja";
import { esFecha } from "./fechas";
import { prepararHabito, type DatosHabito } from "./habitos";
import { prepararMeta, type DatosMeta } from "./metas";
import { prepararRutina, type DatosRutina } from "./rutinas";

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
    }
  | { tipo: "rutina"; datos: DatosRutina }
  | { tipo: "habito"; datos: DatosHabito }
  | { tipo: "meta"; proyectoId: string; datos: DatosMeta };

const esquema = z.object({
  tipo: z.enum(["tarea", "nota", "cita", "rutina", "habito", "meta"], {
    error: "Elige qué es.",
  }),
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
    // Qué días toca (rutinas y hábitos): "todos" o los días marcados.
    const cuando = obtener(`cuando-${i}`);
    const dias = CODIGOS.filter((c) => obtener(`dia-${i}-${c}`) === "si");
    const faltanDias = () => ({
      ok: false as const,
      error: `«${d.titulo}»: elige qué días toca.`,
    });

    if (d.tipo === "rutina") {
      if (cuando !== "todos" && cuando !== "algunos") return faltanDias();
      const rutina = prepararRutina({
        title: d.titulo,
        notes: d.detalle ?? "",
        cuando,
        dias,
        times_per_day: "1",
        duration_minutes: d.minutos === null ? "" : String(d.minutos),
        window_start: d.hora ?? "",
        window_end: "",
        part_of_day: "",
      });
      if (!rutina.ok)
        return { ok: false, error: `«${d.titulo}»: ${rutina.error}` };
      elementos.push({ tipo: "rutina", datos: rutina.valor });
    } else if (d.tipo === "habito") {
      if (cuando !== "todos" && cuando !== "algunos") return faltanDias();
      const habito = prepararHabito({
        title: d.titulo,
        notes: d.detalle ?? "",
        direction: "mas",
        unit: "",
        daily_target: "",
        cuando,
        dias,
      });
      if (!habito.ok)
        return { ok: false, error: `«${d.titulo}»: ${habito.error}` };
      elementos.push({ tipo: "habito", datos: habito.valor });
    } else if (d.tipo === "meta") {
      const proyecto = prepararProyectoDeTarea(obtener(`proyecto-${i}`));
      if (!proyecto.ok) return proyecto;
      if (!proyecto.valor)
        return {
          ok: false,
          error: `«${d.titulo}» es una meta: elige su proyecto o cámbiala a tarea.`,
        };
      const meta = prepararMeta({
        title: d.titulo,
        kind: obtener(`clase-${i}`),
        due_date: d.fecha ?? "",
        aviso_dia: "",
        aviso_hora: "",
      });
      if (!meta.ok) return { ok: false, error: `«${d.titulo}»: ${meta.error}` };
      elementos.push({
        tipo: "meta",
        proyectoId: proyecto.valor,
        datos: meta.valor,
      });
    } else if (d.tipo === "nota") {
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
      [contar("rutina"), "rutina", "rutinas"],
      [contar("habito"), "hábito", "hábitos"],
      [contar("meta"), "meta", "metas"],
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

// ---- «Algo ha cambiado» ----

export type CambioAceptado =
  | { tipo: "cancelar"; eventoId: string; dia: string }
  | { tipo: "mover"; eventoId: string; dia: string; cambio: CambioDia }
  | { tipo: "tarea"; id: string; fecha: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lee el cambio que viaja en un botón «Aceptar» y lo comprueba entero.
// Formatos: "cancelar|id|dia", "mover|id|dia|nuevo-dia|hora|hora-fin",
// "tarea|id|nueva-fecha". Si algo no cuadra, null.
export function leerCambioAceptado(valor: unknown): CambioAceptado | null {
  if (typeof valor !== "string") return null;
  const [tipo, id, a, b, c, d] = valor.split("|");
  if (!id || !UUID.test(id)) return null;
  if (tipo === "cancelar" && esFecha(a ?? ""))
    return { tipo: "cancelar", eventoId: id, dia: a };
  if (tipo === "tarea" && esFecha(a ?? ""))
    return { tipo: "tarea", id, fecha: a };
  if (tipo === "mover" && esFecha(a ?? "")) {
    const r = prepararCambioDia({
      new_date: b,
      new_start_time: c,
      new_end_time: d,
    });
    return r.ok
      ? { tipo: "mover", eventoId: id, dia: a, cambio: r.valor }
      : null;
  }
  return null;
}
