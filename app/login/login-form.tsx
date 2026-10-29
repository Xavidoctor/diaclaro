"use client";

import { useActionState } from "react";
import { enviarEnlace, type LoginState } from "@/app/login/actions";

const estadoInicial: LoginState = { enviado: false };

// "Usar otro email" vuelve al principio; el resto envía el enlace.
async function accion(prev: LoginState, formData: FormData) {
  if (formData.get("intencion") === "otro-email") return estadoInicial;
  return enviarEnlace(prev, formData);
}

export function LoginForm({ errorInicial }: { errorInicial?: string }) {
  const [estado, formAction, enviando] = useActionState(accion, {
    ...estadoInicial,
    error: errorInicial,
  });

  if (estado.enviado) {
    return (
      <form action={formAction} className="card flex flex-col gap-4">
        <p>
          Te he enviado un enlace a <strong>{estado.email}</strong>.
        </p>
        <p className="text-sm text-muted">
          Ábrelo en este mismo móvil u ordenador y entrarás directamente. Si no
          lo ves, mira en la carpeta de spam.
        </p>
        <button
          type="submit"
          name="intencion"
          value="otro-email"
          className="text-sm text-muted underline"
        >
          Usar otro email
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Tu email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          className="input"
        />
      </label>

      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="button-primary">
        {enviando ? "Un momento…" : "Enviarme un enlace"}
      </button>
    </form>
  );
}
