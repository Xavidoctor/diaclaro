import type { Metadata } from "next";
import Link from "next/link";
import { cambiarTipo, mandarAPapelera } from "@/app/documentos/actions";
import { CopiaMovil } from "@/app/documentos/copia-movil";
import { paseDrive } from "@/app/documentos/pase-drive";
import { Miniatura } from "@/app/documentos/miniatura";
import { SubirDocumento } from "@/app/documentos/subir-documento";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { listarImportantes } from "@/lib/google/api";
import {
  TIPOS_IMPORTANTES,
  filtrarDocumentos,
  leerDocumentoDrive,
  nombreTipo,
  type DocumentoImportante,
} from "@/lib/planner/documentos-importantes";
import { createClient } from "@/lib/supabase/server";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Documentos importantes" };

// Mensajes al volver de Google (?google=...) o de «Compartir» (?compartido=...).
const MENSAJES: Record<string, string> = {
  conectado: "Listo: ya puedes guardar documentos en tu Drive.",
  cancelado: "Has cancelado en Google. No se ha conectado nada.",
  "sin-permiso":
    "Falta algún permiso. Vuelve a conectar y deja marcadas las casillas.",
  error: "No se ha podido conectar. Prueba otra vez en un momento.",
};

function texto(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor : "";
}

// Documentos importantes: DNI, billetes, entradas… guardados en una carpeta
// de tu Google Drive para encontrarlos rápido sin buscar en la galería.
export default async function DocumentosPage({
  searchParams,
}: PageProps<"/documentos">) {
  const parametros = await searchParams;
  const busqueda = texto(parametros.q).slice(0, 100);
  const tipo = texto(parametros.tipo);
  const compartido = Number(texto(parametros.compartido)) || 0;
  const fallo = texto(parametros.fallo);
  const aviso = MENSAJES[texto(parametros.google)];

  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const pase = await paseDrive();
  let documentos: DocumentoImportante[] | null = null;
  if (pase.ok) {
    try {
      documentos = (await listarImportantes(pase.token))
        .map(leerDocumentoDrive)
        .filter((d) => d !== null);
    } catch (error) {
      console.error(error);
    }
  }
  const visibles = documentos
    ? filtrarDocumentos(documentos, { busqueda, tipo })
    : [];

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <Link href="/ajustes" className="enlace text-sm">
            ← Ajustes
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Documentos importantes
          </h1>
          <SaberMas resumen="Tu DNI, billetes, entradas… a mano.">
            Sin buscar en la galería. Se guardan en una carpeta de tu Google
            Drive que solo ves tú.
          </SaberMas>
        </header>

        {(aviso || compartido > 0 || fallo) && (
          <p role="status" className="text-sm">
            {aviso ??
              (compartido > 0
                ? `Guardado${compartido > 1 ? `s ${compartido} archivos` : ""} en tu Drive. Puedes cambiarle el tipo abajo.`
                : fallo)}
          </p>
        )}

        {!pase.ok && pase.motivo === "no-disponible" && (
          <p className="text-sm text-muted">
            La conexión con Google aún no está activada en esta app.
          </p>
        )}
        {!pase.ok && pase.motivo !== "no-disponible" && (
          <section className="card flex flex-col gap-3">
            <p className="text-sm">
              {pase.motivo === "fallo"
                ? "Ahora mismo no puedo hablar con Google. Prueba en un rato o vuelve a conectar."
                : "Para guardar documentos, conecta tu Google Drive. DíaClaro solo verá la carpeta que crea él."}
            </p>
            {/* Un enlace normal (no Link): sale de la app hacia Google. */}
            <a
              href="/api/google/conectar?drive=1&volver=/documentos"
              className="button-primary self-start"
            >
              Conectar Google Drive
            </a>
          </section>
        )}

        {pase.ok && documentos === null && (
          <p className="text-sm text-muted">
            Ahora mismo no puedo leer tu Drive. Prueba otra vez en un rato.
          </p>
        )}

        {pase.ok && (
          <>
            <SubirDocumento />

            {documentos && sesion?.claims && (
              <CopiaMovil
                usuario={sesion.claims.sub}
                documentos={documentos.map((d) => ({
                  id: d.id,
                  nombre: d.nombre,
                  tipo: d.tipo,
                  tipoNombre: nombreTipo(d.tipo),
                  mime: d.mime,
                }))}
              />
            )}

            {documentos && documentos.length > 0 && (
              <form className="flex flex-wrap gap-2" role="search">
                <input
                  type="search"
                  name="q"
                  defaultValue={busqueda}
                  placeholder="Buscar: dni, billete, Roma…"
                  className="input min-w-0 flex-1 py-2"
                />
                <select
                  name="tipo"
                  defaultValue={tipo}
                  className="input py-2"
                  aria-label="Tipo"
                >
                  <option value="">Todos</option>
                  {TIPOS_IMPORTANTES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                <button type="submit" className="button-primary py-2 text-sm">
                  Buscar
                </button>
              </form>
            )}

            {documentos?.length === 0 && (
              <p className="text-sm text-muted">
                Aún no has guardado ninguno. Consejo: en el móvil, después de
                hacer una captura, pulsa «Compartir» y elige DíaClaro.
              </p>
            )}
            {documentos && documentos.length > 0 && visibles.length === 0 && (
              <p className="text-sm text-muted">
                No hay nada que coincida con tu búsqueda.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {visibles.map((d) => (
                <li key={d.id} className="card flex flex-col gap-3 p-4">
                  <a
                    href={d.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3"
                  >
                    <Miniatura src={d.miniatura} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words">{d.nombre}</span>
                      <span className="text-sm text-muted">
                        {nombreTipo(d.tipo)} · Abrir en Drive
                      </span>
                    </span>
                  </a>
                  <details>
                    <summary className="enlace cursor-pointer text-sm">
                      Cambiar tipo o quitar
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      <form action={cambiarTipo} className="flex gap-2">
                        <input type="hidden" name="id" value={d.id} />
                        <select
                          name="tipo"
                          defaultValue={d.tipo}
                          className="input min-w-0 flex-1 py-2"
                          aria-label="Tipo"
                        >
                          {TIPOS_IMPORTANTES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="button-primary py-2 text-sm"
                        >
                          Guardar
                        </button>
                      </form>
                      <form action={mandarAPapelera}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" className="text-sm underline">
                          Mandar a la papelera de Drive (se puede recuperar
                          durante 30 días)
                        </button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <BarraInferior actual="/ajustes" />
    </>
  );
}
