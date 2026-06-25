import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, MessageCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { updateReservationStatus } from "@/lib/reservation-status.functions";
import { deleteReservation } from "@/lib/reservation-delete.functions";
import {
  markDepositPaid,
  markContractSent,
  markContractSigned,
  markBalancePaid,
  updateBalanceNotes,
} from "@/lib/reservation-payment.functions";
import {
  formatBRL,
  formatDateBR,
  nightsBetween,
  onlyDigits,
  RESERVATION_STATUS_LABEL,
} from "@/lib/admin-format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BUCKET = "reservation-docs";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/jpg";

export const Route = createFileRoute("/_admin/admin/reservas/$id")({
  head: () => ({ meta: [{ title: "Reserva — RotainStay" }] }),
  component: ReservationDetailPage,
});

type Reservation = {
  id: string;
  reservation_code: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  num_adults: number;
  num_children: number;
  num_pets: number;
  num_vehicles: number;
  guest_name: string;
  guest_whatsapp: string;
  guest_email: string | null;
  how_found: string | null;
  guest_message: string | null;
  total_price: number | string;
  price_breakdown: any;
  admin_notes: string | null;
  property_id: string;
  property_name: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  coupon_discount_percent: number | string | null;
  coupon_discount_amount: number | string | null;
  deposit_amount: number | string | null;
  balance_amount: number | string | null;
  balance_due_date: string | null;
  deposit_paid_at: string | null;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  balance_paid_at: string | null;
  admin_balance_notes: string | null;
};

function statusColor(status: string) {
  switch (status) {
    case "confirmed":
      return { bg: "#E6F4EA", fg: "#1F6F35" };
    case "pending":
      return { bg: "#FFF4E0", fg: "#8A5A12" };
    case "awaiting_contract":
      return { bg: "#E8EEF7", fg: "#2F4F8A" };
    case "awaiting_balance":
      return { bg: "#FFF1D6", fg: "#7A4A0A" };
    case "cancelled":
      return { bg: "#FBE0DC", fg: "#A63C2E" };
    case "completed":
      return { bg: "#E2E5EA", fg: "#3F4757" };
    default:
      return { bg: "#EEE", fg: "#333" };
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#9A9890" }}>{label}</div>
      <div style={{ fontSize: 15, color: "#1C1C1A", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Card({
  children,
  className = "",
  bg = "#FFFFFF",
}: {
  children: React.ReactNode;
  className?: string;
  bg?: string;
}) {
  return (
    <section
      className={`rounded-[14px] p-6 ${className}`}
      style={{ backgroundColor: bg, boxShadow: "0 4px 14px -8px rgba(0,0,0,0.10)" }}
    >
      {children}
    </section>
  );
}

function ReservationDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ["admin", "reservation", id],
    queryFn: async () => {
      const { data: r } = await supabase
        .from("reservations")
        .select(
          "id, reservation_code, status, checkin_date, checkout_date, num_adults, num_children, num_pets, num_vehicles, guest_name, guest_whatsapp, guest_email, how_found, guest_message, total_price, price_breakdown, admin_notes, property_id, payment_method, coupon_code, coupon_discount_percent, coupon_discount_amount, deposit_amount, balance_amount, balance_due_date, deposit_paid_at, contract_sent_at, contract_signed_at, balance_paid_at, admin_balance_notes"
        )
        .eq("id", id)
        .maybeSingle();
      if (!r) return null;
      const { data: prop } = await supabase
        .from("properties")
        .select("name")
        .eq("id", r.property_id)
        .maybeSingle();
      return { ...r, property_name: prop?.name ?? null } as Reservation;
    },
  });

  const history = useQuery({
    queryKey: ["admin", "reservation-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservation_status_history")
        .select("id, old_status, new_status, note, changed_at")
        .eq("reservation_id", id)
        .order("changed_at", { ascending: false });
      return data ?? [];
    },
  });

  const documents = useQuery({
    queryKey: ["admin", "reservation-docs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservation_documents")
        .select("id, file_name, file_type, storage_path, created_at")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (detail.isLoading) {
    return <div className="text-muted-foreground">Carregando reserva...</div>;
  }
  if (!detail.data) {
    return (
      <div className="space-y-3">
        <p>Reserva não encontrada.</p>
        <Link to="/admin/reservas" className="text-sm hover:underline" style={{ color: "#6B7052" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const r = detail.data;
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "reservation", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "reservation-history", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "recent"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/admin/reservas" className="text-sm hover:underline" style={{ color: "#6B7052" }}>
          ← Voltar para reservas
        </Link>
        <DeleteReservationButton
          reservationId={r.id}
          reservationCode={r.reservation_code}
          guestName={r.guest_name}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "recent"] });
            navigate({ to: "/admin/reservas" });
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr] xl:grid-cols-[65fr_35fr]">
        <div className="space-y-4">
          <InformationCard r={r} />
          <GuestCard r={r} />
          {r.guest_message && (
            <div
              className="rounded-[10px] p-4 italic"
              style={{ backgroundColor: "#F5F4F1", color: "#1C1C1A" }}
            >
              <div style={{ fontSize: 12, color: "#9A9890", fontStyle: "normal" }} className="mb-1 not-italic">
                Mensagem do hóspede
              </div>
              {r.guest_message}
            </div>
          )}
          <DocumentsCard
            reservationId={r.id}
            documents={documents.data ?? []}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ["admin", "reservation-docs", id] })
            }
          />
          <HistoryCard history={history.data ?? []} />
        </div>

        <div className="space-y-4">
          <StatusCard reservation={r} onChanged={invalidateAll} />
          <PaymentContractCard reservation={r} onChanged={invalidateAll} />
          <PriceCard
            breakdown={r.price_breakdown}
            total={r.total_price}
            couponCode={r.coupon_code}
            couponPercent={r.coupon_discount_percent}
            couponAmount={r.coupon_discount_amount}
          />
          <NotesCard reservation={r} onSaved={invalidateAll} />
        </div>
      </div>
    </div>
  );
}

function InformationCard({ r }: { r: Reservation }) {
  const c = statusColor(r.status);
  const nights = nightsBetween(r.checkin_date, r.checkout_date);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1C1A" }}>{r.reservation_code}</h2>
        <Badge
          variant="outline"
          className="border-0 font-medium"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
        </Badge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Propriedade" value={r.property_name ?? "—"} />
        <Field label="Check-in" value={formatDateBR(r.checkin_date)} />
        <Field label="Check-out" value={formatDateBR(r.checkout_date)} />
        <Field label="Noites" value={`${nights} ${nights === 1 ? "noite" : "noites"}`} />
        <Field
          label="Hóspedes"
          value={`${r.num_adults} adulto(s)${r.num_children ? ` + ${r.num_children} criança(s)` : ""}`}
        />
        <Field label="Pets" value={r.num_pets > 0 ? `${r.num_pets}` : "Não"} />
        <Field label="Veículos" value={`${r.num_vehicles}`} />
        <Field
          label="Método de pagamento"
          value={
            r.payment_method === "pix"
              ? "Pix"
              : r.payment_method === "card"
                ? "Cartão"
                : "Não informado"
          }
        />
      </div>
    </Card>
  );
}

function GuestCard({ r }: { r: Reservation }) {
  const wa = onlyDigits(r.guest_whatsapp);
  const waInternational = wa.startsWith("55") ? wa : `55${wa}`;
  const msg = encodeURIComponent(
    `Olá ${r.guest_name}, tudo bem? Sou da RotainStay e estou entrando em contato sobre sua reserva ${r.reservation_code}.`
  );
  const [email, setEmail] = useState(r.guest_email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    setEmail(r.guest_email ?? "");
  }, [r.guest_email]);

  const emailChanged = (email.trim() || null) !== (r.guest_email ?? null);
  const emailValid =
    email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function saveEmail() {
    if (!emailValid) {
      toast.error("E-mail inválido.");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase
      .from("reservations")
      .update({ guest_email: email.trim() || null })
      .eq("id", r.id);
    setSavingEmail(false);
    if (error) {
      toast.error("Falha ao salvar e-mail: " + error.message);
      return;
    }
    toast.success("E-mail salvo.");
    r.guest_email = email.trim() || null;
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Dados do hóspede</h3>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Nome" value={r.guest_name} />
        <Field
          label="WhatsApp"
          value={
            <a
              href={`https://wa.me/${waInternational}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              style={{ color: "#6B7052" }}
            >
              {r.guest_whatsapp}
            </a>
          }
        />
        <Field label="Como conheceu" value={r.how_found ?? "—"} />
      </div>
      <div className="mt-5">
        <div style={{ fontSize: 12, color: "#9A9890" }} className="mb-1">
          E-mail
        </div>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="button"
            size="sm"
            onClick={saveEmail}
            disabled={!emailChanged || !emailValid || savingEmail}
          >
            {savingEmail ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <a
          href={`https://wa.me/${waInternational}?text=${msg}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <MessageCircle className="h-4 w-4" />
          Contatar via WhatsApp
        </a>
      </div>
    </Card>
  );
}

function DocumentsCard({
  reservationId,
  documents,
  onChanged,
}: {
  reservationId: string;
  documents: Array<{ id: string; file_name: string; storage_path: string }>;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo excede o limite de 10MB.");
      e.target.value = "";
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `reservations/${reservationId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      toast.error("Falha no upload: " + upErr.message);
      setUploading(false);
      e.target.value = "";
      return;
    }
    const { error: insErr } = await supabase.from("reservation_documents").insert({
      reservation_id: reservationId,
      storage_path: path,
      public_url: "",
      file_name: file.name,
      file_type: file.type,
      uploaded_by: "admin",
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("Falha ao salvar registro: " + insErr.message);
    } else {
      toast.success("Documento adicionado.");
      onChanged();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDownload(path: string, fileName: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível gerar o link de download.");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const doc = documents.find((d) => d.id === pendingDeleteId);
    if (!doc) return;
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    if (rmErr) {
      toast.error("Falha ao remover arquivo do storage.");
      return;
    }
    const { error: dbErr } = await supabase
      .from("reservation_documents")
      .delete()
      .eq("id", doc.id);
    if (dbErr) {
      toast.error("Falha ao remover registro.");
      return;
    }
    toast.success("Documento removido.");
    setPendingDeleteId(null);
    onChanged();
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Documentos da reserva</h3>
        <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          {uploading ? "Enviando..." : "Adicionar documento"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
      ) : (
        <ul className="mt-4 divide-y">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <span className="text-sm">{d.file_name}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Baixar"
                  onClick={() => handleDownload(d.storage_path, d.file_name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover"
                  onClick={() => setPendingDeleteId(d.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o arquivo permanentemente do storage e do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function HistoryCard({
  history,
}: {
  history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    note: string | null;
    changed_at: string;
  }>;
}) {
  return (
    <Card>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Histórico de status</h3>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem registros.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {history.map((h) => {
            const d = new Date(h.changed_at);
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yy = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, "0");
            const mi = String(d.getMinutes()).padStart(2, "0");
            return (
              <li key={h.id} className="text-sm">
                <div className="text-xs text-muted-foreground">
                  {dd}/{mm}/{yy} às {hh}:{mi}
                </div>
                <div style={{ color: "#1C1C1A" }}>
                  {h.old_status ? RESERVATION_STATUS_LABEL[h.old_status] ?? h.old_status : "—"} →{" "}
                  {RESERVATION_STATUS_LABEL[h.new_status] ?? h.new_status}
                </div>
                {h.note && (
                  <div className="mt-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {h.note}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StatusCard({
  reservation,
  onChanged,
}: {
  reservation: Reservation;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(reservation.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const updateFn = useServerFn(updateReservationStatus);

  useEffect(() => setStatus(reservation.status), [reservation.status]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFn({
        data: { reservationId: reservation.id, newStatus: status as any, note: note || undefined },
      });
      toast.success("Status atualizado com sucesso.");
      setNote("");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Atualizar status</h3>
      <div className="mt-4 space-y-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="awaiting_contract">Aguardando contrato</SelectItem>
            <SelectItem value="awaiting_balance">Aguardando saldo</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Observação interna (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <Button className="w-full" disabled={saving} onClick={handleSave}>
          {saving ? "Salvando..." : "Salvar status"}
        </Button>
      </div>
    </Card>
  );
}

function PaymentContractCard({
  reservation,
  onChanged,
}: {
  reservation: Reservation;
  onChanged: () => void;
}) {
  const markDepositFn = useServerFn(markDepositPaid);
  const markSentFn = useServerFn(markContractSent);
  const markSignedFn = useServerFn(markContractSigned);
  const markBalanceFn = useServerFn(markBalancePaid);
  const updateNotesFn = useServerFn(updateBalanceNotes);

  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(reservation.admin_balance_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(reservation.admin_balance_notes ?? "");
  }, [reservation.admin_balance_notes]);

  const hasNewFlow = reservation.deposit_amount != null;
  const depositPaid = !!reservation.deposit_paid_at;
  const contractSent = !!reservation.contract_sent_at;
  const contractSigned = !!reservation.contract_signed_at;
  const balancePaid = !!reservation.balance_paid_at;
  const cancelled = reservation.status === "cancelled";

  const dueDate = reservation.balance_due_date;
  const dueOverdue =
    !!dueDate &&
    !balancePaid &&
    new Date(dueDate + "T23:59:59") < new Date();

  async function run(action: () => Promise<unknown>, key: string, ok: string) {
    setBusy(key);
    try {
      await action();
      toast.success(ok);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao executar ação.");
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateNotesFn({
        data: { reservationId: reservation.id, notes },
      });
      toast.success("Observações salvas.");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar observações.");
    } finally {
      setSavingNotes(false);
    }
  }

  if (!hasNewFlow) {
    return (
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>
          Pagamento e contrato
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta reserva foi criada antes do novo fluxo de sinal/saldo. Use o
          card "Atualizar status" acima para gerenciá-la manualmente.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>
        Pagamento e contrato
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-[10px] bg-[#F5F4F1] p-4">
        <Field label="Sinal (50%)" value={formatBRL(reservation.deposit_amount)} />
        <Field label="Saldo (50%)" value={formatBRL(reservation.balance_amount)} />
        <Field
          label="Vencimento do saldo"
          value={
            dueDate ? (
              <span style={{ color: dueOverdue ? "#A63C2E" : undefined }}>
                {formatDateBR(dueDate)}
                {dueOverdue && " (vencido)"}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field
          label="Total"
          value={formatBRL(reservation.total_price)}
        />
      </div>

      {dueOverdue && reservation.status === "awaiting_balance" && (
        <div
          className="mt-3 rounded-[10px] p-3 text-sm"
          style={{ backgroundColor: "#FBE0DC", color: "#A63C2E" }}
        >
          <strong>Saldo vencido.</strong> O hóspede não pagou até 5 dias antes
          do check-in. Decida manualmente: prorrogar, negociar ou cancelar.
        </div>
      )}

      <ol className="mt-5 space-y-3">
        <StepRow
          n={1}
          title="Sinal recebido (50%)"
          done={depositPaid}
          at={reservation.deposit_paid_at}
          actionLabel="Marcar sinal recebido"
          actionDisabled={depositPaid || cancelled || busy !== null}
          loading={busy === "deposit"}
          onClick={() =>
            run(
              () => markDepositFn({ data: { reservationId: reservation.id } }),
              "deposit",
              "Sinal marcado como recebido.",
            )
          }
        />
        <StepRow
          n={2}
          title="Contrato enviado por e-mail"
          done={contractSent}
          at={reservation.contract_sent_at}
          actionLabel="Marcar contrato enviado"
          actionDisabled={!depositPaid || contractSent || cancelled || busy !== null}
          loading={busy === "sent"}
          onClick={() =>
            run(
              () => markSentFn({ data: { reservationId: reservation.id } }),
              "sent",
              "Contrato marcado como enviado.",
            )
          }
        />
        <StepRow
          n={3}
          title="Contrato assinado pelo hóspede"
          done={contractSigned}
          at={reservation.contract_signed_at}
          actionLabel="Marcar contrato assinado"
          actionDisabled={
            !contractSent || contractSigned || cancelled || busy !== null
          }
          loading={busy === "signed"}
          onClick={() =>
            run(
              () => markSignedFn({ data: { reservationId: reservation.id } }),
              "signed",
              "Contrato marcado como assinado.",
            )
          }
        />
        <StepRow
          n={4}
          title="Saldo recebido (50% restantes)"
          done={balancePaid}
          at={reservation.balance_paid_at}
          actionLabel="Marcar saldo recebido"
          actionDisabled={
            !contractSigned || balancePaid || cancelled || busy !== null
          }
          loading={busy === "balance"}
          onClick={() =>
            run(
              () => markBalanceFn({ data: { reservationId: reservation.id } }),
              "balance",
              "Saldo marcado como recebido. Reserva confirmada.",
            )
          }
        />
      </ol>

      <div className="mt-5">
        <div style={{ fontSize: 12, color: "#9A9890" }} className="mb-1">
          Observações da 2ª cobrança (link do Pix, comprovante, etc.)
        </div>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anote aqui o link/QR enviado, comprovantes e observações sobre a cobrança do saldo..."
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={saveNotes}
            disabled={
              savingNotes ||
              (notes ?? "") === (reservation.admin_balance_notes ?? "")
            }
          >
            {savingNotes ? "Salvando..." : "Salvar observações"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StepRow({
  n,
  title,
  done,
  at,
  actionLabel,
  actionDisabled,
  loading,
  onClick,
}: {
  n: number;
  title: string;
  done: boolean;
  at: string | null;
  actionLabel: string;
  actionDisabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            backgroundColor: done ? "#E6F4EA" : "#EEE",
            color: done ? "#1F6F35" : "#5C5B57",
          }}
        >
          {done ? "✓" : n}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#1C1C1A" }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "#9A9890" }}>
            {done && at
              ? `Em ${new Date(at).toLocaleString("pt-BR")}`
              : "Pendente"}
          </div>
        </div>
      </div>
      {!done && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={actionDisabled}
          onClick={onClick}
        >
          {loading ? "Salvando..." : actionLabel}
        </Button>
      )}
    </li>
  );
}

function PriceCard({
  breakdown,
  total,
  couponCode,
  couponPercent,
  couponAmount,
}: {
  breakdown: any;
  total: number | string;
  couponCode: string | null;
  couponPercent: number | string | null;
  couponAmount: number | string | null;
}) {
  const items: Array<{ label: string; value: string }> = [];
  if (breakdown && typeof breakdown === "object") {
    if (breakdown.weekday_nights != null) {
      items.push({
        label: `Diárias semana (${breakdown.weekday_nights})`,
        value: formatBRL(breakdown.weekday_subtotal ?? 0),
      });
    }
    if (breakdown.weekend_nights != null) {
      items.push({
        label: `Diárias fim de semana (${breakdown.weekend_nights})`,
        value: formatBRL(breakdown.weekend_subtotal ?? 0),
      });
    }
    if (breakdown.high_season_nights) {
      items.push({
        label: `Diárias alta temporada (${breakdown.high_season_nights})`,
        value: formatBRL(breakdown.high_season_total ?? 0),
      });
    }
    if (breakdown.cleaning_fee != null) {
      items.push({ label: "Taxa de limpeza", value: formatBRL(breakdown.cleaning_fee) });
    }
  }
  const hasCoupon = !!couponCode && couponAmount != null;
  const subtotal = hasCoupon
    ? Number(total) + Number(couponAmount ?? 0)
    : null;
  return (
    <Card bg="#F5F4F1">
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Cálculo de preço</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span style={{ color: "#5C5B57" }}>{it.label}</span>
              <span style={{ color: "#1C1C1A" }}>{it.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Sem detalhamento disponível.</p>
      )}
      {hasCoupon && (
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "#5C5B57" }}>Subtotal</span>
            <span style={{ color: "#1C1C1A" }}>
              {subtotal != null ? formatBRL(subtotal) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#5C5B57" }}>
              Cupom {couponCode} (
              {couponPercent != null ? `${Number(couponPercent)}%` : ""})
            </span>
            <span style={{ color: "#1F6F35" }}>
              − {formatBRL(Number(couponAmount ?? 0))}
            </span>
          </div>
        </div>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t pt-3">
        <span style={{ color: "#5C5B57" }}>Total</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#6B7052" }}>{formatBRL(total)}</span>
      </div>
    </Card>
  );
}

function NotesCard({
  reservation,
  onSaved,
}: {
  reservation: Reservation;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(reservation.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(reservation.admin_notes ?? ""), [reservation.admin_notes]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("reservations")
      .update({ admin_notes: value })
      .eq("id", reservation.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar anotação.");
    } else {
      toast.success("Anotação salva.");
      onSaved();
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1C1C1A" }}>Anotações internas</h3>
      <Textarea
        className="mt-3"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anote aqui informações úteis sobre esta reserva..."
      />
      <div className="mt-3 flex items-center justify-between">
        <span style={{ fontSize: 12, color: "#9A9890" }}>
          Visível apenas para o administrador.
        </span>
        <Button variant="secondary" size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Salvando..." : "Salvar anotação"}
        </Button>
      </div>
    </Card>
  );
}

function DeleteReservationButton({
  reservationId,
  reservationCode,
  guestName,
  onDeleted,
}: {
  reservationId: string;
  reservationCode: string;
  guestName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteFn = useServerFn(deleteReservation);

  async function confirm() {
    setDeleting(true);
    try {
      await deleteFn({ data: { reservationId } });
      toast.success(`Reserva ${reservationCode} excluída.`);
      setOpen(false);
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir reserva.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Excluir reserva
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(o) => !deleting && setOpen(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A reserva{" "}
              <strong>{reservationCode}</strong> de{" "}
              <strong>{guestName}</strong> e todos os dados relacionados
              (documentos, histórico de status e bloqueios de datas) serão
              removidos. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Excluindo..." : "Excluir reserva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}