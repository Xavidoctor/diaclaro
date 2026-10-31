import Link from "next/link";
import { leerCierre } from "@/lib/data/cierre";
import { sumarDias } from "@/lib/planner/fechas";

// Tarjeta al final de Hoy: lo que ayer dijiste que cambiarías y un solo
// botón, «Cerrar el día». Dentro está el repaso y, al final, «Me voy a dormir».
// Si ya has hecho el repaso, el botón pasa a ser «Me voy a dormir».
export async function CierreDeHoy({ hoy }: { hoy: string }) {
  const [deAyer, deHoy] = await Promise.all([
    leerCierre(sumarDias(hoy, -1)),
    leerCierre(hoy),
  ]);

  return (
    <section className="card flex flex-col gap-3 p-4">
      {deAyer?.change_tomorrow && (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Ayer querías cambiar
          </h2>
          <p className="whitespace-pre-wrap break-words">
            {deAyer.change_tomorrow}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Cerrar el día</h2>
          <p className="text-sm text-muted">
            {deHoy
              ? "Ya has repasado el día. Cuando te acuestes, pulsa aquí."
              : "Mira lo que has hecho y acaba el día con calma."}
          </p>
        </div>
        <Link
          href={deHoy ? "/dormir" : "/cierre"}
          className="button-primary shrink-0 py-2 text-sm"
        >
          {deHoy ? "Me voy a dormir" : "Cerrar el día"}
        </Link>
      </div>
      {deHoy && (
        <Link href="/cierre" className="enlace self-start text-sm">
          Ver o cambiar el repaso
        </Link>
      )}
    </section>
  );
}
