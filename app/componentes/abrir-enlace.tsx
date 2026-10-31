import { ExternalLink, Headphones, Play } from "lucide-react";
import {
  sitioDeEnlace,
  textoBotonEnlace,
  tipoDeEnlace,
} from "@/lib/planner/enlaces";

// Botón pequeño para abrir el enlace de una tarea, rutina o hábito
// (un podcast, una clase, un vídeo…). Se abre en otra pestaña o en su app.
// Con "conSitio", al lado sale de qué web es (por ejemplo, «youtube.com»).
export function AbrirEnlace({
  url,
  conSitio = false,
}: {
  url: string;
  conSitio?: boolean;
}) {
  const tipo = tipoDeEnlace(url);
  const Icono =
    tipo === "video" ? Play : tipo === "audio" ? Headphones : ExternalLink;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full bg-secondary px-3 py-1 text-sm font-medium"
    >
      <Icono aria-hidden className="size-4 shrink-0" />
      {textoBotonEnlace(url)}
      {conSitio && (
        <span className="max-w-40 truncate font-normal text-muted">
          · {sitioDeEnlace(url)}
        </span>
      )}
    </a>
  );
}
