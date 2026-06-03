import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}