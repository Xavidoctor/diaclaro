import { desconectarGoogle } from "@/app/ajustes/actions";
import { esCuentaDemo } from "@/lib/data/demo";
import { leerConexionGoogle } from "@/lib/data/google";
import { googleDisponible } from "@/lib/google/api";
import { SaberMas } from "@/app/componentes/saber-mas";

// Mensajes al volver de Google (llegan en /ajustes?google=...).
const MENSAJES: Record<string, string> = {
  conectado: "Listo: tu Google Calendar ya sale en la Agenda.",
  desconectado: "Desconectado. DíaClaro ya no lee tu Google Calendar.",
  cancelado: "Has cancelado en Google. No se ha conectado nada.",
  "sin-permiso":
    "Falta el permiso para ver el calendario. Vuelve a conectar y deja marcada la casilla del calendario.",
  error: "No se ha podido conectar. Prueba otra vez en un momento.",
  "no-disponible": "La conexión con Google aún no está activada en esta app.",
  demo: "En las cuentas de prueba no se puede conectar Google.",
};

// Sección de Ajustes para conectar (o quitar) tu Google Calendar.
export async function SeccionGoogle({ mensaje }: { mensaje?: string }) {
  const demo = await esCuentaDemo();
  const disponible = googleDisponible() && !demo;
  const conexion = disponible
    ? await leerConexionGoogle().catch(() => null)
    : null;
  const aviso = mensaje ? MENSAJES[mensaje] : undefined;

  return (
    <section id="google" className="card flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Google Calendar</h2>
      <SaberMas resumen="Tus eventos de Google, en tu Agenda.">
        DíaClaro solo los lee: nunca crea, cambia ni borra nada en tu
        calendario.
      </SaberMas>
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      {demo ? (
        <p className="text-sm text-muted">
          En las cuentas de prueba no se puede conectar Google.
        </p>
      ) : !disponible ? (
        <p className="text-sm text-muted">Aún no está activado en esta app.</p>
      ) : conexion ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Conectado
            {conexion.google_email ? ` como ${conexion.google_email}` : ""}.
          </p>
          <form action={desconectarGoogle}>
            <button type="submit" className="text-sm underline">
              Desconectar
            </button>
          </form>
        </div>
      ) : (
        // Un enlace normal (no Link): sale de la app hacia Google.
        <a href="/api/google/conectar" className="button-primary self-start">
          Conectar con Google
        </a>
      )}
    </section>
  );
}
