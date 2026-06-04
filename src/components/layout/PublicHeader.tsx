import { Link } from "@tanstack/react-router";

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

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <MountainsMark className="h-9 w-auto shrink-0" />
          <span className="flex flex-col leading-tight">
            <span
              className="font-semibold"
              style={{ fontSize: "20px", fontWeight: 600, color: "#6B7052" }}
            >
              RotainStay
            </span>
            <span style={{ fontSize: "12px", fontWeight: 400, color: "#9A9890" }}>
              Nas Montanhas
            </span>
          </span>
        </Link>

        <Link
          to="/admin/login"
          className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}

export default PublicHeader;