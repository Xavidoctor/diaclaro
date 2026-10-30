import Link from "next/link";
import type { EstadoGoogle } from "@/app/componentes/agenda-google";

// Una línea que avisa si no se ha podido leer tu Google Calendar.
// Si todo va bien (o no lo has conectado), no enseña nada.
export function AvisoGoogle({ estado }: { estado: EstadoGoogle }) {
  if (estado === "fallo") {
    return (
      <p className="text-sm text-muted">
        Ahora mismo no he podido leer tu Google Calendar. Lo que ves es solo lo
        que tienes en DíaClaro. Prueba de nuevo en un rato.
      </p>
    );
  }
  if (estado === "permiso-retirado") {
    return (
      <p className="text-sm text-muted">
        Google ya no me deja leer tu calendario.{" "}
        <Link href="/ajustes#google" className="enlace">
          Vuelve a conectarlo en Ajustes
        </Link>
        .
      </p>
    );
  }
  return null;
}

// La etiqueta que va al lado de cada evento que viene de Google.
export function EtiquetaGoogle({ libre }: { libre: boolean }) {
  return (
    <span className="text-xs text-muted">
      Google{libre ? " · disponible" : ""}
    </span>
  );
}
