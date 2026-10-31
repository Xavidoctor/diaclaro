import { Lock, LockOpen } from "lucide-react";
import { fijarRutina } from "@/app/agenda/acciones-mover";

// Sección «Hora fija» de la pantalla de editar una rutina.
// Fija = no se mueve en la lista del día de la Agenda (como una clase o el
// trabajo). Sin fijar = la mantienes pulsada y la mueves arriba o abajo.
export function SeccionHoraFija({ id, fija }: { id: string; fija: boolean }) {
  return (
    <form
      action={fijarRutina}
      className="flex flex-col gap-2 border-t border-border pt-4"
    >
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
  );
}
