"use client";

import { useActionState } from "react";
import {
  enviarCodigo,
  verificarCodigo,
  type LoginState,
} from "@/app/login/actions";

const estadoInicial: LoginState = { paso: "email" };

// Decide qué acción usar según el paso en el que estemos.
async function accion(prev: LoginState, formData: FormData) {
  if (formData.get("intencion") === "otro-email") return estadoInicial;
  return prev.paso === "email"
    ? enviarCodigo(prev, formData)
    : verificarCodigo(prev, formData);
}

export function LoginForm() {
  const [estado, formAction, enviando] = useActionState(accion, estadoInicial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {estado.paso === "email" ? (
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
      ) : (
        <>
          <input type="hidden" name="email" value={estado.email} />
          <p className="text-sm text-muted">
            Te he enviado un código a <strong>{estado.email}</strong>.
          </p>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Código
            <input
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              className="input tracking-widest"
            />
          </label>
        </>
      )}

      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="button-primary">
        {enviando
          ? "Un momento…"
          : estado.paso === "email"
            ? "Enviarme un código"
            : "Entrar"}
      </button>

      {estado.paso === "codigo" && (
        <button
          type="submit"
          name="intencion"
          value="otro-email"
          formNoValidate
          className="text-sm text-muted underline"
        >
          Usar otro email
        </button>
      )}
    </form>
  );
}
