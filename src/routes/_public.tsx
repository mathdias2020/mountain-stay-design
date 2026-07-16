import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { cn } from "@/lib/utils";

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
      <PublicFooter
        className={cn(
          isPropertiesRoute && "pb-32 sm:pb-0",
        )}
      />
      <FloatingWhatsApp />
    </div>
  );
}