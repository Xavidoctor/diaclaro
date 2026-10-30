import type { MetadataRoute } from "next";

// Permite instalar DíaClaro en el móvil como si fuera una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DíaClaro",
    short_name: "DíaClaro",
    description: "Tu centro de organización personal.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f5f1",
    theme_color: "#3a7458",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // «Compartir → DíaClaro»: desde la galería o justo después de una
    // captura, la foto se guarda en tus documentos importantes (app/compartir).
    // Solo en Android, con la app instalada en la pantalla de inicio.
    share_target: {
      action: "/compartir",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [{ name: "archivos", accept: ["image/*", "application/pdf"] }],
      },
    },
    // Atajo: mantén pulsado el icono de DíaClaro y sale «Estoy despierto».
    // Abre una pantalla con los botones Despierto y Levantado.
    shortcuts: [
      {
        name: "Estoy despierto",
        short_name: "Despierto",
        url: "/despierto",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
