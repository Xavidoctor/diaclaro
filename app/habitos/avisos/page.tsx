import type { Metadata } from "next";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { AvisosDispositivo } from "@/app/habitos/avisos/avisos-dispositivo";
import { PrepararClaves } from "@/app/habitos/avisos/preparar-claves";
import { avisosConfigurados, clavePublica } from "@/lib/avisos/web-push";

export const metadata: Metadata = { title: "Avisos" };

// Avisos con la app cerrada: activarlos en este dispositivo y, la primera vez,
// preparar las claves.
export default function AvisosPage() {
  const clave = clavePublica();
  const listo = avisosConfigurados() && clave !== null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/habitos">Hábitos</EnlaceVolver>
      <h1 className="text-3xl font-semibold tracking-tight">
        Avisos con la app cerrada
      </h1>
      <p className="text-sm text-muted">
        Si un hábito tiene hora de recordatorio y a esa hora aún no has apuntado
        nada, te llega un aviso al móvil, aunque DíaClaro esté cerrada. Solo uno
        por hábito y día. Se activa en cada dispositivo por separado.
      </p>

      {listo ? (
        <AvisosDispositivo clave={clave} />
      ) : (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Falta preparar las claves</h2>
          <p className="text-sm text-muted">
            Solo hace falta una vez, para toda la app. Pulsa el botón y sigue
            los pasos de la guía (README, apartado «Avisos con la app cerrada»).
          </p>
          <PrepararClaves />
        </section>
      )}
    </main>
  );
}
