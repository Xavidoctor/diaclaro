"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

// La miniatura que da Google. Si no carga (a veces Google no la deja ver
// fuera de Drive), sale un icono en su lugar.
export function Miniatura({ src }: { src: string | null }) {
  const [rota, setRota] = useState(false);
  if (!src || rota)
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-secondary">
        <FileText aria-hidden className="size-6" />
      </span>
    );
  return (
    // No pasa por el optimizador de imágenes de Next: es un enlace de Google.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setRota(true)}
      className="size-14 shrink-0 rounded-md bg-secondary object-cover"
    />
  );
}
