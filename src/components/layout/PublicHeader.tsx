import { Link } from "@tanstack/react-router";
import { MountainLineArt } from "@/components/brand/MountainLineArt";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <MountainLineArt height={36} color="#6B7052" />
          <span className="flex flex-col leading-tight">
            <span
              className="font-semibold text-primary"
              style={{ fontSize: "20px", fontWeight: 600 }}
            >
              RotainStay
            </span>
            <span
              className="text-text-muted"
              style={{ fontSize: "12px", fontWeight: 400, color: "#9A9890" }}
            >
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