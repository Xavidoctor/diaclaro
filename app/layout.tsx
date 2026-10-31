import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { RecorridoGuiado } from "@/app/componentes/recorrido-guiado";
import "./globals.css";
import { RegistrarSW } from "@/app/componentes/registrar-sw";
import { AvisoSinConexion } from "@/app/componentes/aviso-sin-conexion";

// Letra de la app (estilo "Calma"): Nunito, redondeada y fácil de leer.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "DíaClaro", template: "%s · DíaClaro" },
  description: "Tu centro de organización personal.",
  appleWebApp: { capable: true, title: "DíaClaro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Solo se ve sin internet. */}
        <AvisoSinConexion />
        {children}
        {/* El recorrido de bienvenida: se abre solo la primera vez. */}
        <RecorridoGuiado />
        <RegistrarSW />
      </body>
    </html>
  );
}
