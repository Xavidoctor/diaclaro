import { redirect } from "next/navigation";

// Tu perfil ahora está dentro de «Tú y tus ajustes» (/ajustes), arriba del
// todo. Esta dirección sigue funcionando para no romper enlaces viejos.
export default function PerfilPage() {
  redirect("/ajustes#perfil");
}
