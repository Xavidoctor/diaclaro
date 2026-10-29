import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">DíaClaro</h1>
        <p className="text-muted">
          Entra con tu email. Te enviaré un código, sin contraseñas.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
