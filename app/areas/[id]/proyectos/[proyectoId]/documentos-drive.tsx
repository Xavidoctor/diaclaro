import { leerConexionGoogle, listarDocumentos } from "@/lib/data/google";
import { datosSelectorDrive, selectorDriveDisponible } from "@/lib/google/api";
import { tipoDocumento } from "@/lib/planner/drive";
import { quitarDocumentoAction } from "./acciones-drive";
import { ElegirDeDrive } from "./elegir-de-drive";

// Mensajes al volver de Google (llegan en ?google=...).
const MENSAJES: Record<string, string> = {
  conectado: "Listo: ya puedes elegir documentos de tu Drive.",
  cancelado: "Has cancelado en Google. No se ha conectado nada.",
  "sin-permiso":
    "Falta algún permiso. Vuelve a conectar y deja marcadas las casillas.",
  error: "No se ha podido conectar. Prueba otra vez en un momento.",
};

// Sección «Documentos» de un proyecto o asignatura: enlaces a archivos de
// tu Google Drive. Si la app aún no tiene Drive activado, no se enseña.
export async function DocumentosDrive({
  proyectoId,
  ruta,
  mensaje,
}: {
  proyectoId: string;
  ruta: string; // la dirección de esta pantalla, para volver después de Google
  mensaje?: string;
}) {
  if (!selectorDriveDisponible()) return null;
  // Si falta la migración, la sección no sale y el resto de la página sigue igual.
  const [conexion, documentos] = await Promise.all([
    leerConexionGoogle().catch(() => null),
    listarDocumentos(proyectoId).catch((error) => {
      console.error(error);
      return null;
    }),
  ]);
  if (documentos === null) return null;
  const aviso = mensaje ? MENSAJES[mensaje] : undefined;

  return (
    <section id="documentos" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Documentos</h2>
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      {documentos.length === 0 ? (
        <p className="text-sm text-muted">
          Enlaza aquí apuntes, trabajos o lo que uses de tu Google Drive.
          DíaClaro solo ve los archivos que elijas.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documentos.map((d) => (
            <li key={d.id} className="card flex items-center gap-3 p-4">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="break-words">{d.title}</span>
                <span className="text-sm text-muted">
                  {tipoDocumento(d.mime_type)} · Abrir en Drive
                </span>
              </a>
              <form action={quitarDocumentoAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="enlace text-sm">
                  Quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {conexion?.drive ? (
        <ElegirDeDrive proyectoId={proyectoId} {...datosSelectorDrive()} />
      ) : (
        // Un enlace normal (no Link): sale de la app hacia Google.
        <a
          href={`/api/google/conectar?drive=1&volver=${encodeURIComponent(ruta)}`}
          className="button-primary self-start"
        >
          Conectar Google Drive
        </a>
      )}
    </section>
  );
}
