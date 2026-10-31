"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { enviarCambio } from "@/app/componentes/acciones-sin-conexion";
import {
  CLAVE_CAMBIOS,
  CLAVE_REVISAR,
  CLAVE_ULTIMA_CONEXION,
  anadirCambio,
  leerCambios,
  leerRevisiones,
  type Cambio,
  type Revision,
} from "@/lib/planner/cambios-sin-conexion";

// Guarda en el móvil los cambios hechos sin internet y los envía al volver
// la red (las reglas están en lib/planner/cambios-sin-conexion.ts).
// Usa localStorage: si el navegador no lo permite (modo privado), no guarda.

const EVENTO = "diaclaro:cambios-cambiados";

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, lista: unknown[]) {
  try {
    if (lista.length === 0) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(lista));
  } catch {
    // Sin permiso para guardar: no hay nada más que hacer.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar); // cambios desde otra pestaña
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

// Apunta «ahora tengo internet». Sirve para saber, al enviar un cambio, si
// otro aparato tocó lo mismo mientras este estaba sin red.
function apuntarConexion() {
  if (!navigator.onLine) return;
  try {
    localStorage.setItem(CLAVE_ULTIMA_CONEXION, new Date().toISOString());
  } catch {}
}

type NuevoCambio = Cambio extends infer C
  ? C extends Cambio
    ? Omit<C, "id" | "creado" | "vista">
    : never
  : never;

export function guardarCambio(nuevo: NuevoCambio) {
  const ahora = new Date().toISOString();
  const cambio = {
    ...nuevo,
    id: crypto.randomUUID(),
    creado: ahora,
    vista: leer(CLAVE_ULTIMA_CONEXION) ?? ahora,
  } as Cambio;
  escribir(CLAVE_CAMBIOS, anadirCambio(leerCambios(leer(CLAVE_CAMBIOS)), cambio));
}

// Intenta hacerlo con internet; si no hay red (o se corta), lo guarda para
// después. Devuelve «guardado» si se ha quedado esperando en el móvil.
export async function intentarOGuardar(
  conRed: () => Promise<unknown>,
  cambio: NuevoCambio,
): Promise<"enviado" | "guardado"> {
  if (navigator.onLine) {
    try {
      await conRed();
      return "enviado";
    } catch (e) {
      // Si hay red y aun así falla, es otro problema: que lo vea la app.
      if (navigator.onLine && !(e instanceof TypeError)) throw e;
    }
  }
  guardarCambio(cambio);
  return "guardado";
}

// Si DíaClaro tiene permiso para avisos, también avisa con una notificación.
async function avisarRevisar(cuantos: number) {
  try {
    if (Notification.permission !== "granted") return;
    const registro = await navigator.serviceWorker.ready;
    await registro.showNotification("DíaClaro: revisa un cambio", {
      body:
        cuantos === 1
          ? "Un cambio que hiciste sin internet no se ha podido guardar."
          : `${cuantos} cambios que hiciste sin internet no se han podido guardar.`,
      tag: "diaclaro-revisar",
      icon: "/icons/icon-192.png",
      data: { url: "/?revisar=1" },
    });
  } catch {}
}

let enviando = false;

// Envía los cambios en orden. Si uno falla por la red, para y reintenta
// más tarde. Si se cambió en otro aparato o se borró, va a «Revisa».
async function enviarTodo(): Promise<boolean> {
  if (enviando || !navigator.onLine) return false;
  enviando = true;
  let alguno = false;
  let paraRevisar = 0;
  try {
    for (const cambio of leerCambios(leer(CLAVE_CAMBIOS))) {
      const r = await enviarCambio(cambio).catch(() => ({ estado: "error" as const }));
      if (r.estado === "error") break;
      if (r.estado !== "ok") {
        const revision: Revision = {
          cambio,
          motivo: r.estado,
          ...(r.estado === "cambiado" ? { ahora: r.ahora } : {}),
        };
        escribir(CLAVE_REVISAR, [...leerRevisiones(leer(CLAVE_REVISAR)), revision]);
        paraRevisar++;
      }
      escribir(
        CLAVE_CAMBIOS,
        leerCambios(leer(CLAVE_CAMBIOS)).filter((c) => c.id !== cambio.id),
      );
      alguno = true;
    }
  } finally {
    enviando = false;
  }
  if (paraRevisar > 0) avisarRevisar(paraRevisar);
  return alguno;
}

// «Guardar el mío»: lo envía aunque se cambiara en otro aparato.
// «Dejar lo que hay»: lo olvida.
export async function resolverRevision(id: string, guardarElMio: boolean) {
  const revision = leerRevisiones(leer(CLAVE_REVISAR)).find((r) => r.cambio.id === id);
  if (!revision) return true;
  if (guardarElMio && revision.motivo === "cambiado") {
    const r = await enviarCambio(revision.cambio, true).catch(() => null);
    if (!r || r.estado === "error") return false;
  }
  escribir(
    CLAVE_REVISAR,
    leerRevisiones(leer(CLAVE_REVISAR)).filter((r) => r.cambio.id !== id),
  );
  return true;
}

// Lo que está esperando y lo que hay que revisar. Al abrir la app y cada vez
// que vuelve la conexión, envía lo pendiente.
export function useCambiosSinConexion() {
  const router = useRouter();
  const cambios = useSyncExternalStore(suscribir, () => leer(CLAVE_CAMBIOS), () => null);
  const revisar = useSyncExternalStore(suscribir, () => leer(CLAVE_REVISAR), () => null);

  useEffect(() => {
    const intentar = () => {
      apuntarConexion();
      enviarTodo().then((alguno) => {
        if (alguno) router.refresh();
      });
    };
    intentar();
    // Mientras hay red, apunta la hora cada minuto y al salir de la app.
    const reloj = setInterval(apuntarConexion, 60_000);
    const alOcultar = () => {
      if (document.visibilityState === "hidden") apuntarConexion();
    };
    window.addEventListener("online", intentar);
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      clearInterval(reloj);
      window.removeEventListener("online", intentar);
      document.removeEventListener("visibilitychange", alOcultar);
    };
  }, [router]);

  return {
    pendientes: leerCambios(cambios).length,
    revisiones: leerRevisiones(revisar),
  };
}
