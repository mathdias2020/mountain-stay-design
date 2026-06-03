import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Entrar — RotainStay" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Entrar</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Formulário de login será adicionado em breve.
        </p>
      </div>
    </div>
  );
}