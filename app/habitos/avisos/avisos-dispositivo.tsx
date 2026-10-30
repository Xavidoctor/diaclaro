"use client";

import { useEffect, useState } from "react";
import {
  activarAvisos,
  desactivarAvisos,
  probarAviso,
} from "@/app/habitos/avisos/actions";
import { deBase64Url } from "@/lib/planner/avisos";

type Estado =
  | "cargando"
  | "sin-soporte" // el navegador no admite avisos
  | "iphone" // en iPhone hay que instalar la app primero
  | "bloqueado" // dijiste que no al permiso
  | "apagado"
  | "activo";

async function registro() {
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }))
  );
}

function esIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

// Activar o quitar los avisos en ESTE móvil u ordenador, y probarlos.
export function AvisosDispositivo({ clave }: { clave: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // setTimeout: el estado se cambia fuera del propio efecto.
      const id = setTimeout(() =>
        setEstado(esIphone() ? "iphone" : "sin-soporte"),
      );
      return () => clearTimeout(id);
    }
    registro()
      .then((r) => r.pushManager.getSubscription())
      .then((sub) => {
        if (Notification.permission === "denied") setEstado("bloqueado");
        else setEstado(sub ? "activo" : "apagado");
      })
      .catch(() => setEstado("sin-soporte"));
  }, []);

  async function activar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const r = await registro();
      const sub =
        (await r.pushManager.getSubscription()) ??
        (await r.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: deBase64Url(clave),
        }));
      const res = await activarAvisos(sub.toJSON());
      if (res.ok) setEstado("activo");
      else setMensaje(res.error);
    } catch {
      setMensaje("No se han podido activar en este navegador.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await registro();
      const sub = await r.pushManager.getSubscription();
      if (sub) {
        await desactivarAvisos(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("apagado");
    } catch {
      setMensaje("No se han podido desactivar. Revisa la conexión.");
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setMensaje(null);
    const res = await probarAviso().catch(() => ({
      ok: false as const,
      error: "No se ha podido enviar. Revisa la conexión.",
    }));
    setMensaje(
      res.ok ? "Enviado. Debería llegarte en unos segundos." : res.error,
    );
    setOcupado(false);
  }

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="text-lg font-semibold">En este dispositivo</h2>
      {estado === "cargando" && <p className="text-sm text-muted">Mirando…</p>}
      {estado === "sin-soporte" && (
        <p className="text-sm text-muted">
          Este navegador no admite avisos. Prueba con Chrome, Edge, Firefox o
          Safari actualizados.
        </p>
      )}
      {estado === "iphone" && (
        <p className="text-sm text-muted">
          En iPhone o iPad, primero instala DíaClaro: en Safari pulsa
          «Compartir» → «Añadir a pantalla de inicio». Después ábrela desde el
          icono y vuelve aquí.
        </p>
      )}
      {estado === "bloqueado" && (
        <p className="text-sm text-muted">
          Los avisos están bloqueados para DíaClaro. Para activarlos, permite
          las notificaciones en los ajustes del navegador (o del móvil) y vuelve
          a abrir esta pantalla.
        </p>
      )}
      {estado === "apagado" && (
        <>
          <p className="text-sm text-muted">
            Ahora los recordatorios solo salen dentro de la app. Si los activas,
            también te llega un aviso con la app cerrada.
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={ocupado}
            className="button-primary"
          >
            {ocupado ? "Activando…" : "Activar avisos aquí"}
          </button>
        </>
      )}
      {estado === "activo" && (
        <>
          <p className="text-sm">Los avisos están activados aquí.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={probar}
              disabled={ocupado}
              className="button-primary py-2 text-sm"
            >
              Mandar un aviso de prueba
            </button>
            <button
              type="button"
              onClick={desactivar}
              disabled={ocupado}
              className="py-2 text-sm underline"
            >
              Desactivar aquí
            </button>
          </div>
        </>
      )}
      {mensaje && (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      )}
    </section>
  );
}
