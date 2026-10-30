import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Enlace para volver a la pantalla anterior: "‹ Áreas", "‹ Agenda"...
export function EnlaceVolver({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="enlace -ml-1 inline-flex min-h-11 items-center gap-0.5 self-start text-sm"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
