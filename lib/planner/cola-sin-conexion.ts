import { z } from "zod";

// Cola de capturas hechas sin conexión. Se guarda en el móvil (localStorage)
// como texto JSON y se envía al volver la red. Aquí solo están las reglas;
// leer y escribir en el móvil lo hace app/componentes/captura-rapida.tsx.

export const CLAVE_COLA = "diaclaro:capturas-pendientes";

const esquemaPendiente = z.object({
  id: z.string().min(1),
  texto: z.string().min(1),
  destino: z.enum(["nota", "tarea"]),
  creado: z.string(),
});

export type Pendiente = z.infer<typeof esquemaPendiente>;

// Lee la cola guardada. Si el contenido está roto, lo descarta en lugar de fallar.
export function leerCola(json: string | null): Pendiente[] {
  if (!json) return [];
  try {
    const r = z.array(esquemaPendiente).safeParse(JSON.parse(json));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

export function anadirACola(cola: Pendiente[], nuevo: Pendiente): Pendiente[] {
  return [...cola, nuevo];
}

export function quitarDeCola(cola: Pendiente[], id: string): Pendiente[] {
  return cola.filter((p) => p.id !== id);
}
