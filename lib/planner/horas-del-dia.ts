import type { Ocurrencia } from "./agenda";
import { CASI_LLENO, HORAS_SUENO } from "./horas-libres";

// Las horas de un día: cuántas tienes despierto, cuántas ya tienes ocupadas
// y cuántas te quedan libres. Funciones puras, con pruebas en
// horas-del-dia.test.ts. Las usan la tarjeta de Hoy y la caja del día de
// la Agenda. La semana de Áreas está en horas-libres.ts, con las mismas
// 9 h de sueño y el mismo 80 %.
//
// Reglas (las pidió Xavi):
//   - Un día cualquiera tiene 24 h menos las horas de dormir (9 h → 15 h).
//   - Hoy cuenta desde que te levantas hasta tu hora de acostarte, y lo
//     que ya ha pasado no cuenta: a las 14:00 te quedan 2 h menos que a las 12:00.
//   - No se restan descansos fijos: si el día pasa del 80 % lleno, la app
//     te avisa en suave para que dejes hueco para comer y descansar.


const DIA = 24 * 60;

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export type EntradaHorasDelDia = {
  // Solo hoy: la hora de ahora ("14:05"). Los demás días, null.
  ahora: string | null;
  // Cuándo te has despertado (o tu hora de siempre). null = no se sabe.
  despertar: string | null;
  // Tu hora de acostarte. null = despertar + (24 − horas de dormir).
  acostarse: string | null;
  // Minutos que ya tienes ocupados (de lo que queda, si es hoy).
  ocupado: number;
  horasSueno?: number; // de «Sueño» en Áreas (9 si no lo cambias)
};

export type HorasDelDia = {
  total: number; // minutos despierto de todo el día
  quedan: number; // minutos despierto que quedan (hoy) o todos (otro día)
  pasado: number; // minutos que ya han pasado desde que te despertaste
  ocupado: number;
  libre: number; // quedan − ocupado (nunca negativo)
  exceso: number; // lo que te pasas si hay más ocupado que tiempo
  lleno: boolean; // más del 80 % de lo que queda está ocupado
  calculadoConSueno: boolean; // sin hora de acostarte: se usan las horas de dormir
};

export function horasDelDia(entrada: EntradaHorasDelDia): HorasDelDia {
  const sueno = entrada.horasSueno ?? HORAS_SUENO;
  const despierto = Math.max(0, Math.round((24 - sueno) * 60));
  const { ahora, ocupado } = entrada;

  let total = despierto;
  let quedan = despierto;
  let calculadoConSueno = true;

  if (ahora) {
    const actual = aMinutos(ahora);
    // Si no sabes cuándo te has despertado, el día cuenta desde ahora.
    const inicio = entrada.despertar ? aMinutos(entrada.despertar) : actual;
    let fin = inicio + despierto;
    if (entrada.acostarse) {
      calculadoConSueno = false;
      fin = aMinutos(entrada.acostarse);
      // Acostarse a la 01:00 es la noche de este día.
      if (fin <= inicio) fin += DIA;
    }
    let a = actual;
    // Pasada la medianoche pero antes de acostarte: sigue siendo tu día.
    if (a < inicio && a + DIA <= fin) a += DIA;
    total = fin - inicio;
    quedan = Math.max(0, fin - Math.max(a, inicio));
  }

  return {
    total,
    quedan,
    pasado: total - quedan,
    ocupado,
    libre: Math.max(0, quedan - ocupado),
    exceso: Math.max(0, ocupado - quedan),
    lleno: ocupado > 0 && ocupado * 100 >= quedan * CASI_LLENO,
    calculadoConSueno,
  };
}

// Minutos ocupados de un día de la Agenda: lo que tiene hora de inicio y
// de fin (sin contar dos veces lo que se junta), más las tareas sin hora que
// tienen minutos. Lo hecho no cuenta. Lo de Google marcado como «Disponible»
// tampoco. Si es hoy, solo cuenta lo que queda desde ahora.
export function minutosOcupados(
  ocurrencias: Ocurrencia[],
  ahora: string | null,
  minutosSinHora = 0,
): number {
  const desde = ahora ? aMinutos(ahora) : 0;
  const tramos = ocurrencias
    .filter((o) => o.horaInicio && o.horaFin && !o.google?.libre)
    .filter((o) => !o.bloque?.hecha)
    .map((o) => {
      const inicio = aMinutos(o.horaInicio!);
      let fin = aMinutos(o.horaFin!);
      if (fin <= inicio) fin = inicio; // sin duración clara: no cuenta
      return { inicio: Math.max(inicio, desde), fin };
    })
    .filter((t) => t.fin > t.inicio)
    .sort((x, y) => x.inicio - y.inicio);

  let total = 0;
  let hasta = -1;
  for (const t of tramos) {
    const empieza = Math.max(t.inicio, hasta);
    if (t.fin > empieza) total += t.fin - empieza;
    hasta = Math.max(hasta, t.fin);
  }
  return total + minutosSinHora;
}
