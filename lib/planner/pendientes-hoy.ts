import { textoFechaLimite } from "./bandeja";
import { sumarDias } from "./fechas";
import { motivoOrden, NUM_PRIORIDADES, type TareaParaPlan } from "./plan";
import { diaEn } from "./resumen-semana";
import { nombreVez, textoFranja, type FilaRutinaHoy } from "./rutinas";
import { textoDuracion } from "./carga";

// El resumen de «Tu plan de hoy»: todo lo que tienes pendiente hoy en una
// sola lista para ir tachando, con un contador «1/2 pendientes».
// Funciones puras, con pruebas en pendientes-hoy.test.ts.
//
// Entra en la lista:
//   - las tareas del plan (las de hoy y las de otros días), en su orden;
//   - tus rutinas de hoy (una fila por cada vez, si se hacen varias);
//   - las de fecha límite más adelante («En marcha»);
//   - las que no tienen día («Sin día»);
//   - y, tachadas, las tareas que ya has hecho hoy.

export type Pendiente = {
  clave: string; // única en la lista (una rutina puede salir varias veces)
  tipo: "tarea" | "rutina";
  id: string;
  titulo: string;
  detalle: string; // la línea pequeña de debajo
  hecha: boolean;
  previstos: number | null; // minutos que pensabas tardar (solo tareas)
  vez: number | null; // qué vez del día (solo rutinas de varias veces)
};

type TareaDeLista = {
  id: string;
  title: string;
  estimated_minutes: number | null;
};

// Las tareas que marcaste como hechas hoy. «Hoy» es tu día abierto, que
// puede seguir abierto pasada la medianoche: por eso cuenta también lo que
// marcaste de madrugada (el día siguiente en el calendario).
export function tareasHechasHoy<
  T extends { done_at: string | null; due_date: string | null },
>(tareas: T[], hoy: string, zona: string): T[] {
  const manana = sumarDias(hoy, 1);
  return tareas.filter((t) => {
    if (!t.done_at) return false;
    const dia = diaEn(t.done_at, zona);
    return dia === hoy || dia === manana;
  });
}

export function listaDeHoy({
  plan,
  rutinas,
  enMarcha,
  sinDia,
  hechas,
  hoy,
}: {
  plan: (TareaDeLista & TareaParaPlan)[]; // ya en el orden del plan
  rutinas: FilaRutinaHoy[];
  enMarcha: (TareaDeLista & { due_date: string | null })[];
  sinDia: TareaDeLista[];
  hechas: TareaDeLista[];
  hoy: string;
}): Pendiente[] {
  const tarea = (
    t: TareaDeLista,
    detalle: string,
    hecha = false,
  ): Pendiente => ({
    clave: `tarea|${t.id}`,
    tipo: "tarea",
    id: t.id,
    titulo: t.title,
    detalle: conMinutos(detalle, t.estimated_minutes),
    hecha,
    previstos: t.estimated_minutes,
    vez: null,
  });

  const delPlan = plan.map((t, i) =>
    tarea(
      t,
      i < NUM_PRIORIDADES
        ? `Prioridad ${i + 1} · ${motivoOrden(t, hoy)}`
        : motivoOrden(t, hoy),
    ),
  );

  const deRutinas = rutinas.map(
    ({ item, vez, hecha }): Pendiente => ({
      clave: `rutina|${item.rutina.id}|${vez?.numero ?? 0}`,
      tipo: "rutina",
      id: item.rutina.id,
      titulo: item.rutina.title,
      detalle: vez
        ? `Rutina · ${nombreVez(vez.numero)}${vez.hora ? ` · ${vez.hora}` : ""}`
        : `Rutina · ${textoFranja(item.rutina)}`,
      hecha,
      previstos: null,
      vez: vez?.numero ?? null,
    }),
  );

  const lista = [
    ...delPlan,
    ...deRutinas,
    ...enMarcha.map((t) =>
      tarea(t, t.due_date ? textoFechaLimite(t.due_date, hoy) : "En marcha"),
    ),
    ...sinDia.map((t) => tarea(t, "Sin día")),
    ...hechas.map((t) => tarea(t, "Hecha hoy", true)),
  ];
  // Lo pendiente arriba y lo tachado abajo (sin cambiar el orden de cada grupo).
  return [...lista.filter((p) => !p.hecha), ...lista.filter((p) => p.hecha)];
}

// Cuántas te quedan de cuántas: «1/2» = te queda 1 de 2.
export function contarPendientes(lista: Pick<Pendiente, "hecha">[]) {
  return {
    quedan: lista.filter((p) => !p.hecha).length,
    total: lista.length,
  };
}

// El texto del contador.
export function textoContador(quedan: number, total: number): string {
  if (total === 0) return "Nada pendiente";
  if (quedan === 0) return `¡Todo hecho! 0/${total} pendientes`;
  return `${quedan}/${total} pendientes`;
}

function conMinutos(texto: string, minutos: number | null): string {
  return minutos ? `${texto} · ${textoDuracion(minutos)}` : texto;
}
