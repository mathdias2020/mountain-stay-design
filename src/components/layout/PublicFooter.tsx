import { LegalLink } from "@/components/legal/LegalLink";
import { cn } from "@/lib/utils";

interface PublicFooterProps {
  className?: string;
}

export function PublicFooter({ className }: PublicFooterProps) {
  return (
    <footer className={cn("bg-primary text-white", className)}>
      <div className="mx-auto max-w-7xl px-6 py-8 text-center">
        <p className="font-semibold">RotainStay — Nas Montanhas</p>
        <p
          className="mt-1"
          style={{ fontSize: "13px", fontWeight: 400, color: "#DDDCD9" }}
        >
          © 2025 RotainStay. Todos os direitos reservados.
        </p>
        <p
          className="mt-3 flex justify-center gap-4"
          style={{ fontSize: "13px", color: "#DDDCD9" }}
        >
          <LegalLink docType="terms">Termos de Uso</LegalLink>
          <span aria-hidden="true">·</span>
          <LegalLink docType="privacy">Política de Privacidade</LegalLink>
        </p>
      </div>
    </footer>
  );
}

export default PublicFooter;