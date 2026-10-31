import type { Ocurrencia } from "./agenda";
import { PASO_MINUTOS } from "./mover-dia";
import { vecesDeRutina, type RegistroRutina, type Rutina } from "./rutinas";

// El día por horas de la Agenda: cada cosa es un cuadro, alto según lo que
// dura, colocado a su hora. Funciones puras, con pruebas en dia-por-horas.test.ts.

// Alto de una hora en la pantalla. 16 px son 15 minutos: lo mismo que
// mueve el dedo un paso (PX_POR_PASO en mover-dia.ts).
export const PX_POR_HORA = 64;
// Lo más bajito que se dibuja un cuadro, para que se pueda leer y pulsar.
// Es solo dibujo: la app no se inventa cuánto dura algo sin hora de fin.
export const ALTO_MINIMO_PX = 44;
// A cuántos minutos se pega al final (o al principio) de otra cosa.
export const IMAN_MINUTOS = 10;

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function aHora(minutos: number): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

// Cuánto dura algo en minutos, o null si no tiene hora de fin.
export function duracion(o: Pick<Ocurrencia, "horaInicio" | "horaFin">) {
  if (!o.horaInicio || !o.horaFin) return null;
  const d = aMinutos(o.horaFin) - aMinutos(o.horaInicio);
  return d > 0 ? d : null;
}

// ---- Las horas que se ven ----

// De la hora en punto antes de lo primero a la hora en punto después de lo
// último. Si no hay nada con hora, de 8:00 a 20:00 (solo para dibujar).
export function rangoDelDia(ocurrencias: Ocurrencia[]): {
  desde: number;
  hasta: number;
} {
  const conHora = ocurrencias.filter((o) => o.horaInicio);
  if (conHora.length === 0) return { desde: 8 * 60, hasta: 20 * 60 };
  const inicios = conHora.map((o) => aMinutos(o.horaInicio!));
  const finales = conHora.map((o) =>
    o.horaFin ? aMinutos(o.horaFin) : aMinutos(o.horaInicio!) + 30,
  );
  const desde = Math.floor(Math.min(...inicios) / 60) * 60;
  const hasta = Math.min(24 * 60, Math.ceil(Math.max(...finales) / 60) * 60);
  return { desde, hasta: Math.max(hasta, desde + 60) };
}

// ---- Cuadros que se juntan, uno al lado del otro ----

export type Colocado<T> = {
  o: T;
  inicio: number; // minutos desde las 00:00
  fin: number; // para dibujar (con un mínimo si no tiene fin)
  columna: number;
  columnas: number; // cuántas columnas tiene su grupo
};

// Si dos cosas se juntan (como dos clases a la misma hora), van una al
// lado de la otra. Cada grupo de cosas que se pisan comparte columnas.
export function colocar<T extends Ocurrencia>(
  ocurrencias: T[],
  minimoMinutos = 30,
): Colocado<T>[] {
  const lista = ocurrencias
    .filter((o) => o.horaInicio)
    .map((o) => {
      const inicio = aMinutos(o.horaInicio!);
      const d = duracion(o);
      return { o, inicio, fin: inicio + Math.max(d ?? 0, minimoMinutos) };
    })
    .sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);

  const resultado: Colocado<T>[] = [];
  let grupo: Colocado<T>[] = [];
  let finGrupo = -1;
  const cerrar = () => {
    const columnas = Math.max(1, ...grupo.map((c) => c.columna + 1));
    for (const c of grupo) resultado.push({ ...c, columnas });
    grupo = [];
  };
  for (const item of lista) {
    if (grupo.length > 0 && item.inicio >= finGrupo) cerrar();
    // La primera columna que ya está libre a esa hora.
    let columna = 0;
    while (grupo.some((c) => c.columna === columna && c.fin > item.inicio))
      columna++;
    grupo.push({ ...item, columna, columnas: 1 });
    finGrupo = Math.max(finGrupo, item.fin);
  }
  if (grupo.length > 0) cerrar();
  return resultado;
}

// ---- El imán: encajar justo después de lo anterior ----

// Al soltar un cuadro cerca del final de otro, empieza justo cuando el otro
// acaba. Y si su final queda cerca del principio de otro, acaba justo antes.
// Si no hay nada cerca, se queda en su paso de 15 minutos.
export function encajar(
  inicio: number,
  minutos: number | null,
  otros: { inicio: number; fin: number | null }[],
  margen = IMAN_MINUTOS,
): number {
  let mejor: number | null = null;
  let distancia = margen + 1;
  const probar = (candidato: number) => {
    const d = Math.abs(candidato - inicio);
    if (d < distancia && candidato >= 0 && candidato < 24 * 60) {
      mejor = candidato;
      distancia = d;
    }
  };
  for (const o of otros) {
    if (o.fin !== null) probar(o.fin); // empieza cuando el otro acaba
    if (minutos) probar(o.inicio - minutos); // acaba cuando el otro empieza
  }
  const puesto = mejor ?? Math.round(inicio / PASO_MINUTOS) * PASO_MINUTOS;
  return sinPisar(puesto, minutos, otros);
}

// Si al soltarlo queda encima de otra cosa, se pega justo antes o justo
// después (lo que quede más cerca y no pise nada). Si no hay sitio cerca
// (a más de SEPARAR_MAX minutos), se queda encima: a veces no hay otra.
export const SEPARAR_MAX = 60;

function sinPisar(
  inicio: number,
  minutos: number | null,
  otros: { inicio: number; fin: number | null }[],
): number {
  const dura = minutos ?? PASO_MINUTOS;
  const pisa = (desde: number) =>
    otros.some(
      (o) => o.fin !== null && desde < o.fin && o.inicio < desde + dura,
    );
  if (!pisa(inicio)) return inicio;
  const candidatos = otros
    .flatMap((o) => (o.fin !== null ? [o.fin, o.inicio - dura] : []))
    .filter((c) => c >= 0 && c + dura <= 24 * 60 && !pisa(c))
    .sort((a, b) => Math.abs(a - inicio) - Math.abs(b - inicio));
  const cerca = candidatos[0];
  return cerca !== undefined && Math.abs(cerca - inicio) <= SEPARAR_MAX
    ? cerca
    : inicio;
}

// ---- Clases grabadas ----

// Ese día, una clase grabada que se junta con algo fijo que NO está
// grabado (otra clase, el trabajo, un compromiso) se queda para otro
// momento: se puede mover y no cuenta como choque. Si dos grabadas se juntan
// solo entre ellas, va a su hora la primera y la otra se deja para otro momento.
// Si ya la moviste ese día, se queda donde la pusiste.
export function marcarGrabadas(ocurrencias: Ocurrencia[]): Ocurrencia[] {
  const tramo = (o: Ocurrencia) => {
    const inicio = aMinutos(o.horaInicio!);
    return { inicio, fin: o.horaFin ? aMinutos(o.horaFin) : inicio + 1 };
  };
  const sePisan = (a: Ocurrencia, b: Ocurrencia) => {
    const x = tramo(a);
    const y = tramo(b);
    return x.inicio < y.fin && y.inicio < x.fin;
  };
  const conHora = ocurrencias.filter((o) => o.horaInicio && !o.google?.libre);
  // Lo que no se mueve y no está grabado: a eso vas sí o sí.
  const fijo = conHora.filter(
    (o) => !o.bloque || (o.bloque.fija && !o.bloque.grabada),
  );
  const grabadas = conHora
    .filter((o) => o.bloque?.grabada && o.bloque.fija && !o.cambiada)
    .sort((a, b) => aMinutos(a.horaInicio!) - aMinutos(b.horaInicio!));
  // Las grabadas que ya moviste ese día: están donde tú las pusiste y se
  // pueden seguir moviendo.
  const aOtraHora = new Set<Ocurrencia>(
    conHora.filter((o) => o.bloque?.grabada && o.bloque.fija && o.cambiada),
  );
  const quedan: Ocurrencia[] = [];
  for (const g of grabadas) {
    if (fijo.some((f) => sePisan(f, g)) || quedan.some((q) => sePisan(q, g)))
      aOtraHora.add(g);
    else quedan.push(g);
  }
  return ocurrencias.map((o) =>
    aOtraHora.has(o) ? { ...o, bloque: { ...o.bloque!, aOtraHora: true } } : o,
  );
}

// ---- Terminar antes ----

// ¿Está pasando ahora? (hoy, con hora de inicio ya pasada y fin por llegar).
// Solo lo que tiene hora de fin: si no la tiene, no hay nada que acortar.
export function estaPasando(
  o: Pick<Ocurrencia, "horaInicio" | "horaFin">,
  ahora: string,
): boolean {
  if (!o.horaInicio || !o.horaFin) return false;
  const a = aMinutos(ahora);
  return aMinutos(o.horaInicio) <= a && a < aMinutos(o.horaFin);
}

// La hora a la que se apunta que acabó: ahora, redondeado a 5 minutos hacia
// abajo, pero siempre al menos 5 minutos después de empezar.
export function horaDeTerminar(inicio: string, ahora: string): string {
  const a = Math.floor(aMinutos(ahora) / 5) * 5;
  return aHora(Math.max(a, aMinutos(inicio) + 5));
}

// Lo siguiente que se puede adelantar: lo primero que se puede mover y
// que empieza después de `desde` (ese mismo día).
export function siguienteParaAdelantar(
  ocurrencias: Ocurrencia[],
  desde: string,
  sePuedeMover: (o: Ocurrencia) => boolean,
): Ocurrencia | null {
  const d = aMinutos(desde);
  return (
    ocurrencias
      .filter(
        (o) =>
          o.horaInicio &&
          sePuedeMover(o) &&
          !o.bloque?.hecha &&
          aMinutos(o.horaInicio) > d,
      )
      .sort((a, b) => aMinutos(a.horaInicio!) - aMinutos(b.horaInicio!))[0] ??
    null
  );
}

// ---- Hecho / por hacer ----

// Marca como hechas las rutinas de ese día que ya apuntaste (cada vez por
// separado, si se hace varias veces). Las tareas ya traen si están hechas.
export function conRutinasHechas(
  ocurrencias: Ocurrencia[],
  rutinas: Pick<Rutina, "id" | "times_per_day" | "times_of_day">[],
  registros: RegistroRutina[],
  fecha: string,
): Ocurrencia[] {
  const porId = new Map(rutinas.map((r) => [r.id, r]));
  return ocurrencias.map((o) => {
    if (o.bloque?.tipo !== "rutina" || o.fecha !== fecha) return o;
    const rutina = porId.get(o.bloque.id);
    if (!rutina) return o;
    const vez = vecesDeRutina(rutina, registros, fecha)[
      (o.bloque.vez ?? 1) - 1
    ];
    return vez?.hecha ? { ...o, bloque: { ...o.bloque, hecha: true } } : o;
  });
}

// Cuántas cosas tuyas (tareas y rutinas) hay ese día y cuántas están hechas.
export function cuentaHechas(ocurrencias: Ocurrencia[]): {
  hechas: number;
  total: number;
} {
  const tuyas = ocurrencias.filter((o) => o.bloque);
  return {
    hechas: tuyas.filter((o) => o.bloque!.hecha).length,
    total: tuyas.length,
  };
}
