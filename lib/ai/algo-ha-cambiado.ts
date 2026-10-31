import type { MensajeIA } from "./groq-tipos";
import { estaEnTexto, sacarJSON } from "./interpretar-texto";
import { diasDesde, esFecha, nombreDia, sumarDias } from "../planner/fechas";
import { aMinutos } from "../planner/carga";
import { sumarMinutosAHora } from "../planner/propuestas";

// Etapa 8 (IA 2, parte 2): «Algo ha cambiado». Funciones puras, con pruebas
// en algo-ha-cambiado.test.ts.
//
// Cuentas qué ha cambiado («me han cancelado la tutoría del martes», «la
// entrega pasa al viernes») y la IA propone cambios concretos en tu agenda y
// tus tareas. Tú aceptas cada uno; nada cambia antes.
// Igual que en «Tu asistente», la IA no puede poner un día o una hora que
// no hayas escrito: si lo intenta, la app quita ese cambio.

export const MAX_TEXTO_CAMBIO = 1000;
export const MAX_CAMBIOS = 8;
const MAX_REFERENCIAS = 60;
const DIAS_CALENDARIO = 21;

// Lo que tienes apuntado y la IA puede tocar (solo títulos y fechas).
export type EventoParaIA = {
  eventoId: string;
  fechaOriginal: string; // el día que tocaba, para guardar el cambio
  titulo: string;
  fecha: string;
  hora: string | null;
  horaFin: string | null;
};
export type TareaParaIA = { id: string; titulo: string; fecha: string | null };

export type Cambio =
  | { tipo: "cancelar-evento"; evento: EventoParaIA }
  | {
      tipo: "mover-evento";
      evento: EventoParaIA;
      nuevaFecha: string;
      nuevaHora: string | null;
      nuevaHoraFin: string | null;
    }
  | { tipo: "mover-tarea"; tarea: TareaParaIA; nuevaFecha: string };

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal en español.
La persona cuenta algo que ha cambiado en sus planes. Propón cambios concretos sobre lo que ya tiene apuntado:
- "cancelar_evento": un evento de su agenda ya no se hace ese día. "ref" es su código (E1, E2...).
- "mover_evento": un evento pasa a otro día y/o a otra hora. "ref" es su código.
- "mover_tarea": una tarea cambia de fecha. "ref" es su código (T1, T2...).
Reglas muy importantes:
- Usa SOLO los códigos de las listas. Si lo que cuenta no está en las listas, no propongas nada para eso.
- No inventes fechas ni horas. Para "nueva_fecha" y "nueva_hora" copia en "fecha_texto" y "hora_texto" las palabras EXACTAS del texto donde lo dice ("al viernes", "a las 6").
- Para pasar días de la semana a fechas usa SOLO el calendario que te doy.
- Como mucho ${MAX_CAMBIOS} cambios.
Responde SOLO con un objeto JSON con esta forma:
{"cambios":[{"accion":"mover_evento","ref":"E1","nueva_fecha":null,"fecha_texto":null,"nueva_hora":null,"hora_texto":null}]}`;

export function mensajesAlgoHaCambiado(d: {
  texto: string;
  hoy: string;
  eventos: EventoParaIA[];
  tareas: TareaParaIA[];
}): MensajeIA[] {
  const calendario = diasDesde(d.hoy, DIAS_CALENDARIO)
    .map((dia, i) => `${dia} = ${nombreDia(dia)}${i === 0 ? " (hoy)" : ""}`)
    .join("\n");
  const eventos = d.eventos
    .slice(0, MAX_REFERENCIAS)
    .map(
      (e, i) =>
        `E${i + 1}: ${e.titulo}, ${nombreDia(e.fecha)}${e.hora ? ` a las ${e.hora}` : ""}`,
    )
    .join("\n");
  const tareas = d.tareas
    .slice(0, MAX_REFERENCIAS)
    .map(
      (t, i) =>
        `T${i + 1}: ${t.titulo}${t.fecha ? `, para el ${nombreDia(t.fecha)}` : ", sin fecha"}`,
    )
    .join("\n");
  return [
    { role: "system", content: INSTRUCCIONES },
    {
      role: "user",
      content: [
        `Calendario:\n${calendario}`,
        `Agenda de las próximas semanas:\n${eventos || "(nada)"}`,
        `Tareas pendientes:\n${tareas || "(ninguna)"}`,
        `Lo que ha cambiado:\n"""${d.texto.slice(0, MAX_TEXTO_CAMBIO)}"""`,
      ].join("\n\n"),
    },
  ];
}

const HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Convierte la respuesta de la IA en cambios revisados por la app.
// Devuelve null si la respuesta no se entiende. Los cambios con códigos que
// no existen, o con días u horas que no están en tu texto, se descartan.
export function leerCambios(
  respuesta: string,
  d: {
    texto: string;
    hoy: string;
    eventos: EventoParaIA[];
    tareas: TareaParaIA[];
  },
): { cambios: Cambio[]; descartados: number } | null {
  const datos = sacarJSON(respuesta) as { cambios?: unknown } | null;
  if (!datos || !Array.isArray(datos.cambios)) return null;

  const eventos = d.eventos.slice(0, MAX_REFERENCIAS);
  const tareas = d.tareas.slice(0, MAX_REFERENCIAS);
  const limite = sumarDias(d.hoy, 366);
  const cambios: Cambio[] = [];
  const vistos = new Set<string>();
  let descartados = 0;

  // Un día nuevo solo vale si está en tu texto y es de hoy en adelante.
  const fechaValida = (fecha: string | null, trozo: string | null) =>
    fecha !== null &&
    esFecha(fecha) &&
    fecha >= d.hoy &&
    fecha <= limite &&
    estaEnTexto(trozo, d.texto);

  for (const bruto of datos.cambios.slice(0, MAX_CAMBIOS)) {
    const c = (bruto ?? {}) as Record<string, unknown>;
    const ref = texto(c.ref)?.toUpperCase() ?? "";
    const n = Number(ref.slice(1)) - 1;
    const evento = ref.startsWith("E") ? eventos[n] : undefined;
    const tarea = ref.startsWith("T") ? tareas[n] : undefined;
    const fecha = texto(c.nueva_fecha);
    const fechaTexto = texto(c.fecha_texto);
    const horaBruta = texto(c.nueva_hora);
    const horaTexto = texto(c.hora_texto);
    let cambio: Cambio | null = null;

    if (c.accion === "cancelar_evento" && evento) {
      cambio = { tipo: "cancelar-evento", evento };
    } else if (c.accion === "mover_evento" && evento) {
      const m = horaBruta ? HORA.exec(horaBruta) : null;
      const hora =
        m &&
        horaTexto &&
        /\d/.test(horaTexto) &&
        estaEnTexto(horaTexto, d.texto)
          ? `${m[1].padStart(2, "0")}:${m[2]}`
          : null;
      const nuevaFecha = fechaValida(fecha, fechaTexto) ? fecha! : null;
      // Si solo cambia la hora, se queda el mismo día.
      if (nuevaFecha || hora) {
        const nuevaHora = hora ?? evento.hora;
        cambio = {
          tipo: "mover-evento",
          evento,
          nuevaFecha: nuevaFecha ?? evento.fecha,
          nuevaHora,
          nuevaHoraFin: horaFinNueva(evento, nuevaHora),
        };
      }
    } else if (c.accion === "mover_tarea" && tarea) {
      if (fechaValida(fecha, fechaTexto))
        cambio = { tipo: "mover-tarea", tarea, nuevaFecha: fecha! };
    }

    if (!cambio) {
      descartados++;
      continue;
    }
    const clave = valorCambio(cambio);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    cambios.push(cambio);
  }
  return { cambios, descartados };
}

// Si cambia la hora, el evento dura lo mismo que antes.
function horaFinNueva(e: EventoParaIA, nuevaHora: string | null) {
  if (!nuevaHora || !e.hora || !e.horaFin) return null;
  if (nuevaHora === e.hora) return e.horaFin;
  return sumarMinutosAHora(nuevaHora, aMinutos(e.horaFin) - aMinutos(e.hora));
}

// Lo que viaja en el botón «Aceptar» de cada cambio:
// "cancelar|id-evento|2026-11-03", "mover|id-evento|2026-11-03|2026-11-04|18:00|19:00"
// o "tarea|id-tarea|2026-11-06".
export function valorCambio(c: Cambio): string {
  if (c.tipo === "cancelar-evento")
    return `cancelar|${c.evento.eventoId}|${c.evento.fechaOriginal}`;
  if (c.tipo === "mover-evento")
    return `mover|${c.evento.eventoId}|${c.evento.fechaOriginal}|${c.nuevaFecha}|${c.nuevaHora ?? ""}|${c.nuevaHoraFin ?? ""}`;
  return `tarea|${c.tarea.id}|${c.nuevaFecha}`;
}

// Cómo se lee cada cambio en la pantalla.
export function textoCambio(c: Cambio): string {
  const cuando = (fecha: string, hora: string | null) =>
    `${nombreDia(fecha)}${hora ? ` a las ${hora}` : ""}`;
  if (c.tipo === "cancelar-evento")
    return `Cancelar «${c.evento.titulo}» del ${cuando(c.evento.fecha, c.evento.hora)}`;
  if (c.tipo === "mover-evento")
    return `Mover «${c.evento.titulo}» del ${cuando(c.evento.fecha, c.evento.hora)} al ${cuando(c.nuevaFecha, c.nuevaHora)}`;
  return `Pasar «${c.tarea.titulo}» al ${nombreDia(c.nuevaFecha)}`;
}
