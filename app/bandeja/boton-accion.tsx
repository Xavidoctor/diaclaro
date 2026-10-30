// Un botón que lanza una acción con el id de la nota o tarea (y, si hace falta, un dato más).
export function BotonAccion({
  accion,
  id,
  campo,
  peligro,
  children,
}: {
  accion: (formData: FormData) => Promise<void>;
  id: string;
  campo?: [string, string];
  peligro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      {campo && <input type="hidden" name={campo[0]} value={campo[1]} />}
      <button
        type="submit"
        className={
          peligro ? "text-danger underline" : "text-foreground underline"
        }
      >
        {children}
      </button>
    </form>
  );
}
