import type { Metadata } from "next";
import { EntrarDemo } from "@/app/login/entrar-demo";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // /auth/confirm nos manda aquí con ?error=enlace si el enlace no sirvió.
  const { error } = await searchParams;
  const errorInicial =
    error === "enlace"
      ? "El enlace no funciona o ha caducado. Pide uno nuevo."
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">DíaClaro</h1>
        <p className="text-muted">
          Entra con tu email. Te enviaré un enlace, sin contraseñas.
        </p>
      </div>
      <LoginForm errorInicial={errorInicial} />
      {/* Las cuentas de prueba solo salen si Vercel tiene DEMO_PASSWORD. */}
      {process.env.DEMO_PASSWORD && <EntrarDemo />}
    </main>
  );
}
