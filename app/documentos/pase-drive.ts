import "server-only";
import { leerConexionGoogle } from "@/lib/data/google";
import {
  googleDisponible,
  pedirAccesoDrive,
  secretoGoogle,
} from "@/lib/google/api";
import { descifrar } from "@/lib/google/cifrado";

// Consigue un pase de una hora para tu Drive (solo "drive.file").
// Lo usan la pantalla de documentos importantes y el «Compartir» del móvil.

export type PaseDrive =
  | { ok: true; token: string }
  | {
      ok: false;
      motivo: "no-disponible" | "sin-drive" | "permiso-retirado" | "fallo";
    };

export async function paseDrive(): Promise<PaseDrive> {
  if (!googleDisponible()) return { ok: false, motivo: "no-disponible" };
  const conexion = await leerConexionGoogle().catch((error) => {
    console.error(error);
    return null;
  });
  if (!conexion?.drive) return { ok: false, motivo: "sin-drive" };
  const permiso = descifrar(conexion.refresh_token_cifrado, secretoGoogle());
  if (!permiso) return { ok: false, motivo: "permiso-retirado" };
  return pedirAccesoDrive(permiso);
}
