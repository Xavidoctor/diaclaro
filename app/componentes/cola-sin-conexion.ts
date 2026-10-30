"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { enviarPendiente } from "@/app/bandeja/actions";
import {
  CLAVE_COLA,
  anadirACola,
  leerCola,
  quitarDeCola,
  type Pendiente,
} from "@/lib/planner/cola-sin-conexion";

// Guarda en el móvil lo que capturas sin conexión y lo envía cuando vuelve la red.
// Usa localStorage: si el navegador no lo permite (modo privado), simplemente no guarda.

const EVENTO = "diaclaro:cola-cambiada";

function leerGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_COLA);
  } catch {
    return null;
  }
}

function guardar(cola: Pendiente[]) {
  try {
    if (cola.length === 0) localStorage.removeItem(CLAVE_COLA);
    else localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
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

// Evita enviar la misma cola dos veces a la vez.
let enviando = false;

async function enviarTodo(): Promise<boolean> {
  if (enviando || !navigator.onLine) return false;
  enviando = true;
  let alguno = false;
  try {
    for (const pendiente of leerCola(leerGuardado())) {
      const ok = await enviarPendiente({
        texto: pendiente.texto,
        destino: pendiente.destino,
      }).catch(() => false);
      if (!ok) break; // sigue sin red: se reintentará más tarde
      guardar(quitarDeCola(leerCola(leerGuardado()), pendiente.id));
      alguno = true;
    }
  } finally {
    enviando = false;
  }
  return alguno;
}

export function useColaSinConexion() {
  const router = useRouter();
  const guardado = useSyncExternalStore(suscribir, leerGuardado, () => null);
  const pendientes = leerCola(guardado).length;

  // Al abrir la app y cada vez que vuelve la conexión, envía lo pendiente.
  useEffect(() => {
    const intentar = () => {
      enviarTodo().then((alguno) => {
        if (alguno) router.refresh();
      });
    };
    intentar();
    window.addEventListener("online", intentar);
    return () => window.removeEventListener("online", intentar);
  }, [router]);

  const encolar = useCallback((texto: string, destino: "nota" | "tarea") => {
    guardar(
      anadirACola(leerCola(leerGuardado()), {
        id: crypto.randomUUID(),
        texto,
        destino,
        creado: new Date().toISOString(),
      }),
    );
  }, []);

  return { pendientes, encolar };
}
