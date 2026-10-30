"use client";

import { useActionState, useState } from "react";
import { Lightbulb } from "lucide-react";
import { guardarPerfilAction, type PerfilState } from "@/app/perfil/actions";
import { SaberMas } from "@/app/componentes/saber-mas";
import { FRASES_SUGERIDAS, type Perfil } from "@/lib/planner/perfil";

// Nombre, edad, un dato sobre ti y tu frase. Todo es opcional.
export function FormPerfil({ perfil }: { perfil: Perfil }) {
  const [estado, formAction, guardando] = useActionState<PerfilState, FormData>(
    guardarPerfilAction,
    {},
  );
  // La frase se guarda en el estado para poder rellenarla con una idea.
  const [frase, setFrase] = useState(perfil.motto ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <SaberMas resumen="Todo es opcional.">
        Solo lo ves tú. Tu nombre sale en el saludo de Hoy y tu frase, arriba
        del panel «Tu estado».
      </SaberMas>

      <label className="flex flex-col gap-1 text-sm">
        Cómo quieres que te llame
        <input
          name="display_name"
          defaultValue={perfil.display_name ?? ""}
          maxLength={40}
          autoComplete="given-name"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Edad
        <input
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          defaultValue={perfil.age ?? ""}
          className="input w-28"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Un dato sobre ti
        <input
          name="about"
          defaultValue={perfil.about ?? ""}
          maxLength={80}
          placeholder="Por ejemplo, a qué te dedicas"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Tu frase
        <textarea
          name="motto"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="Algo que te anime a seguir"
          className="input"
        />
      </label>

      {/* Ideas de frases: escondidas hasta que las pides. */}
      <details className="group rounded-xl bg-secondary">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
          <Lightbulb aria-hidden className="size-4" />
          Dame ideas de frases
        </summary>
        <ul className="flex flex-col gap-1 px-2 pb-2">
          {FRASES_SUGERIDAS.map((f) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => setFrase(f)}
                aria-pressed={frase === f}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  frase === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface"
                }`}
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      </details>

      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-primary self-start py-2"
      >
        {guardando ? "Guardando…" : estado.guardado ? "Guardado" : "Guardar"}
      </button>
    </form>
  );
}
