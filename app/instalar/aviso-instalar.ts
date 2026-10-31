"use client";

// Chrome y Edge avisan con el evento «beforeinstallprompt» cuando la app se
// puede instalar. Lo guardamos aquí para usarlo al pulsar «Instalar».
// (Safari y Firefox no lo tienen: allí se instala siguiendo los pasos.)

type AvisoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const EVENTO = "diaclaro:instalable";
let aviso: AvisoInstalar | null = null;

export function guardarAvisoInstalar(e: Event) {
  aviso = e as AvisoInstalar;
  window.dispatchEvent(new Event(EVENTO));
}

export function hayAvisoInstalar() {
  return aviso !== null;
}

export function suscribirAvisoInstalar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("appinstalled", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("appinstalled", avisar);
  };
}

// Abre la ventanita de instalar del navegador. Solo se puede usar una vez.
export async function pedirInstalar(): Promise<boolean> {
  if (!aviso) return false;
  const actual = aviso;
  aviso = null;
  window.dispatchEvent(new Event(EVENTO));
  await actual.prompt();
  const { outcome } = await actual.userChoice;
  return outcome === "accepted";
}
