import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components viene activado en la plantilla. Lo dejamos apagado:
  // casi todas las páginas de DíaClaro dependen de tu sesión y así el código es más sencillo.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
