import Link from "next/link";
import { CalendarDays, Inbox, LayoutGrid, Sun } from "lucide-react";
import { PanelEstado } from "@/app/componentes/panel-estado";

// Menú de abajo: Hoy, Agenda, Bandeja y Áreas, cada una con su icono.
// "guia" es lo que ilumina el recorrido de bienvenida.
const SECCIONES = [
  { href: "/", nombre: "Hoy", guia: "menu-hoy", Icono: Sun },
  {
    href: "/agenda",
    nombre: "Agenda",
    guia: "menu-agenda",
    Icono: CalendarDays,
  },
  { href: "/bandeja", nombre: "Bandeja", guia: "menu-bandeja", Icono: Inbox },
  { href: "/areas", nombre: "Áreas", guia: "menu-areas", Icono: LayoutGrid },
] as const;

// "actual" marca la sección en la que estás (en Ajustes no se marca ninguna).
export function BarraInferior({ actual }: { actual: string }) {
  return (
    <nav
      aria-label="Secciones"
      className="sticky bottom-0 mt-auto border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {SECCIONES.map(({ href, nombre, guia, Icono }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              data-guia={guia}
              aria-current={href === actual ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${
                href === actual ? "text-primary" : "text-muted"
              }`}
            >
              {/* aria-hidden: el lector de pantalla ya lee el nombre. */}
              <Icono aria-hidden className="size-5" />
              {nombre}
            </Link>
          </li>
        ))}
      </ul>
      {/* El panel «Tu estado»: sale al deslizar a la derecha. */}
      <PanelEstado />
    </nav>
  );
}
