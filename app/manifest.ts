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
