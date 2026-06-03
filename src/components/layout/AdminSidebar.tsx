import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  Calendar,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Visão Geral", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Reservas", url: "/admin/reservas", icon: ClipboardList },
  { title: "Propriedades", url: "/admin/propriedades", icon: Home },
  { title: "Calendário", url: "/admin/calendario", icon: Calendar },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const handleLogout = async () => {
    onNavigate?.();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <div className="flex h-full w-60 flex-col bg-primary text-white">
      <div className="px-5 py-5">
        <p className="text-lg font-semibold">RotainStay</p>
        <p className="text-xs text-white/60">Painel administrativo</p>
      </div>

      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.url, "exact" in item ? item.exact : false);
            const Icon = item.icon;
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-sm",
                    "border-l-[3px] border-transparent",
                    active
                      ? "bg-primary-dark text-white border-l-secondary"
                      : "text-white/85 hover:bg-primary-dark/60 hover:text-white",
                  )}
                  style={
                    active
                      ? { backgroundColor: "#565C40", borderLeftColor: "#DDDCD9" }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-sm font-semibold">RotainStay</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden">
        <span className="font-semibold text-primary">RotainStay</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-primary-dark"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;