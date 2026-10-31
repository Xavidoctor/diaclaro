import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormCierre } from "@/app/cierre/form-cierre";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerDiaDeHoy, leerLimitesDelDia } from "@/lib/data/dia-activo";
import { leerCierre, listarTareasHechasDesde } from "@/lib/data/cierre";
import { leerDiaDificil, listarTareasPorIds } from "@/lib/data/dia-dificil";
import { listarSesionesDelDia } from "@/lib/data/foco";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import { textoHoras } from "@/lib/planner/areas";
import { hechasEnDia } from "@/lib/planner/cierre";
import { diaVivido } from "@/lib/planner/dia-activo";
import { MOTIVOS, resumenConservado } from "@/lib/planner/dia-dificil";
import { esFecha, nombreDia, sumarDias } from "@/lib/planner/fechas";
import { totalMinutos } from "@/lib/planner/foco";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cerrar el día" };

// Cerrar el día: un resumen de lo que has hecho, dos preguntas (opcionales)
// y, al final, «Me voy a dormir». Es el único sitio donde se cierra el día.
// /cierre?dia=2026-10-29 abre el de otro día (nunca uno futuro).
export default async function CierrePage({
  searchParams,
}: PageProps<"/cierre">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const params = await searchParams;
  const { timezone } = await leerAjustes();
  // El día que estás viviendo: no cambia a medianoche, sino al pulsar
  // «Me voy a dormir». Si ya lo pulsaste, repasas el día que acabas de cerrar.
  const hoy = diaVivido(await leerDiaDeHoy());
  const pedido = typeof params.dia === "string" ? params.dia : "";
  const dia = esFecha(pedido) && pedido <= hoy ? pedido : hoy;

  // Desde el día anterior a medianoche (UTC) para no perder ninguna por la zona horaria.
  const [cierre, tareas, sesiones, registros, rutinas, diaDificil] =
    await Promise.all([
      leerCierre(dia),
      listarTareasHechasDesde(new Date(`${sumarDias(dia, -1)}T00:00:00Z`)),
      listarSesionesDelDia(dia),
      listarRegistrosDelDia(dia),
      listarRutinas(),
      leerDiaDificil(dia),
    ]);
  // Si ese día fue difícil: lo que decidiste conservar.
  const conservado = diaDificil
    ? resumenConservado(
        diaDificil.kept_task_ids,
        await listarTareasPorIds(diaDificil.kept_task_ids),
      )
    : null;
  // Lo que hiciste de madrugada, antes de irte a dormir, cuenta en este día.
  const limites = await leerLimitesDelDia(dia);
  const hechas = hechasEnDia(tareas, dia, timezone, limites);
  const minutosFoco = totalMinutos(sesiones);
  const vecesPorRutina = new Map<string, number>();
  for (const r of registros)
    vecesPorRutina.set(
      r.routine_id,
      (vecesPorRutina.get(r.routine_id) ?? 0) + 1,
    );
  const rutinasHechas = rutinas.filter((r) => vecesPorRutina.has(r.id));

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Cerrar el día
          </h1>
          <p className="text-muted first-letter:uppercase">
            {nombreDia(dia)}
            {dia === hoy ? " (hoy)" : ""}
          </p>
          <nav className="flex gap-4 text-sm">
            <Link href={`/cierre?dia=${sumarDias(dia, -1)}`} className="enlace">
              Día anterior
            </Link>
            {dia < hoy && (
              <Link
                href={`/cierre?dia=${sumarDias(dia, 1)}`}
                className="enlace"
              >
                Día siguiente
              </Link>
            )}
          </nav>
        </header>

        {diaDificil && conservado && (
          <section className="card flex flex-col gap-2 border-primary p-4 text-sm">
            <h2 className="text-lg font-semibold">Era un día difícil</h2>
            <p className="text-muted">
              {MOTIVOS[diaDificil.reason]}. Aun así, decidiste quedarte con lo
              importante, y eso ya cuenta. Lo que aplazaste está en otro día:
              hoy no cuenta como pendiente.
            </p>
            {conservado.hechas.length > 0 && (
              <ul className="flex flex-col gap-1">
                {conservado.hechas.map((t) => (
                  <li key={t.id} className="break-words">
                    ✓ {t.title}
                  </li>
                ))}
              </ul>
            )}
            {conservado.sigue.length > 0 && (
              <p className="text-muted">
                {conservado.hechas.length > 0
                  ? "Y siguen en marcha: "
                  : "Siguen en marcha: "}
                {conservado.sigue.map((t) => t.title).join(", ")}.
              </p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Lo que has hecho</h2>
          {hechas.length === 0 &&
          rutinasHechas.length === 0 &&
          minutosFoco === 0 ? (
            <p className="text-sm text-muted">
              La app no tiene nada apuntado como hecho este día. Seguro que algo
              has hecho: escríbelo abajo.
            </p>
          ) : (
            <ul className="card flex flex-col gap-2 p-4 text-sm">
              {hechas.map((t) => (
                <li key={t.id} className="break-words">
                  ✓ {t.title}
                </li>
              ))}
              {rutinasHechas.map((r) => (
                <li key={r.id} className="break-words">
                  ✓ {r.title}
                  {(vecesPorRutina.get(r.id) ?? 0) > 1
                    ? ` (${vecesPorRutina.get(r.id)} veces)`
                    : ""}
                </li>
              ))}
              {minutosFoco > 0 && <li>⏱ {textoHoras(minutosFoco)} de foco</li>}
            </ul>
          )}
        </section>

        <FormCierre key={dia} dia={dia} cierre={cierre} />

        {/* El último paso: guarda la hora a la que te acuestas y el día se cierra. */}
        {dia === hoy && (
          <section className="card flex flex-col gap-3 p-4">
            <h2 className="text-lg font-semibold">Último paso</h2>
            <p className="text-sm text-muted">
              Escribir es opcional. Cuando te metas en la cama, pulsa aquí y el
              día queda cerrado.
            </p>
            <Link href="/dormir" className="button-primary self-start">
              Me voy a dormir
            </Link>
          </section>
        )}
      </main>
      <BarraInferior actual="/cierre" />
    </>
  );
}
