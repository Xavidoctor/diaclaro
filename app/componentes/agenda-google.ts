import "server-only";
import { leerConexionGoogle } from "@/lib/data/google";
import { googleDisponible, leerEventos, secretoGoogle } from "@/lib/google/api";
import { descifrar } from "@/lib/google/cifrado";
import type { Ocurrencia } from "@/lib/planner/agenda";
import { sumarDias } from "@/lib/planner/fechas";
import { ocurrenciasDeGoogle } from "@/lib/planner/google-calendar";

// Junta lo necesario para enseñar tu Google Calendar entre dos días.
// Si algo falla, la página sigue funcionando con tu agenda de DíaClaro.

export type EstadoGoogle =
  | "no-disponible" // la app aún no tiene las claves de Google
  | "sin-conectar"
  | "conectado"
  | "permiso-retirado"
  | "fallo";

export async function cargarAgendaGoogle(
  desde: string,
  hasta: string,
  zona: string,
): Promise<{ estado: EstadoGoogle; ocurrencias: Ocurrencia[] }> {
  if (!googleDisponible()) return { estado: "no-disponible", ocurrencias: [] };

  let conexion;
  try {
    conexion = await leerConexionGoogle();
  } catch (error) {
    // Por ejemplo, si aún no se ha creado la tabla en Supabase.
    console.error(error);
    return { estado: "no-disponible", ocurrencias: [] };
  }
  if (!conexion) return { estado: "sin-conectar", ocurrencias: [] };

  const permiso = descifrar(conexion.refresh_token_cifrado, secretoGoogle());
  if (!permiso) return { estado: "permiso-retirado", ocurrencias: [] };

  // Se pide a Google un día de margen por cada lado y luego se recorta
  // con tu zona horaria (así no hace falta calcular la medianoche aquí).
  const lectura = await leerEventos(
    permiso,
    new Date(`${sumarDias(desde, -1)}T00:00:00Z`),
    new Date(`${sumarDias(hasta, 2)}T00:00:00Z`),
  );
  if (!lectura.ok) return { estado: lectura.motivo, ocurrencias: [] };
  return {
    estado: "conectado",
    ocurrencias: ocurrenciasDeGoogle(lectura.eventos, zona, desde, hasta),
  };
}
