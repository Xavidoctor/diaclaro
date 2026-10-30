import Link from "next/link";

// Enlace al historial largo de un hábito (por semanas).
export function EnlaceHistorial({ id }: { id: string }) {
  return (
    <Link href={`/habitos/${id}/historial`} className="text-sm underline">
      Ver historial por semanas
    </Link>
  );
}
