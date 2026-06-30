import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import rotainstayLogo from "@/assets/rotainstay-logo.svg.asset.json";

type NavItem = { label: string; to: string };

const NAV: NavItem[] = [
  { label: "Todas as propriedades", to: "/propriedades" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Anuncie sua casa", to: "/anuncie" },
];

const WHAT_TO_DO: { label: string; to: string }[] = [
  { label: "Atrações", to: "/atracoes" },
  { label: "Restaurantes", to: "/restaurantes" },
  { label: "Passeios", to: "/passeios" },
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
  const whatToDoActive = WHAT_TO_DO.some((i) => pathname.startsWith(i.to));
  const [whatToDoOpen, setWhatToDoOpen] = useState(false);

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
        <Link to="/" className="flex items-center" aria-label="RotainStay — Nas Montanhas">
          <img
            src={rotainstayLogo.url}
            alt="RotainStay — Nas Montanhas"
            className="h-14 w-auto shrink-0 sm:h-16 md:h-20"
          />
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
          <div
            className="relative"
            onMouseEnter={() => setWhatToDoOpen(true)}
            onMouseLeave={() => setWhatToDoOpen(false)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 transition-colors duration-200"
              style={{
                fontWeight: 500,
                fontSize: 14,
                color: whatToDoActive ? "#6B7052" : "#1C1C1A",
                borderBottom: whatToDoActive
                  ? "2px solid #6B7052"
                  : "2px solid transparent",
                paddingBottom: 4,
              }}
              aria-expanded={whatToDoOpen}
            >
              O que fazer
              <ChevronDown className="h-3 w-3" />
            </button>
            {whatToDoOpen && (
              <div
                className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2"
              >
                <div
                  className="min-w-[180px] overflow-hidden rounded-md border bg-white shadow-lg"
                  style={{ borderColor: "#E2E1DD" }}
                >
                  {WHAT_TO_DO.map((it) => (
                    <Link
                      key={it.to}
                      to={it.to}
                      className="block px-4 py-2.5 text-sm transition-colors hover:bg-secondary"
                      style={{ color: "#1C1C1A" }}
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
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
              <div
                style={{
                  padding: "12px 16px 6px",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9A9890",
                }}
              >
                O que fazer
              </div>
              {WHAT_TO_DO.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontWeight: 500,
                    fontSize: 15,
                    color: pathname.startsWith(item.to) ? "#6B7052" : "#1C1C1A",
                    padding: "12px 24px",
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