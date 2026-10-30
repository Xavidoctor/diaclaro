import { BotonRestablecer } from "@/app/componentes/boton-restablecer";
import { SaberMas } from "@/app/componentes/saber-mas";
import { leerCuentaDemo } from "@/lib/data/demo";

// Aviso arriba de Hoy cuando usas una cuenta de prueba. En una cuenta real
// no sale nada.
export async function AvisoDemo() {
  const numero = await leerCuentaDemo();
  if (!numero) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
      <h2 className="font-semibold">Cuenta de prueba {numero}</h2>
      <SaberMas resumen="Toca lo que quieras: se puede dejar como nueva.">
        <p>
          «Restablecer» borra todo lo de esta cuenta y vuelve a poner los
          datos de ejemplo.
        </p>
        <p>
          Esta cuenta la usa más gente: no escribas nada privado. No se puede
          conectar Google ni activar avisos, y la IA se puede usar 5 veces al
          día.
        </p>
      </SaberMas>
      <BotonRestablecer />
    </section>
  );
}
