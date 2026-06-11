import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

function MountainsMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 36"
      fill="none"
      stroke="#6B7052"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 32 L22 8 L34 22 L42 14 L60 32 Z" />
      <path d="M17 15 L22 10 L27 15" />
      <path d="M39 17 L42 14 L45 17" />
      <path d="M10 28 q4 -2 8 0" />
      <path d="M46 26 q4 -2 8 0" />
    </svg>
  );
}

type NavItem = { label: string; to: string };

const NAV: NavItem[] = [
  { label: "Todas as propriedades", to: "/propriedades" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Anuncie sua casa", to: "/anuncie" },
];

export function PublicHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const isActive = (to: string) => pathname === to;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-white transition-shadow duration-200",
      )}
      style={{
        borderBottomColor: "#E2E1DD",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <Link to="/" className="flex items-center gap-3">
          <MountainsMark className="h-9 w-auto shrink-0" />
          <span className="flex flex-col leading-tight">
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#6B7052" }}>
              RotainStay
            </span>
            <span style={{ fontSize: "12px", fontWeight: 400, color: "#9A9890" }}>
              Nas Montanhas
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn("transition-colors duration-200")}
                style={{
                  fontWeight: 500,
                  fontSize: 14,
                  color: active ? "#6B7052" : "#1C1C1A",
                  borderBottom: active ? "2px solid #6B7052" : "2px solid transparent",
                  paddingBottom: 4,
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#6B7052";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#1C1C1A";
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/login"
            className="hidden md:inline-flex text-sm font-medium text-text-primary hover:text-primary transition-colors"
          >
            Entrar
          </Link>
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary hover:bg-secondary"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Fechar overlay"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute right-0 top-0 flex h-full flex-col bg-white"
            style={{ width: 280 }}
          >
            <div className="flex items-center justify-end px-4 py-3 border-b" style={{ borderColor: "#E2E1DD" }}>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontWeight: 500,
                    fontSize: 15,
                    color: isActive(item.to) ? "#6B7052" : "#1C1C1A",
                    padding: 16,
                    borderBottom: "1px solid #E2E1DD",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t" style={{ borderColor: "#E2E1DD" }}>
              <Link
                to="/admin/login"
                onClick={() => setMobileOpen(false)}
                className="block"
              >
                <Button variant="primary" className="w-full">
                  Entrar
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

export default PublicHeader;