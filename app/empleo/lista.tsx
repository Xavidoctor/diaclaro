import Link from "next/link";
import {
  NOMBRE_ESTADO,
  textoSeguimiento,
  type Candidatura,
} from "@/lib/planner/candidaturas";
import { fechaCorta } from "@/lib/planner/fechas";

// Lista de candidaturas (se usa en /empleo y en la tarjeta de Hoy).
export function ListaCandidaturas({
  candidaturas,
  hoy,
}: {
  candidaturas: Candidatura[];
  hoy: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {candidaturas.map((c) => {
        const atrasado = c.next_follow_up !== null && c.next_follow_up < hoy;
        return (
          <li key={c.id}>
            <Link
              href={`/empleo/${c.id}`}
              className="card flex flex-col gap-1 p-4"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="break-words font-medium">{c.company}</span>
                <span className="shrink-0 text-sm text-muted">
                  {NOMBRE_ESTADO[c.status]}
                </span>
              </span>
              <span className="break-words text-sm">{c.role}</span>
              {c.next_follow_up ? (
                <span
                  className={`text-sm ${atrasado ? "text-danger" : "text-muted"}`}
                >
                  Seguimiento: {textoSeguimiento(c.next_follow_up, hoy)}
                  {c.next_step ? ` · ${c.next_step}` : ""}
                </span>
              ) : (
                c.applied_on && (
                  <span className="text-sm text-muted">
                    Enviada el {fechaCorta(c.applied_on)}
                  </span>
                )
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
