"use client";

import {
  useActionState,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { guardarSesionFoco, type GuardarFocoState } from "@/app/foco/actions";
import {
  MAX_OBJETIVO,
  iniciar,
  leerGuardado,
  minutosHechos,
  pausar,
  prepararObjetivo,
  reanudar,
  restante,
  terminado,
  textoReloj,
  type Temporizador as Estado,
} from "@/lib/planner/foco";

export type TareaParaFoco = {
  id: string;
  title: string;
  estimated_minutes: number | null;
};

// ---- El temporizador en marcha se guarda en este navegador ----
// Así no se pierde si recargas, cambias de pantalla o se cierra la app.
// (Si el navegador no deja guardar, sigue funcionando mientras no recargues).

const CLAVE = "diaclaro.foco";
const oyentes = new Set<() => void>();
let enMemoria: string | null = null;

function leerTexto(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return enMemoria;
  }
}

function guardarEstado(estado: Estado | null) {
  enMemoria = estado ? JSON.stringify(estado) : null;
  try {
    if (enMemoria) localStorage.setItem(CLAVE, enMemoria);
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: nos quedamos con la copia en memoria.
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  // "storage" llega si cambias el temporizador en otra pestaña.
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

// La hora actual, redondeada al segundo, que se actualiza cada segundo.
function relojCadaSegundo(avisar: () => void) {
  const id = window.setInterval(avisar, 1000);
  // Al volver a la app (por ejemplo, tras bloquear el móvil) se pone al día enseguida.
  document.addEventListener("visibilitychange", avisar);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", avisar);
  };
}
const segundoActual = () => Math.floor(Date.now() / 1000) * 1000;

// Aviso al terminar: vibración, un pitido corto y una notificación si diste permiso.
function avisarFin(titulo: string | null) {
  navigator.vibrate?.([300, 150, 300]);
  try {
    const audio = new AudioContext();
    const pitido = audio.createOscillator();
    pitido.frequency.value = 880;
    pitido.connect(audio.destination);
    pitido.start();
    pitido.stop(audio.currentTime + 0.4);
    pitido.onended = () => audio.close();
  } catch {
    // Sin sonido no pasa nada.
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("¡Tiempo de foco terminado!", {
      body: titulo ?? "Buen trabajo. Apunta lo que has hecho.",
    });
  }
}

export function Temporizador({
  tareas,
  tareaInicial,
}: {
  tareas: TareaParaFoco[];
  tareaInicial: string | null;
}) {
  const texto = useSyncExternalStore(suscribirse, leerTexto, () => null);
  const estado = leerGuardado(texto);
  const ahora = useSyncExternalStore(relojCadaSegundo, segundoActual, () => 0);
  // true cuando pulsas «Terminar ya» antes de tiempo.
  const [cerrando, setCerrando] = useState(false);

  const fin = estado !== null && terminado(estado, ahora);
  const enMarcha = estado !== null && estado.pausadoDesde === null && !fin;

  // Avisa una sola vez por sesión cuando llega a cero.
  const inicio = estado?.inicio;
  const titulo = estado?.tareaTitulo ?? null;
  useEffect(() => {
    if (!fin || inicio === undefined) return;
    const clave = `${CLAVE}.avisado`;
    try {
      if (sessionStorage.getItem(clave) === String(inicio)) return;
      sessionStorage.setItem(clave, String(inicio));
    } catch {
      // Si no se puede guardar, como mucho avisa dos veces.
    }
    avisarFin(titulo);
  }, [fin, inicio, titulo]);

  // El tiempo que falta se ve también en la pestaña del navegador.
  useEffect(() => {
    if (!estado) return;
    const antes = document.title;
    document.title = fin
      ? "¡Tiempo! · DíaClaro"
      : `${textoReloj(restante(estado, ahora))} · Foco`;
    return () => {
      document.title = antes;
    };
  }, [estado, ahora, fin]);

  // Mientras cuenta, intenta que la pantalla no se apague (si el móvil lo permite).
  useEffect(() => {
    if (!enMarcha || !("wakeLock" in navigator)) return;
    let candado: WakeLockSentinel | null = null;
    let activo = true;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((c) => {
          if (activo) candado = c;
          else c.release();
        })
        .catch(() => {});
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", pedir);
      candado?.release().catch(() => {});
    };
  }, [enMarcha]);

  if (ahora === 0) {
    // Primer dibujo (aún sin la hora del móvil).
    return <p className="text-sm text-muted">Cargando el temporizador…</p>;
  }
  if (!estado) {
    return <Empezar tareas={tareas} tareaInicial={tareaInicial} />;
  }
  if (fin || cerrando) {
    return (
      <Guardar
        estado={estado}
        minutos={minutosHechos(estado, ahora)}
        antesDeTiempo={!fin}
        alGuardar={() => setCerrando(false)}
        alSeguir={() => {
          setCerrando(false);
          guardarEstado(reanudar(estado, Date.now()));
        }}
      />
    );
  }

  const pausado = estado.pausadoDesde !== null;
  return (
    <div className="card flex flex-col items-center gap-4 p-6 text-center">
      {estado.tareaTitulo && (
        <p className="break-words text-sm text-muted">{estado.tareaTitulo}</p>
      )}
      <p
        role="timer"
        aria-live="off"
        className="text-6xl font-semibold tabular-nums tracking-tight"
      >
        {textoReloj(restante(estado, ahora))}
      </p>
      <p className="text-sm text-muted">
        {pausado
          ? "En pausa"
          : `Objetivo: ${estado.objetivoMinutos} min. Puedes bloquear el móvil, el tiempo sigue contando.`}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="button-primary"
          onClick={() =>
            guardarEstado(
              pausado
                ? reanudar(estado, Date.now())
                : pausar(estado, Date.now()),
            )
          }
        >
          {pausado ? "Seguir" : "Pausa"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            guardarEstado(pausar(estado, Date.now()));
            setCerrando(true);
          }}
        >
          Terminar ya
        </button>
      </div>
    </div>
  );
}

// ---- Antes de empezar: qué vas a hacer y cuántos minutos ----

const RAPIDOS = [15, 25, 45, 60];

function Empezar({
  tareas,
  tareaInicial,
}: {
  tareas: TareaParaFoco[];
  tareaInicial: string | null;
}) {
  const inicial = tareas.find((t) => t.id === tareaInicial) ?? null;
  const [tareaId, setTareaId] = useState(inicial?.id ?? "");
  const [minutos, setMinutos] = useState(
    inicial?.estimated_minutes ? String(inicial.estimated_minutes) : "",
  );
  const [error, setError] = useState<string | null>(null);

  function elegirTarea(id: string) {
    setTareaId(id);
    // Si la tarea tiene minutos previstos y aún no has escrito nada, los usamos.
    const tarea = tareas.find((t) => t.id === id);
    if (minutos === "" && tarea?.estimated_minutes)
      setMinutos(String(Math.min(tarea.estimated_minutes, MAX_OBJETIVO)));
  }

  function empezar(e: React.FormEvent) {
    e.preventDefault();
    const r = prepararObjetivo(minutos);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    // Pide permiso para avisarte al terminar (solo la primera vez).
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const tarea = tareas.find((t) => t.id === tareaId) ?? null;
    guardarEstado(iniciar(r.valor, tarea, Date.now()));
  }

  return (
    <form onSubmit={empezar} className="card flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        ¿En qué vas a trabajar? (opcional)
        <select
          value={tareaId}
          onChange={(e) => elegirTarea(e.target.value)}
          className="input py-2"
        >
          <option value="">Sin tarea concreta</option>
          {tareas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Minutos
        <input
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
          inputMode="numeric"
          placeholder="Escribe los minutos o elige abajo"
          className="input py-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {RAPIDOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutos(String(m))}
            className={`rounded-full border px-3 py-1 text-sm ${
              minutos === String(m)
                ? "border-primary text-primary"
                : "border-border"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" className="button-primary">
        Empezar
      </button>
    </form>
  );
}

// ---- Al terminar: confirmas los minutos y se guardan ----

function Guardar({
  estado,
  minutos,
  antesDeTiempo,
  alGuardar,
  alSeguir,
}: {
  estado: Estado;
  minutos: number;
  antesDeTiempo: boolean;
  alGuardar: () => void;
  alSeguir: () => void;
}) {
  async function accion(prev: GuardarFocoState, formData: FormData) {
    const r = await guardarSesionFoco(prev, formData);
    if (!r.error) {
      guardarEstado(null);
      alGuardar();
    }
    return r;
  }
  const [resultado, formAction, guardando] = useActionState<
    GuardarFocoState,
    FormData
  >(accion, { envios: 0 });

  return (
    <form action={formAction} className="card flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {antesDeTiempo ? "Terminar antes de tiempo" : "¡Tiempo!"}
      </h2>
      {estado.tareaTitulo && (
        <p className="break-words text-sm text-muted">{estado.tareaTitulo}</p>
      )}
      <input type="hidden" name="tarea" value={estado.tareaId ?? ""} />
      <input
        type="hidden"
        name="inicio"
        value={new Date(estado.inicio).toISOString()}
      />
      <input type="hidden" name="objetivo" value={estado.objetivoMinutos} />
      <label className="flex flex-col gap-1 text-sm">
        Minutos de foco
        <input
          name="minutos"
          type="number"
          min={1}
          max={1440}
          required
          defaultValue={minutos > 0 ? minutos : ""}
          className="input py-2"
        />
        <span className="text-muted">
          {minutos > 0
            ? "Es lo que ha medido el temporizador sin contar las pausas. Cámbialo si no es correcto."
            : "Ha durado menos de un minuto. Escribe los minutos o descártalo."}
        </span>
      </label>
      {resultado.error && (
        <p role="alert" className="text-sm text-danger">
          {resultado.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={guardando} className="button-primary">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {antesDeTiempo && (
          <button type="button" onClick={alSeguir} className="button-secondary">
            Seguir con el foco
          </button>
        )}
        <button
          type="button"
          className="text-danger underline"
          onClick={() => {
            if (confirm("¿Descartar este rato de foco sin guardarlo?")) {
              guardarEstado(null);
              alGuardar();
            }
          }}
        >
          Descartar
        </button>
      </div>
    </form>
  );
}
