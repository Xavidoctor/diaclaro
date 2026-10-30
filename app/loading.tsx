import { BarraInferior } from "@/app/componentes/barra-inferior";

// Mientras se carga una pantalla (en el móvil con poca cobertura puede tardar
// un par de segundos) se ven unas tarjetas grises en vez de quedarse todo
// quieto. Así sabes que el toque ha funcionado.
export default function Cargando() {
  return (
    <>
      <main
        aria-busy="true"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8"
      >
        <p role="status" className="sr-only">
          Cargando…
        </p>
        <div className="h-9 w-40 animate-pulse rounded-xl bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      </main>
      <BarraInferior actual="" />
    </>
  );
}
