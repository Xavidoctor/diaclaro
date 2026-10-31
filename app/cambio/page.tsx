import { redirect } from "next/navigation";

// «Algo ha cambiado» ahora vive dentro de «Tu asistente» (una sola entrada
// de IA). Esta dirección se queda para que los enlaces viejos sigan valiendo.
export default function CambioPage() {
  redirect("/ordenar?modo=cambio");
}
