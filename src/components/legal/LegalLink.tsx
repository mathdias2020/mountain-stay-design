import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCurrentLegalDoc, type LegalDocType } from "@/lib/legal.functions";
import { cn } from "@/lib/utils";

interface Props {
  docType: LegalDocType;
  children: React.ReactNode;
  className?: string;
}

export function LegalLink({ docType, children, className }: Props) {
  const fetchDoc = useServerFn(getCurrentLegalDoc);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const doc = await fetchDoc({ data: { docType } });
      if (!doc?.signed_url) {
        toast.error(
          docType === "terms"
            ? "Termos de uso ainda não disponíveis."
            : "Política de privacidade ainda não disponível.",
        );
        return;
      }
      window.open(doc.signed_url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      className={cn("underline underline-offset-2 hover:opacity-80", className)}
    >
      {children}
    </a>
  );
}