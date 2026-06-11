import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Trash2, Star, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listLegalDocs,
  uploadLegalDoc,
  setCurrentLegalDoc,
  deleteLegalDocVersion,
  type LegalDocType,
} from "@/lib/legal.functions";

const LABELS: Record<LegalDocType, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function LegalDocSection({ docType }: { docType: LegalDocType }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const list = useServerFn(listLegalDocs);
  const upload = useServerFn(uploadLegalDoc);
  const setCurrent = useServerFn(setCurrentLegalDoc);
  const remove = useServerFn(deleteLegalDocVersion);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["legal_docs", docType],
    queryFn: () => list({ data: { docType } }),
  });

  const current = docs?.find((d) => d.is_current) ?? null;
  const history = (docs ?? []).filter((d) => !d.is_current);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["legal_docs", docType] });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("docType", docType);
      fd.set("file", file);
      await upload({ data: fd });
      toast.success(`${LABELS[docType]} atualizada.`);
      await invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSetCurrent(id: string, version: number) {
    if (!confirm(`Tornar a versão ${version} a atual?`)) return;
    try {
      await setCurrent({ data: { id } });
      toast.success(`Versão ${version} agora é a atual.`);
      await invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function handleDelete(id: string, version: number) {
    if (!confirm(`Excluir a versão ${version}? Esta ação não pode ser desfeita.`))
      return;
    try {
      await remove({ data: { id } });
      toast.success(`Versão ${version} excluída.`);
      await invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-input p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-medium">{LABELS[docType]}</h3>
        {current && (
          <span className="text-xs text-muted-foreground">
            Versão atual: v{current.version}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : current ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href={current.signed_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {current.original_filename}
          </a>
          <span className="text-xs text-muted-foreground">
            {formatBytes(current.file_size)} ·{" "}
            {format(new Date(current.created_at), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })}
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum documento cadastrado ainda.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Enviando..." : "Enviar nova versão (PDF)"}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {showHistory
              ? "Ocultar versões anteriores"
              : `Ver ${history.length} versão(ões) anterior(es)`}
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-2">
              {history.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="font-medium">v{d.version}</span>
                    <a
                      href={d.signed_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {d.original_filename}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetCurrent(d.id, d.version)}
                      title="Tornar atual"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(d.id, d.version)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function LegalDocsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Termos de Uso e Política de Privacidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12px]" style={{ color: "#9A9890" }}>
          Envie um PDF para cada documento. A versão marcada como atual é
          exibida no rodapé do site e no formulário de reserva. O histórico
          fica disponível para reverter quando necessário.
        </p>
        <LegalDocSection docType="terms" />
        <LegalDocSection docType="privacy" />
      </CardContent>
    </Card>
  );
}