import { Lock, LockOpen, Video } from "lucide-react";
import { fijarRutina, marcarGrabada } from "@/app/agenda/acciones-mover";

// Sección «Hora fija» de la pantalla de editar una rutina.
// Fija = no se mueve en el día de la Agenda (como una clase o el trabajo).
// Sin fijar = la mantienes pulsada y la mueves arriba o abajo.
// Y si es una clase fija: «Clase grabada». Si se junta con otra que no lo
// está, la app te la deja para verla en otro momento.
export function SeccionHoraFija({
  id,
  fija,
  grabada,
}: {
  id: string;
  fija: boolean;
  grabada: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <form action={fijarRutina} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="fija" value={fija ? "no" : "si"} />
        <p className="flex items-center gap-2 text-sm">
          {fija ? (
            <Lock aria-hidden className="size-4 text-primary" />
          ) : (
            <LockOpen aria-hidden className="size-4 text-primary" />
          )}
          {fija
            ? "Hora fija: no se mueve en la Agenda."
            : "Hora flexible: en la Agenda puedes moverla de hora un día concreto."}
        </p>
        <button type="submit" className="button-secondary self-start text-sm">
          {fija ? "Que se pueda mover" : "Fijar su hora"}
        </button>
      </form>

      {fija && (
        <form action={marcarGrabada} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="grabada" value={grabada ? "no" : "si"} />
          <p className="flex items-center gap-2 text-sm">
            <Video aria-hidden className="size-4 text-primary" />
            {grabada
              ? "Clase grabada: si se junta con otra que no lo está, te la dejo para verla en otro momento."
              : "¿Está grabada? Si se junta con otra clase, irás a la otra y esta la verás en otro momento."}
          </p>
          <button type="submit" className="button-secondary self-start text-sm">
            {grabada ? "No está grabada" : "Es una clase grabada"}
          </button>
        </form>
      )}
    </div>
  );
}
