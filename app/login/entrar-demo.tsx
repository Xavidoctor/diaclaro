"use client";

import { useActionState } from "react";
import { entrarDemo } from "@/app/login/actions";
import { SaberMas } from "@/app/componentes/saber-mas";
import { CUENTAS_DEMO } from "@/lib/planner/demo";

// «¿Solo quieres probar?»: tres botones para entrar en una cuenta demo.
export function EntrarDemo() {
  const [error, formAction, entrando] = useActionState(entrarDemo, null);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
      <h2 className="font-semibold">¿Solo quieres probar?</h2>
      <SaberMas resumen="Entra en una cuenta de prueba, sin email.">
        <p>
          Tiene datos de ejemplo para que veas cómo funciona. Puedes tocar lo
          que quieras y, al acabar, pulsar «Restablecer» para dejarla como
          nueva.
        </p>
        <p>
          Estas cuentas las usa más gente: no escribas nada privado. Tampoco se
          puede conectar Google ni activar avisos, y la IA se puede usar 5
          veces al día.
        </p>
      </SaberMas>
      <form action={formAction} className="grid grid-cols-3 gap-2">
        {CUENTAS_DEMO.map((n) => (
          <button
            key={n}
            type="submit"
            name="demo"
            value={n}
            disabled={entrando}
            className="rounded-xl bg-card px-3 py-2 text-sm font-medium shadow-sm active:opacity-70 disabled:opacity-60"
          >
            Demo {n}
          </button>
        ))}
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
