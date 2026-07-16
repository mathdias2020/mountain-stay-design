import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const router = useRouter();
  const isPropertiesRoute = router.state.location.pathname === "/propriedades";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      {isPropertiesRoute && (
        <div
          className="h-24 shrink-0 bg-primary sm:hidden"
          aria-hidden="true"
        />
      )}
      <FloatingWhatsApp />
    </div>
  );
}