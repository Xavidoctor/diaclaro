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
    background_color: "#f8fafc",
    theme_color: "#2563eb",
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
  };
}
