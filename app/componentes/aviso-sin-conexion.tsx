"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, TriangleAlert, X } from "lucide-react";
import {
  resolverRevision,
  useCambiosSinConexion,
} from "@/app/componentes/cambios-sin-conexion";
import {
  describirCambio,
  type Revision,
} from "@/lib/planner/cambios-sin-conexion";
import { deCuandoEsLaCopia } from "@/lib/planner/sin-conexion";

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

function plural(n: number, uno: string, varios: string) {
  return n === 1 ? `1 ${uno}` : `${n} ${varios}`;
}

// Franja de arriba para usar la app sin internet:
// - sin red: dice que ves la copia guardada y de qué hora es;
// - cambios esperando: cuántos se enviarán al volver la red;
// - «Revisa»: cambios que no se pudieron guardar porque esa cosa se cambió
//   o se borró en otro aparato mientras tanto.
export function AvisoSinConexion() {
  const sinConexion = useSyncExternalStore(
    suscribir,
    () => !navigator.onLine,
    () => false,
  );
  const { pendientes, revisiones } = useCambiosSinConexion();
  const [deCuando, setDeCuando] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!sinConexion || !("caches" in window)) return;
    caches
      .match(location.href, { cacheName: "diaclaro-paginas" })
      .then((copia) =>
        setDeCuando(
          deCuandoEsLaCopia(copia?.headers.get("x-diaclaro-guardada") ?? null, new Date()),
        ),
      )
      .catch(() => {});
  }, [sinConexion]);

  // El aviso del móvil abre la app con ?revisar=1: abrimos la lista.
  useEffect(() => {
    if (new URLSearchParams(location.search).has("revisar")) {
      queueMicrotask(() => setAbierta(true));
    }
  }, []);

  return (
    <>
      {sinConexion && (
        <div
          role="status"
          className="sticky top-0 z-40 flex items-center gap-2 bg-secondary px-4 py-2 text-sm text-foreground"
        >
          <CloudOff aria-hidden className="size-4 shrink-0 text-primary" />
          <p>
            <strong>Sin conexión.</strong> Ves la copia guardada en este
            aparato{deCuando ? ` (${deCuando})` : ""}. Lo que apuntes, marques o
            edites se enviará al volver internet
            {pendientes > 0 ? ` (${plural(pendientes, "cambio esperando", "cambios esperando")})` : ""}.
          </p>
        </div>
      )}
      {!sinConexion && pendientes > 0 && (
        <div
          role="status"
          className="sticky top-0 z-40 flex items-center gap-2 bg-secondary px-4 py-2 text-sm"
        >
          <RefreshCw aria-hidden className="size-4 shrink-0 animate-spin text-primary" />
          Enviando {plural(pendientes, "cambio", "cambios")} que hiciste sin internet…
        </div>
      )}
      {revisiones.length > 0 && (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          className="sticky top-0 z-40 flex w-full items-center gap-2 bg-danger/10 px-4 py-2 text-left text-sm font-medium text-danger"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          Revisa {plural(revisiones.length, "cambio", "cambios")} que no se
          {revisiones.length === 1 ? " ha" : " han"} podido guardar
        </button>
      )}
      {abierta && revisiones.length > 0 && (
        <ListaRevisar revisiones={revisiones} cerrar={() => setAbierta(false)} />
      )}
    </>
  );
}

function ListaRevisar({
  revisiones,
  cerrar,
}: {
  revisiones: Revision[];
  cerrar: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function resolver(id: string, guardarElMio: boolean) {
    setOcupado(true);
    setError(null);
    const ok = await resolverRevision(id, guardarElMio);
    setOcupado(false);
    if (!ok) setError("No se ha podido guardar. Mira si tienes internet y prueba otra vez.");
    else if (guardarElMio) router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={cerrar}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-revisar"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-2xl bg-background p-6"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 id="titulo-revisar" className="text-lg font-semibold">
            Revisa estos cambios
          </h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-full hover:bg-secondary"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <p className="text-sm text-muted">
          Los hiciste sin internet, pero mientras tanto esto se cambió o se
          borró en otro aparato. Elige qué se queda.
        </p>
        <ul className="flex flex-col gap-3">
          {revisiones.map((r) => (
            <li key={r.cambio.id} className="card flex flex-col gap-3">
              <p className="font-semibold">{describirCambio(r.cambio)}</p>
              {r.motivo === "no-existe" ? (
                <p className="text-sm text-muted">
                  Ya no existe: se borró en otro aparato.
                </p>
              ) : (
                <>
                  {r.cambio.tipo === "editar-nota" && (
                    <div className="flex flex-col gap-1 text-sm">
                      <p className="text-muted">Lo tuyo:</p>
                      <p className="whitespace-pre-wrap break-words">{r.cambio.texto}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-muted">Cómo está ahora en DíaClaro:</p>
                    <p className="whitespace-pre-wrap break-words">{r.ahora}</p>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                {r.motivo === "cambiado" ? (
                  <>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => resolver(r.cambio.id, true)}
                      className="button-primary py-2 text-sm"
                    >
                      Guardar el mío
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => resolver(r.cambio.id, false)}
                      className="button-secondary py-2 text-sm"
                    >
                      Dejar lo que hay
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => resolver(r.cambio.id, false)}
                    className="button-secondary py-2 text-sm"
                  >
                    Vale
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
