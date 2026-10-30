// Sección «Pausar» de la pantalla de editar (rutinas y hábitos).
// Pausar = deja de salir en Hoy hasta que la reanudes. No se borra nada.
export function SeccionPausa({
  accion,
  id,
  campo,
  activo,
  que,
}: {
  accion: (formData: FormData) => Promise<void>;
  id: string;
  campo: string; // nombre del campo oculto que lee la acción
  activo: boolean;
  que: "rutina" | "hábito";
}) {
  const articulo = que === "rutina" ? "la" : "lo";
  return (
    <form
      action={accion}
      className="flex flex-col gap-2 border-t border-border pt-4"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name={campo} value={activo ? "no" : "si"} />
      <p className="text-sm text-muted">
        {activo
          ? `¿Un tiempo sin ${que === "rutina" ? "esta rutina" : "este hábito"}? Si ${articulo} pausas, deja de salir en Hoy hasta que ${articulo} reanudes. No se borra nada.`
          : `${que === "rutina" ? "Esta rutina está en pausa" : "Este hábito está en pausa"}: no sale en Hoy.`}
      </p>
      <button type="submit" className="button-secondary self-start text-sm">
        {activo ? "Pausar" : "Reanudar"}
      </button>
    </form>
  );
}
