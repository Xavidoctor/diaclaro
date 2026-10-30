"use client";

import { useState } from "react";
import { aBase64Url, sqlGuardarSecreto } from "@/lib/planner/avisos";

type Claves = { publica: string; privada: string; secreto: string };

// Crea en tu navegador las claves de los avisos. No se guardan en ningún sitio
// ni se envían: solo se enseñan para que las copies a Vercel y a Supabase.
async function crearClaves(): Promise<Claves> {
  const par = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
  const publica = new Uint8Array(
    await crypto.subtle.exportKey("raw", par.publicKey),
  );
  const privada = await crypto.subtle.exportKey("jwk", par.privateKey);
  return {
    publica: aBase64Url(publica),
    privada: privada.d as string,
    secreto: aBase64Url(crypto.getRandomValues(new Uint8Array(32))),
  };
}

export function PrepararClaves() {
  const [claves, setClaves] = useState<Claves | null>(null);

  if (!claves)
    return (
      <button
        type="button"
        onClick={() => crearClaves().then(setClaves)}
        className="button-primary"
      >
        Crear las claves
      </button>
    );

  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="text-sm font-medium">
        No hagas captura de esta pantalla ni pegues estas claves en ningún chat.
        Cópialas directamente con el botón «Copiar».
      </p>
      <Valor nombre="VAPID_PUBLIC_KEY" valor={claves.publica} />
      <Valor nombre="VAPID_PRIVATE_KEY" valor={claves.privada} />
      <Valor nombre="AVISOS_SECRETO" valor={claves.secreto} />
      <Valor
        nombre="Para Supabase (SQL Editor)"
        valor={sqlGuardarSecreto(claves.secreto)}
      />
      <p className="text-sm text-muted">
        Si cierras esta pantalla antes de terminar, no pasa nada: vuelve a
        crearlas y usa las nuevas en todos los sitios.
      </p>
    </div>
  );
}

function Valor({ nombre, valor }: { nombre: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{nombre}</span>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={valor}
          aria-label={nombre}
          className="input flex-1 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(valor)
              .then(() => setCopiado(true))
              .catch(() => {})
          }
          className="rounded-xl border border-border px-3 py-2"
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
