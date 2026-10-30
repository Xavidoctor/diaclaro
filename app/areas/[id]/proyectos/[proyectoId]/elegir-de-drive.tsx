"use client";

import { useState } from "react";
import { enlazarDeDrive } from "./acciones-drive";

// Botón que abre el selector de archivos de Google (Google Picker).
// Lo que elijas se enlaza a este proyecto. DíaClaro solo ve esos archivos.

// Lo poquito que usamos del selector de Google (se carga desde apis.google.com).
type Selector = {
  setVisible: (v: boolean) => void;
};
type Constructor = {
  addView: (v: unknown) => Constructor;
  enableFeature: (f: unknown) => Constructor;
  setOAuthToken: (t: string) => Constructor;
  setDeveloperKey: (k: string) => Constructor;
  setAppId: (id: string) => Constructor;
  setLocale: (l: string) => Constructor;
  setCallback: (cb: (datos: RespuestaSelector) => void) => Constructor;
  build: () => Selector;
};
type RespuestaSelector = { action: string; docs?: unknown[] };
type GooglePicker = {
  PickerBuilder: new () => Constructor;
  DocsView: new () => {
    setIncludeFolders: (b: boolean) => unknown;
  };
  Feature: { MULTISELECT_ENABLED: unknown };
  Action: { PICKED: string; CANCEL: string };
};
declare global {
  interface Window {
    gapi?: { load: (lib: string, cb: () => void) => void };
    google?: { picker?: GooglePicker };
  }
}

let cargando: Promise<GooglePicker> | null = null;

// Carga el código del selector una sola vez.
function cargarSelector(): Promise<GooglePicker> {
  cargando ??= new Promise((resolver, fallar) => {
    const listo = () =>
      window.gapi!.load("picker", () => resolver(window.google!.picker!));
    if (window.gapi) return listo();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = listo;
    script.onerror = () => {
      cargando = null;
      fallar(new Error("No se ha podido cargar el selector de Google."));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

export function ElegirDeDrive({
  proyectoId,
  claveApi,
  idApp,
}: {
  proyectoId: string;
  claveApi: string;
  idApp: string;
}) {
  const [estado, setEstado] = useState<"listo" | "abriendo" | "guardando">(
    "listo",
  );
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setError(null);
    setEstado("abriendo");
    try {
      const [picker, respuesta] = await Promise.all([
        cargarSelector(),
        fetch("/api/google/drive/acceso", { cache: "no-store" }),
      ]);
      const datos = (await respuesta.json()) as {
        token?: string;
        error?: string;
      };
      if (!datos.token) {
        setError(
          datos.error === "permiso-retirado" || datos.error === "sin-drive"
            ? "Google ya no me deja abrir tu Drive. Vuelve a conectarlo."
            : "Ahora mismo no se puede abrir Drive. Prueba en un rato.",
        );
        setEstado("listo");
        return;
      }
      const vista = new picker.DocsView();
      vista.setIncludeFolders(true);
      new picker.PickerBuilder()
        .addView(vista)
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(datos.token)
        .setDeveloperKey(claveApi)
        .setAppId(idApp)
        .setLocale("es")
        .setCallback(async (r) => {
          if (r.action === picker.Action.PICKED) {
            setEstado("guardando");
            try {
              await enlazarDeDrive(proyectoId, r.docs ?? []);
            } catch {
              setError("No se han podido guardar. Prueba otra vez.");
            }
            setEstado("listo");
          } else if (r.action === picker.Action.CANCEL) {
            setEstado("listo");
          }
        })
        .build()
        .setVisible(true);
    } catch {
      setError("No se ha podido abrir Drive. Prueba otra vez.");
      setEstado("listo");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={abrir}
        disabled={estado !== "listo"}
        className="button-primary self-start"
      >
        {estado === "guardando" ? "Guardando…" : "Añadir de Google Drive"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
