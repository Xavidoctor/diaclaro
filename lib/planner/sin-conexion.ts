// Reglas para usar DíaClaro sin internet. Funciones puras, con pruebas en
// sin-conexion.test.ts. Guardar las copias lo hace public/sw.js.

// Pantallas que el móvil guarda solo, aunque hoy no las hayas abierto.
export const PANTALLAS_PRINCIPALES = [
  "/",
  "/agenda",
  "/bandeja",
  "/bandeja?pestana=tareas",
  "/habitos",
  "/areas",
  "/ajustes",
];

export const CADA_CUANTO_GUARDAR_MS = 30 * 60 * 1000; // media hora

// ¿Toca volver a guardar las pantallas principales?
export function tocaGuardar(ultima: number | null, ahora: number): boolean {
  if (ultima === null || !Number.isFinite(ultima)) return true;
  // Si la hora del móvil ha ido hacia atrás, guardamos otra vez.
  return ahora - ultima >= CADA_CUANTO_GUARDAR_MS || ahora < ultima;
}

function hora(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// «de las 09:12», «de ayer a las 21:30» o «del 28/10 a las 18:00».
// Usa la hora del móvil, que es la tuya.
export function deCuandoEsLaCopia(guardada: string | null, ahora: Date): string | null {
  if (!guardada) return null;
  const d = new Date(guardada);
  if (Number.isNaN(d.getTime())) return null;
  if (mismoDia(d, ahora)) return `de las ${hora(d)}`;
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (mismoDia(d, ayer)) return `de ayer a las ${hora(d)}`;
  return `del ${d.getDate()}/${d.getMonth() + 1} a las ${hora(d)}`;
}
