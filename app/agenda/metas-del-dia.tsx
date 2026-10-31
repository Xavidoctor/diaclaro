import Link from "next/link";
import { Flag } from "lucide-react";
import type { MetaConProyecto } from "@/lib/data/metas";
import { NOMBRE_TIPO } from "@/lib/planner/metas";

// Las entregas, exámenes y metas que vencen un día, encima de lo que tienes
// apuntado. Al tocar una, se abre su proyecto. Si no hay ninguna, no se ve nada.
export function MetasDelDia({ metas }: { metas: MetaConProyecto[] }) {
  if (metas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {metas.map((m) => (
        <li key={m.id}>
          <Link
            href={`/areas/${m.projects.area_id}/proyectos/${m.project_id}#meta-${m.id}`}
            className="card flex items-baseline gap-3 border-l-4 border-l-primary p-4"
          >
            <span className="flex w-28 shrink-0 items-center gap-1 text-sm text-muted">
              <Flag aria-hidden className="size-4 self-center" />
              {NOMBRE_TIPO[m.kind]}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="break-words">{m.title}</span>
              <span className="text-sm text-muted">{m.projects.name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
