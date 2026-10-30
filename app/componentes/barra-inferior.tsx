import Link from "next/link";

// Menú de abajo: Hoy, Agenda, Bandeja y Áreas.
const SECCIONES = [
  { href: "/", nombre: "Hoy" },
  { href: "/agenda", nombre: "Agenda" },
  { href: "/bandeja", nombre: "Bandeja" },
  { href: "/areas", nombre: "Áreas" },
] as const;

// "actual" marca la sección en la que estás (en Ajustes no se marca ninguna).
export function BarraInferior({ actual }: { actual: string }) {
  return (
    <nav
      aria-label="Secciones"
      className="sticky bottom-0 mt-auto border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {SECCIONES.map((s) => (
          <li key={s.href} className="flex-1">
            <Link
              href={s.href}
              aria-current={s.href === actual ? "page" : undefined}
              className={`block py-3 text-center text-sm font-medium ${
                s.href === actual ? "text-primary" : "text-muted"
              }`}
            >
              {s.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
