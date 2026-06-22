import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Copy, CreditCard, Minus, Plus, QrCode, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { formatBRL, type PriceBreakdown } from "@/lib/pricing";
import { createReservation } from "@/lib/reservations.functions";
import {
  getPixSettings,
  setReservationPaymentMethod,
} from "@/lib/payment.functions";
import type { PropertyDetail } from "@/lib/properties.functions";
import { LegalLink } from "@/components/legal/LegalLink";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  property: PropertyDetail;
  checkin: Date | undefined;
  checkout: Date | undefined;
  guests: number;
  breakdown: PriceBreakdown | null;
}

type Errors = Partial<Record<string, string>>;

function maskWhatsApp(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskAdminWhatsApp(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) {
    // 55 + DDD + 9XXXXXXXX
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 11) return maskWhatsApp(d);
  return raw;
}

const HOW_FOUND_OPTIONS = [
  "Instagram",
  "Indicação de amigo",
  "Google",
  "Outro",
] as const;

export function ReservationModal({
  open,
  onOpenChange,
  property,
  checkin,
  checkout,
  guests,
  breakdown,
}: Props) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [howFound, setHowFound] = useState<string>("");
  const [adults, setAdults] = useState(Math.max(1, guests));
  const [children, setChildren] = useState(0);
  const [hasPets, setHasPets] = useState(false);
  const [pets, setPets] = useState(1);
  const [vehicles, setVehicles] = useState(0);
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    code: string;
    whatsapp: string | null;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | null>(
    null,
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setAdults(Math.max(1, guests));
      setErrors({});
      setServerError(null);
    }
  }, [open, guests]);

  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (res) => {
      setSuccess({
        id: res.reservation_id,
        code: res.reservation_code,
        whatsapp: res.admin_whatsapp,
      });
      setPaymentMethod(null);
      queryClient.invalidateQueries({ queryKey: ["property", property.slug] });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao enviar sua solicitação. Tente novamente.",
      );
    },
  });

  const handleClose = (v: boolean) => {
    if (!v && mutation.isPending) return;
    onOpenChange(v);
    if (!v) {
      // reset for next open
      setTimeout(() => {
        setName("");
        setWhatsapp("");
        setHowFound("");
        setChildren(0);
        setHasPets(false);
        setPets(1);
        setVehicles(0);
        setMessage("");
        setTerms(false);
        setSuccess(null);
        setPaymentMethod(null);
        setErrors({});
        setServerError(null);
        mutation.reset();
      }, 200);
    }
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Informe seu nome completo.";
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length !== 11) e.whatsapp = "WhatsApp deve ter 11 dígitos (DDD + número).";
    if (!terms) e.terms = "Você precisa aceitar os termos.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!checkin || !checkout || !breakdown) {
      setServerError("Selecione as datas antes de enviar.");
      return;
    }
    if (!validate()) return;

    mutation.mutate({
      data: {
        property_id: property.id,
        checkin_date: format(checkin, "yyyy-MM-dd"),
        checkout_date: format(checkout, "yyyy-MM-dd"),
        guest_name: name.trim(),
        guest_whatsapp: whatsapp.replace(/\D/g, ""),
        how_found:
          howFound && HOW_FOUND_OPTIONS.includes(howFound as never)
            ? (howFound as (typeof HOW_FOUND_OPTIONS)[number])
            : undefined,
        num_adults: adults,
        num_children: children,
        num_pets: hasPets && property.accepts_pets ? pets : 0,
        num_vehicles: property.parking_spots > 0 ? vehicles : 0,
        guest_message: message.trim() || undefined,
        terms_accepted: true,
      },
    });
  };

  const periodLabel =
    checkin && checkout && breakdown
      ? `${format(checkin, "dd/MM/yyyy", { locale: ptBR })} a ${format(
          checkout,
          "dd/MM/yyyy",
          { locale: ptBR },
        )} (${breakdown.nights} ${breakdown.nights === 1 ? "noite" : "noites"})`
      : "—";

  const totalGuests = adults + children;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="left-0 top-0 max-h-[100dvh] w-screen max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-b-[14px] bg-surface p-4 sm:left-[50%] sm:top-[50%] sm:max-h-[90vh] sm:w-auto sm:max-w-[540px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[14px] sm:p-8 [&>button]:hidden"
      >
        <button
          type="button"
          onClick={() => handleClose(false)}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-md p-1.5 text-text-secondary hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          paymentMethod === null ? (
            <PaymentChoiceView
              reservationId={success.id}
              reservationCode={success.code}
              onPick={setPaymentMethod}
            />
          ) : paymentMethod === "pix" ? (
            <PixView
              code={success.code}
              onClose={() => handleClose(false)}
              onBack={() => setPaymentMethod(null)}
            />
          ) : (
            <CardRedirectView
              code={success.code}
              whatsapp={success.whatsapp}
              onClose={() => handleClose(false)}
            />
          )
        ) : (
          <>
            <DialogTitle className="text-[20px] font-semibold text-text-primary">
              Solicitar reserva
            </DialogTitle>

            {/* Resumo */}
            <div className="mt-4 space-y-1.5 rounded-[10px] bg-background p-4 text-sm text-text-secondary">
              <Row label="Propriedade" value={property.name} />
              <Row label="Período" value={periodLabel} />
              <Row label="Hóspedes" value={String(totalGuests)} />
              <Row
                label="Total estimado"
                value={breakdown ? formatBRL(breakdown.total) : "—"}
              />
            </div>

            <form onSubmit={submit} className="mt-6 space-y-6">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-text-primary">
                  Seus dados
                </legend>
                <Field
                  label="Nome completo"
                  required
                  error={errors.name}
                >
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass(!!errors.name)}
                  />
                </Field>
                <Field
                  label="WhatsApp com DDD"
                  required
                  error={errors.whatsapp}
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(27) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskWhatsApp(e.target.value))}
                    className={inputClass(!!errors.whatsapp)}
                  />
                </Field>
                <Field label="Como conheceu a RotainStay?">
                  <select
                    value={howFound}
                    onChange={(e) => setHowFound(e.target.value)}
                    className={inputClass(false)}
                  >
                    <option value="">Selecione...</option>
                    {HOW_FOUND_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-text-primary">
                  Detalhes da estadia
                </legend>
                <Field label="Número de adultos">
                  <Stepper
                    value={adults}
                    onChange={setAdults}
                    min={1}
                    max={property.max_guests}
                  />
                </Field>
                <Field label="Número de crianças">
                  <Stepper
                    value={children}
                    onChange={setChildren}
                    min={0}
                    max={10}
                  />
                </Field>

                {property.accepts_pets ? (
                  <Field label="Traz pets?">
                    <div className="space-y-2">
                      <div className="inline-flex rounded-md border border-input">
                        <button
                          type="button"
                          onClick={() => setHasPets(false)}
                          className={cn(
                            "rounded-l-md px-4 py-1.5 text-sm",
                            !hasPets
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface text-text-secondary",
                          )}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasPets(true)}
                          className={cn(
                            "rounded-r-md px-4 py-1.5 text-sm",
                            hasPets
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface text-text-secondary",
                          )}
                        >
                          Sim
                        </button>
                      </div>
                      {hasPets && (
                        <div>
                          <label className="mb-1 block text-xs text-text-secondary">
                            Quantos pets?
                          </label>
                          <Stepper
                            value={pets}
                            onChange={setPets}
                            min={1}
                            max={5}
                          />
                        </div>
                      )}
                    </div>
                  </Field>
                ) : (
                  <div className="rounded-md border border-[#E0B575] bg-[#FFF3CD] px-3 py-2 text-xs text-[#7A5300]">
                    Esta propriedade não aceita animais de estimação.
                  </div>
                )}

                {property.parking_spots > 0 && (
                  <Field label="Número de veículos">
                    <Stepper
                      value={vehicles}
                      onChange={setVehicles}
                      min={0}
                      max={property.parking_spots}
                    />
                  </Field>
                )}

                <Field label="Mensagem ou observação">
                  <div>
                    <textarea
                      value={message}
                      onChange={(e) =>
                        setMessage(e.target.value.slice(0, 500))
                      }
                      placeholder="Alguma informação adicional que queira nos passar?"
                      rows={3}
                      className={cn(inputClass(false), "resize-none")}
                    />
                    <p className="mt-1 text-right text-xs text-text-muted">
                      {message.length}/500
                    </p>
                  </div>
                </Field>
              </fieldset>

              <div>
                <label className="flex items-start gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Li e aceito os{" "}
                    <LegalLink docType="terms" className="text-primary">
                      termos de uso
                    </LegalLink>{" "}
                    e a{" "}
                    <LegalLink docType="privacy" className="text-primary">
                      política de privacidade
                    </LegalLink>{" "}
                    da RotainStay.
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-xs text-danger">{errors.terms}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-md border border-danger/40 bg-[#FBEAE8] px-3 py-2 text-sm text-danger">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!terms || mutation.isPending}
              >
                {mutation.isPending ? "Enviando..." : "Enviar solicitação"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40",
    hasError ? "border-danger" : "border-input",
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-input px-2 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="rounded p-1 text-text-secondary hover:bg-secondary disabled:opacity-40"
        aria-label="Diminuir"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="rounded p-1 text-text-secondary hover:bg-secondary disabled:opacity-40"
        aria-label="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CardRedirectView({
  code,
  whatsapp,
  onClose,
}: {
  code: string;
  whatsapp: string | null;
  onClose: () => void;
}) {
  const hasWhatsapp = !!whatsapp;
  const waUrl = hasWhatsapp
    ? `https://wa.me/${whatsapp!.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Acabei de fazer uma reserva no site (código ${code}) e quero finalizar o pagamento no cartão de crédito (parcelamento com juros). Pode me enviar o link de pagamento?`,
      )}`
    : null;

  const [countdown, setCountdown] = useState(hasWhatsapp ? 6 : 0);
  const [blocked, setBlocked] = useState(false);
  const firedRef = useRef(false);

  const openWhatsApp = () => {
    if (!waUrl) return;
    const win = window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      setBlocked(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!hasWhatsapp) return;
    if (countdown <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        openWhatsApp();
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, hasWhatsapp]);

  return (
    <div className="py-4 text-center">
      <DialogTitle className="sr-only">Pagamento no cartão</DialogTitle>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4EDDA]">
        <CheckCircle2 className="h-10 w-10 text-[#1A5C2A]" strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-[20px] font-semibold text-text-primary">
        Redirecionando para o WhatsApp…
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Reserva <strong className="text-text-primary">{code}</strong> registrada.
        {whatsapp ? (
          <>
            {" "}Vamos te levar ao WhatsApp{" "}
            <strong className="text-text-primary">
              {maskAdminWhatsApp(whatsapp)}
            </strong>{" "}
            para finalizar o pagamento no cartão (parcelamento com juros).
          </>
        ) : (
          <> Vamos te levar ao WhatsApp para finalizar o pagamento no cartão (parcelamento com juros).</>
        )}
      </p>
      {hasWhatsapp ? (
        <>
          {blocked && (
            <p className="mt-4 text-xs text-danger">
              Seu navegador bloqueou a abertura automática. Clique no botão abaixo para continuar.
            </p>
          )}
          <Button
            variant="primary"
            className="mt-6 w-full"
            onClick={() => {
              firedRef.current = true;
              openWhatsApp();
            }}
          >
            {countdown > 0
              ? `Pagar no cartão pelo WhatsApp (${countdown}…)`
              : "Pagar no cartão pelo WhatsApp"}
          </Button>
        </>
      ) : (
        <Button variant="primary" className="mt-6 w-full" onClick={onClose}>
          Fechar
        </Button>
      )}
    </div>
  );
}

function PaymentChoiceView({
  reservationId,
  reservationCode,
  onPick,
}: {
  reservationId: string;
  reservationCode: string;
  onPick: (m: "pix" | "card") => void;
}) {
  const [submitting, setSubmitting] = useState<"pix" | "card" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (m: "pix" | "card") => {
    setSubmitting(m);
    setError(null);
    try {
      await setReservationPaymentMethod({
        data: {
          reservation_id: reservationId,
          reservation_code: reservationCode,
          payment_method: m,
        },
      });
      onPick(m);
    } catch (e) {
      // Even if persisting fails, allow the user to proceed visually.
      onPick(m);
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível registrar a escolha, mas você pode continuar.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="py-2">
      <DialogTitle className="text-center text-[20px] font-semibold text-text-primary">
        Solicitação enviada! Como deseja pagar?
      </DialogTitle>
      <p className="mt-2 text-center text-sm text-text-secondary">
        Seu código de reserva é{" "}
        <strong className="text-text-primary">{reservationCode}</strong>.
      </p>
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => choose("pix")}
          className={cn(
            "flex w-full items-center gap-4 rounded-[12px] border border-input bg-surface p-4 text-left transition hover:border-primary hover:bg-primary/5",
            submitting === "pix" && "opacity-60",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-text-primary">
              Pix (à vista)
            </div>
            <div className="text-xs text-text-secondary">
              Pague na hora pelo QR Code ou chave Pix. Sem taxas.
            </div>
          </div>
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => choose("card")}
          className={cn(
            "flex w-full items-center gap-4 rounded-[12px] border border-input bg-surface p-4 text-left transition hover:border-primary hover:bg-primary/5",
            submitting === "card" && "opacity-60",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-text-primary">
              Cartão (parcelamento com juros)
            </div>
            <div className="text-xs text-text-secondary">
              Finalizamos com você pelo WhatsApp. O parcelamento tem juros.
            </div>
          </div>
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

function PixView({
  code,
  onClose,
  onBack,
}: {
  code: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const pix = useQuery({
    queryKey: ["pix-settings"],
    queryFn: () => getPixSettings(),
    staleTime: 60_000,
  });
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const copyKey = async () => {
    if (!pix.data?.pix_key) return;
    try {
      await navigator.clipboard.writeText(pix.data.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  if (confirmed) {
    return (
      <div className="py-4 text-center">
        <DialogTitle className="sr-only">Pagamento informado</DialogTitle>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4EDDA]">
          <CheckCircle2 className="h-10 w-10 text-[#1A5C2A]" strokeWidth={2} />
        </div>
        <h2 className="mt-4 text-[20px] font-semibold text-text-primary">
          Recebido!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Em até <strong className="text-text-primary">24 horas</strong> nosso
          time entrará em contato confirmando o pagamento e enviando detalhes
          sobre sua reserva e estadia.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Código da reserva:{" "}
          <strong className="text-text-secondary">{code}</strong>
        </p>
        <Button variant="primary" className="mt-6 w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="py-2">
      <DialogTitle className="text-center text-[20px] font-semibold text-text-primary">
        Pagamento via Pix
      </DialogTitle>
      <p className="mt-2 text-center text-sm text-text-secondary">
        Reserva <strong className="text-text-primary">{code}</strong>
      </p>

      {pix.isLoading ? (
        <div className="mt-6 h-56 animate-pulse rounded-[10px] bg-background" />
      ) : pix.data?.qr_code_url ? (
        <div className="mt-5 flex justify-center">
          <img
            src={pix.data.qr_code_url}
            alt="QR Code Pix"
            className="h-64 w-64 rounded-[10px] border border-input bg-white object-contain p-2"
          />
        </div>
      ) : (
        <p className="mt-5 text-center text-sm text-text-muted">
          QR Code não disponível.
        </p>
      )}

      <div className="mt-5 space-y-2 rounded-[10px] bg-background p-4 text-sm">
        <div className="text-xs uppercase tracking-wide text-text-muted">
          Chave Pix (CNPJ)
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary">
            {pix.data?.pix_key || "—"}
          </code>
          <button
            type="button"
            onClick={copyKey}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-surface px-3 py-2 text-xs font-medium text-text-primary hover:bg-secondary"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        {pix.data?.pix_beneficiary && (
          <div className="pt-1 text-xs text-text-secondary">
            Beneficiário:{" "}
            <strong className="text-text-primary">
              {pix.data.pix_beneficiary}
            </strong>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-text-secondary">
        Após pagar, clique em <strong>"Já paguei"</strong>. Nosso time confirma
        e envia os detalhes da reserva pelo WhatsApp.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button variant="primary" onClick={() => setConfirmed(true)}>
          Já paguei
        </Button>
      </div>
    </div>
  );
}