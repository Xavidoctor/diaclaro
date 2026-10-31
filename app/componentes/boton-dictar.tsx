"use client";

import { Mic } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { juntarDictado, mensajeErrorDictado } from "@/lib/planner/dictado";

// Botón de micrófono para apuntar hablando. Usa el dictado que ya trae el
// navegador (gratis, sin IA): lo que dices se escribe en el cuadro y luego tú
// decides si lo guardas con «+» o se lo pasas a tu asistente con ✨.
// Si el navegador no sabe dictar (por ejemplo, Firefox), el botón no sale.

// Lo mínimo de la Web Speech API que usamos. TypeScript no la trae.
type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type ConstructorReconocimiento = new () => Reconocimiento;

function constructorDictado(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const nadaQueEscuchar = () => () => {};

// «onAviso» recibe un mensaje si algo falla (o null para borrarlo), para que
// el cuadro lo enseñe donde ya enseña sus avisos.
export function BotonDictar({
  caja,
  onAviso,
}: {
  caja: RefObject<HTMLTextAreaElement | null>;
  onAviso: (mensaje: string | null) => void;
}) {
  // En el servidor siempre es «no»; en el móvil se mira el navegador.
  const soportado = useSyncExternalStore(
    nadaQueEscuchar,
    () => constructorDictado() !== null,
    () => false,
  );
  const [escuchando, setEscuchando] = useState(false);
  const actual = useRef<Reconocimiento | null>(null);

  // Si sales de la pantalla mientras escucha, el micrófono se apaga.
  useEffect(() => () => actual.current?.stop(), []);

  if (!soportado) return null;

  function alternar() {
    if (actual.current) {
      actual.current.stop();
      return;
    }
    const Dictado = constructorDictado();
    if (!Dictado) return;
    const r = new Dictado();
    r.lang = "es-ES";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const texto = Array.from(e.results)
        .map((resultado) => resultado[0]?.transcript ?? "")
        .join(" ");
      const cuadro = caja.current;
      if (!cuadro) return;
      cuadro.value = juntarDictado(cuadro.value, texto);
      cuadro.focus();
    };
    r.onerror = (e) => onAviso(mensajeErrorDictado(e.error));
    r.onend = () => {
      actual.current = null;
      setEscuchando(false);
    };
    actual.current = r;
    onAviso(null);
    setEscuchando(true);
    try {
      r.start();
    } catch {
      actual.current = null;
      setEscuchando(false);
      onAviso(mensajeErrorDictado(""));
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuchando ? "Parar el dictado" : "Apuntar hablando"}
      aria-pressed={escuchando}
      title={escuchando ? "Te escucho… pulsa para parar" : "Apuntar hablando"}
      className={`h-12 w-12 shrink-0 p-0 ${
        escuchando ? "button-primary animate-pulse" : "button-secondary"
      }`}
    >
      <Mic aria-hidden className="mx-auto h-5 w-5" />
    </button>
  );
}
