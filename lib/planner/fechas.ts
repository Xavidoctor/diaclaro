import { addDays, format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Ayudas para trabajar con fechas como texto "2026-10-30".
// Guardar los días así evita líos de zonas horarias: un día es un día.

// De momento la app trabaja en la hora de España. Se podrá cambiar en Ajustes.
export const ZONA_HORARIA = "Europe/Madrid";

// El día de hoy en la zona horaria indicada, como "2026-10-30".
// (El servidor de Vercel está en otra zona, así que no vale con new Date()).
export function hoyEn(zona: string = ZONA_HORARIA, ahora = new Date()): string {
  // El formato "en-CA" escribe las fechas como 2026-10-30.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
  return format(addDays(parseISO(fecha), dias), "yyyy-MM-dd");
}

// Lista de días seguidos: diasDesde("2026-10-30", 3) → 30, 31 y 1.
export function diasDesde(fecha: string, cuantos: number): string[] {
  return Array.from({ length: cuantos }, (_, i) => sumarDias(fecha, i));
}

// "jueves 30 de octubre"
export function nombreDia(fecha: string): string {
  return format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es });
}

// "30 oct."
export function fechaCorta(fecha: string): string {
  return format(parseISO(fecha), "d MMM", { locale: es });
}

// Comprueba que el texto es una fecha real con la forma 2026-10-30.
export function esFecha(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = parseISO(valor);
  return isValid(fecha) && format(fecha, "yyyy-MM-dd") === valor;
}
