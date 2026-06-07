import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_admin/admin/submissoes")({
  head: () => ({ meta: [{ title: "Submissões — RotainStay" }] }),
  component: SubmissionsAdmin,
});

type Submission = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  house_description: string;
  bedrooms: number;
  max_guests: number;
  desired_daily_rate: number | string;
  photo_url: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  recusada: "Recusada",
  arquivada: "Arquivada",
};
const STATUS_META: Record<string, { bg: string; fg: string }> = {
  pendente: { bg: "#FFF4E0", fg: "#8A5A12" },
  em_analise: { bg: "#E2F1FB", fg: "#0C447C" },
  aprovada: { bg: "#D4EDDA", fg: "#1A5C2A" },
  recusada: { bg: "#FADCD9", fg: "#7A1F1A" },
  arquivada: { bg: "#ECEBE7", fg: "#5C5B57" },
};

function formatBRL(v: number | string) {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n || 0);
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SubmissionsAdmin() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useMemo(() => {
    const id = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "submissions", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("property_submissions")
        .select(
          "id, name, whatsapp, email, city, house_description, bedrooms, max_guests, desired_daily_rate, photo_url, message, status, admin_notes, created_at",
        )
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Submission[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) => {
      const blob =
        `${r.name} ${r.whatsapp} ${r.house_description}`.toLowerCase();
      return blob.includes(search);
    });
  }, [rows, search]);

  const current = useMemo(
    () => filtered.find((r) => r.id === openId) ?? null,
    [filtered, openId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>
          Submissões de proprietários
        </h1>
        <p style={{ fontSize: 14, color: "#9A9890", marginTop: 4 }}>
          Casas enviadas para análise pela RotainStay.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="recusada">Recusadas</SelectItem>
            <SelectItem value="arquivada">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por nome, WhatsApp ou descrição"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm bg-white"
        />
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          className="hidden md:grid md:items-center md:gap-3 md:px-4 md:py-3 md:[grid-template-columns:130px_1.3fr_1.5fr_1.6fr_1.4fr_110px_100px]"
          style={{ fontSize: 12, color: "#9A9890", borderBottom: "1px solid #ECEBE7" }}
        >
          <div>Data</div>
          <div>Nome</div>
          <div>Contato</div>
          <div>Casa</div>
          <div>Detalhes</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-text-muted">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">Nenhuma submissão.</div>
        ) : (
          filtered.map((r, idx) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pendente;
            return (
              <div
                key={r.id}
                className="grid items-center gap-3 px-4 py-3 [grid-template-columns:1fr_auto] md:[grid-template-columns:130px_1.3fr_1.5fr_1.6fr_1.4fr_110px_100px]"
                style={{
                  background: idx % 2 === 1 ? "#F5F4F1" : "#fff",
                  borderBottom: "1px solid #ECEBE7",
                }}
              >
                <div className="hidden md:block" style={{ fontSize: 12, color: "#5C5B57" }}>
                  {formatDateTime(r.created_at)}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "#2F2E2A" }}>{r.name}</div>
                  <div className="md:hidden" style={{ fontSize: 12, color: "#9A9890" }}>
                    {formatDateTime(r.created_at)}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div style={{ fontSize: 13, color: "#2F2E2A" }}>{r.whatsapp}</div>
                  <div style={{ fontSize: 12, color: "#9A9890" }}>{r.email}</div>
                </div>
                <div className="hidden md:block">
                  <div style={{ fontSize: 13, color: "#2F2E2A" }}>{r.house_description}</div>
                  <div style={{ fontSize: 12, color: "#9A9890" }}>{r.city}</div>
                </div>
                <div className="hidden md:block" style={{ fontSize: 12, color: "#5C5B57" }}>
                  {r.bedrooms} quartos · {r.max_guests} hóspedes · {formatBRL(r.desired_daily_rate)}/noite
                </div>
                <div className="hidden md:block">
                  <Badge
                    variant="outline"
                    style={{ background: meta.bg, color: meta.fg, borderColor: "transparent" }}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Ver detalhes"
                    onClick={() => setOpenId(r.id)}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="WhatsApp"
                    asChild
                  >
                    <a
                      href={`https://wa.me/55${r.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={16} />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SubmissionDialog
        submission={current}
        onClose={() => setOpenId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "submissions"] });
          qc.invalidateQueries({
            queryKey: ["admin", "submissions", "pending-count"],
          });
        }}
      />
    </div>
  );
}

function SubmissionDialog({
  submission,
  onClose,
  onSaved,
}: {
  submission: Submission | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<string>(submission?.status ?? "pendente");
  const [notes, setNotes] = useState<string>(submission?.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  // Reset on open
  useMemo(() => {
    if (submission) {
      setStatus(submission.status);
      setNotes(submission.admin_notes ?? "");
    }
  }, [submission]);

  if (!submission) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("property_submissions")
      .update({ status, admin_notes: notes || null })
      .eq("id", submission.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações.");
      return;
    }
    toast.success("Submissão atualizada.");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>Submissão de {submission.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section>
            <h4 style={{ fontWeight: 600, color: "#9A9890", fontSize: 12, textTransform: "uppercase" }}>
              Contato
            </h4>
            <div className="mt-2 space-y-1">
              <div><span className="text-text-muted">Nome:</span> {submission.name}</div>
              <div>
                <span className="text-text-muted">WhatsApp:</span>{" "}
                <a
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/55${submission.whatsapp}`}
                >
                  {submission.whatsapp}
                </a>
              </div>
              <div>
                <span className="text-text-muted">E-mail:</span>{" "}
                <a className="text-primary hover:underline" href={`mailto:${submission.email}`}>
                  {submission.email}
                </a>
              </div>
            </div>
          </section>

          <section>
            <h4 style={{ fontWeight: 600, color: "#9A9890", fontSize: 12, textTransform: "uppercase" }}>
              Sobre a casa
            </h4>
            <div className="mt-2 space-y-1">
              <div><span className="text-text-muted">Cidade:</span> {submission.city}</div>
              <div><span className="text-text-muted">Descrição:</span> {submission.house_description}</div>
              <div><span className="text-text-muted">Quartos:</span> {submission.bedrooms}</div>
              <div><span className="text-text-muted">Capacidade:</span> {submission.max_guests} hóspedes</div>
              <div>
                <span className="text-text-muted">Diária pretendida:</span>{" "}
                {formatBRL(submission.desired_daily_rate)}
              </div>
            </div>
          </section>

          <section>
            {submission.photo_url ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={async () => {
                  const { data, error } = await supabase.storage
                    .from("submission-photos")
                    .createSignedUrl(submission.photo_url!, 60 * 10);
                  if (error || !data?.signedUrl) {
                    toast.error("Não foi possível abrir a foto.");
                    return;
                  }
                  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Ver foto da casa
              </button>
            ) : (
              <span className="text-text-muted text-sm">Sem foto enviada</span>
            )}
          </section>

          {submission.message && (
            <section>
              <h4 style={{ fontWeight: 600, color: "#9A9890", fontSize: 12, textTransform: "uppercase" }}>
                Mensagem
              </h4>
              <p className="mt-2 whitespace-pre-line text-text-secondary">
                {submission.message}
              </p>
            </section>
          )}

          <section className="space-y-3 border-t pt-4" style={{ borderColor: "#ECEBE7" }}>
            <h4 style={{ fontWeight: 600, color: "#2F2E2A", fontSize: 14 }}>
              Status e anotações
            </h4>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Anotações internas</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}