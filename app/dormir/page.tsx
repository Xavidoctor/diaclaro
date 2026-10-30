import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deshacerHoraDormir,
  guardarHoraAMano,
  meVoyADormir,
} from "@/app/dormir/acciones";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarHorasDormir } from "@/lib/data/dormir";
import { nocheDe, textoAcostaste } from "@/lib/planner/dormir";
import { horaEn, hoyEn, nombreDia, sumarDias } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Buenas noches" };

// "Me voy a dormir": guarda a qué hora te acuestas de verdad, para que
// Áreas → Progreso calcule tus horas de sueño reales. Se abre con el atajo
// «Me voy a dormir» (mantén pulsado el icono de DíaClaro) o desde Hoy.
// Si se te olvida, puedes poner la hora aproximada de esta noche o de anoche.
export default async function DormirPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  const estaNoche = nocheDe(hoy, sumarDias(hoy, -1), horaEn(timezone));
  const anoche = sumarDias(estaNoche, -1);
  const horas = await listarHorasDormir(anoche, estaNoche);
  const deEstaNoche = horas.find((h) => h.on_date === estaNoche);
  const deAnoche = horas.find((h) => h.on_date === anoche);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Buenas noches</h1>

      {deEstaNoche ? (
        <section className="card flex flex-col gap-2 p-4">
          <p>{textoAcostaste(deEstaNoche.bed_time)}. ¡Que descanses!</p>
          <form action={deshacerHoraDormir} className="self-start text-sm">
            <input type="hidden" name="noche" value={estaNoche} />
            <button type="submit" className="text-muted underline">
              Deshacer
            </button>
          </form>
        </section>
      ) : (
        <form action={meVoyADormir} className="flex flex-col gap-2">
          <SaberMas resumen="Púlsalo al meterte en la cama.">
            Con esta hora y la de «Despierto» sabrás cuánto duermes de verdad.
          </SaberMas>
          <button type="submit" className="button-primary min-h-16 text-lg">
            Me voy a dormir
          </button>
        </form>
      )}

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">¿Se te olvidó pulsarlo?</h2>
        <p className="text-sm text-muted">
          Pon la hora aproximada a la que te acostaste.
          {deAnoche && ` Anoche (${nombreDia(anoche)}): ${deAnoche.bed_time}.`}
        </p>
        <form action={guardarHoraAMano} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Noche
            <select
              name="noche"
              defaultValue={estaNoche}
              className="input py-2"
            >
              <option value={estaNoche}>
                Esta noche ({nombreDia(estaNoche)})
              </option>
              <option value={anoche}>Anoche ({nombreDia(anoche)})</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Hora (si fue pasada la medianoche, pon por ejemplo 01:30)
            <input
              type="time"
              name="bed_time"
              required
              className="input py-2"
            />
          </label>
          <button type="submit" className="button-secondary self-start py-2">
            Guardar hora
          </button>
        </form>
      </section>

      <div className="flex gap-4 text-sm">
        <Link href="/" className="enlace">
          Ir a Hoy
        </Link>
        <Link href="/areas/progreso" className="enlace">
          Ver mi progreso
        </Link>
      </div>
    </main>
  );
}
