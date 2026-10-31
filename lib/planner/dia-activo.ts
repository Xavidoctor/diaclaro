import { MEDIODIA } from "./dormir";
import { sumarDias } from "./fechas";

// Qué "día" es ahora en la app. Funciones puras, con pruebas en dia-activo.test.ts.
//
// El día no cambia a medianoche: empieza cuando pulsas «Despierto» o
// «Levantado» y termina cuando pulsas «Me voy a dormir». Así, si te acuestas
// a las 2 de la mañana, lo que haces a la 1 sigue contando en tu día.
//
// Por si se te olvida cerrar, el día de ayer acaba solo a las 12:00 del
// mediodía (la misma frontera que usa «Me voy a dormir»).

export type DatosDelDia = {
  calendario: string; // la fecha del reloj, "2026-10-31"
  hora: string; // la hora del reloj, "01:30"
  abiertoHoy: boolean; // pulsaste «Despierto» o «Levantado» en la fecha del reloj
  abiertoAyer: boolean; // lo pulsaste el día anterior
  dormirAyer: string | null; // hora de «Me voy a dormir» de la noche de ayer
  dormirHoy: string | null; // hora de «Me voy a dormir» de la noche de hoy
};

// normal: el día del reloj.
// trasnoche: pasada la medianoche, pero aún no has cerrado el día de ayer.
// cerrado: has pulsado «Me voy a dormir» antes de medianoche; ya toca mañana.
export type ModoDelDia = "normal" | "trasnoche" | "cerrado";

export type DiaActivo = { dia: string; modo: ModoDelDia };

// ¿Ya ha llegado la hora de acostarte de la noche `noche`?
// Una hora antes de las 12:00 es de madrugada: del día siguiente a esa noche.
export function yaTeAcostaste(
  noche: string,
  horaDormir: string,
  calendario: string,
  hora: string,
): boolean {
  const fecha = horaDormir < MEDIODIA ? sumarDias(noche, 1) : noche;
  return `${calendario} ${hora}` >= `${fecha} ${horaDormir}`;
}

export function diaActivo(d: DatosDelDia): DiaActivo {
  const ayer = sumarDias(d.calendario, -1);

  // Ya te has ido a dormir esta noche (antes de medianoche): toca mañana.
  if (
    d.dormirHoy !== null &&
    d.dormirHoy >= MEDIODIA &&
    yaTeAcostaste(d.calendario, d.dormirHoy, d.calendario, d.hora)
  )
    return { dia: sumarDias(d.calendario, 1), modo: "cerrado" };

  // De madrugada, con el día de ayer abierto y sin cerrar: sigue siendo ayer.
  const ayerCerrado =
    d.dormirAyer !== null &&
    yaTeAcostaste(ayer, d.dormirAyer, d.calendario, d.hora);
  if (d.hora < MEDIODIA && !d.abiertoHoy && d.abiertoAyer && !ayerCerrado)
    return { dia: ayer, modo: "trasnoche" };

  return { dia: d.calendario, modo: "normal" };
}

// El día que abren los botones «Despierto» y «Levantado».
// De trasnoche, el día de ayer ya está abierto: los botones abren el del reloj.
export function diaParaAbrir(activo: DiaActivo, calendario: string): string {
  return activo.modo === "trasnoche" ? calendario : activo.dia;
}

// El día que acabas de vivir: el que repasas en el cierre del día.
export function diaVivido(activo: DiaActivo): string {
  return activo.modo === "cerrado" ? sumarDias(activo.dia, -1) : activo.dia;
}
