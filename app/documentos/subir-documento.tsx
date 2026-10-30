"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararSubida } from "@/app/documentos/actions";
import {
  MAX_MB_SUBIR,
  TIPOS_IMPORTANTES,
  URL_SUBIDA_DRIVE,
  comprobarArchivo,
  cuerpoSubida,
  leerTipo,
  metadatosSubida,
  nombreParaGuardar,
} from "@/lib/planner/documentos-importantes";

// Formulario para guardar una foto o un PDF en tu Drive.
// El archivo va directo del móvil a Google (no pasa por DíaClaro), así
// también se pueden subir fotos grandes.
export function SubirDocumento() {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<"listo" | "subiendo">("listo");
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean }>();

  async function subir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const archivo = datos.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      setMensaje({ texto: "Elige una foto o un PDF.", error: true });
      return;
    }
    const revision = comprobarArchivo(archivo, MAX_MB_SUBIR);
    if (!revision.ok) {
      setMensaje({ texto: revision.mensaje, error: true });
      return;
    }
    setMensaje(undefined);
    setEstado("subiendo");
    try {
      const preparado = await prepararSubida();
      if (!preparado.ok) {
        setMensaje({ texto: preparado.mensaje, error: true });
        return;
      }
      const titulo = datos.get("titulo");
      const { cuerpo, tipoContenido } = cuerpoSubida(
        metadatosSubida({
          nombre: nombreParaGuardar(
            typeof titulo === "string" ? titulo : "",
            archivo.name,
          ),
          tipo: leerTipo(datos.get("tipo")),
          carpeta: preparado.carpeta,
        }),
        archivo,
        archivo.type,
      );
      const respuesta = await fetch(URL_SUBIDA_DRIVE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preparado.token}`,
          "Content-Type": tipoContenido,
        },
        body: cuerpo,
      });
      if (!respuesta.ok) throw new Error(`Drive: ${respuesta.status}`);
      formulario.current?.reset();
      setMensaje({ texto: "Guardado en tu Drive.", error: false });
      router.refresh();
    } catch {
      setMensaje({
        texto: "No se ha podido guardar. Prueba otra vez.",
        error: true,
      });
    } finally {
      setEstado("listo");
    }
  }

  return (
    <form
      ref={formulario}
      onSubmit={subir}
      className="card flex flex-col gap-3"
    >
      <h2 className="text-lg font-semibold">Añadir un documento</h2>
      <label className="flex flex-col gap-1 text-sm">
        Foto o PDF
        <input
          type="file"
          name="archivo"
          accept="image/*,application/pdf"
          required
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nombre (opcional)
        <input
          type="text"
          name="titulo"
          maxLength={200}
          placeholder="Por ejemplo: DNI por delante"
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select name="tipo" defaultValue="otros" className="input">
          {TIPOS_IMPORTANTES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={estado === "subiendo"}
        className="button-primary self-start"
      >
        {estado === "subiendo" ? "Guardando…" : "Guardar en mi Drive"}
      </button>
      {mensaje && (
        <p
          role={mensaje.error ? "alert" : "status"}
          className={`text-sm ${mensaje.error ? "text-danger" : ""}`}
        >
          {mensaje.texto}
        </p>
      )}
    </form>
  );
}
