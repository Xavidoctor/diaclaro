import { listarHabitos, listarRegistrosEntre } from "@/lib/data/habitos";
import { conRecordatorio, habitosDelDia } from "@/lib/planner/habitos";
import { ListaRecordatorios } from "@/app/componentes/lista-recordatorios";

// Recordatorios de hábitos, arriba en Hoy. Aquí se buscan los hábitos de hoy
// con hora de recordatorio y nada apuntado; la hora se mira en el navegador
// (ListaRecordatorios), así aparecen solos aunque tengas Hoy abierto.
export async function RecordatoriosHabitos({
  hoy,
  zona,
}: {
  hoy: string;
  zona: string;
}) {
  // Si algo falla (por ejemplo, aún no existe la columna), Hoy sigue funcionando.
  const datos = await Promise.all([
    listarHabitos(),
    listarRegistrosEntre(hoy, hoy),
  ]).catch(() => null);
  if (!datos) return null;
  const [habitos, registros] = datos;
  const candidatos = conRecordatorio(habitosDelDia(habitos, registros, hoy));
  if (candidatos.length === 0) return null;

  return (
    <ListaRecordatorios
      hoy={hoy}
      zona={zona}
      habitos={candidatos.map((h) => ({
        id: h.id,
        title: h.title,
        unit: h.unit,
        direction: h.direction,
        remind_at: h.remind_at,
      }))}
    />
  );
}
