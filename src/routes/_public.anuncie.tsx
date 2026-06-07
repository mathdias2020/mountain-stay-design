import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CITY_OPTIONS = [
  "Domingos Martins",
  "Pedra Azul",
  "Marechal Floriano",
  "Venda Nova do Imigrante",
  "Paraju",
  "Outro",
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "WhatsApp deve ter 11 dígitos com DDD"),
  email: z.string().trim().email("E-mail inválido").max(255),
  city: z.enum(CITY_OPTIONS, { errorMap: () => ({ message: "Selecione a cidade" }) }),
  house_description: z.string().trim().min(3).max(80, "Máximo 80 caracteres"),
  bedrooms: z.coerce.number().int().min(1).max(20),
  max_guests: z.coerce.number().int().min(1).max(30),
  desired_daily_rate: z.coerce.number().min(0),
  message: z.string().max(1000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Autorização é obrigatória" }),
  }),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/_public/anuncie")({
  head: () => ({
    meta: [
      { title: "Anuncie sua casa — RotainStay" },
      {
        name: "description",
        content:
          "Envie sua casa para análise: nosso time avalia cada submissão pessoalmente.",
      },
      { property: "og:title", content: "Anuncie sua casa — RotainStay" },
    ],
  }),
  component: AnnouncePage,
});

function formatWhats(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function AnnouncePage() {
  const [submitted, setSubmitted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      whatsapp: "",
      email: "",
      house_description: "",
      message: "",
    } as Partial<FormValues> as FormValues,
    mode: "onSubmit",
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const whats = watch("whatsapp") || "";
  const msg = watch("message") || "";

  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const onPickPhoto = (file: File | null) => {
    setPhotoError(null);
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setPhotoError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setPhotoError("Arquivo acima de 10MB.");
      return;
    }
    setPhotoFile(file);
  };

  const onSubmit = async (values: FormValues) => {
    let photoPath: string | null = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("submission-photos")
        .upload(path, photoFile, {
          contentType: photoFile.type,
          upsert: false,
        });
      setUploading(false);
      if (upErr) {
        toast.error("Falha ao enviar a foto. Tente novamente.");
        return;
      }
      photoPath = path;
    }
    const { error } = await supabase.from("property_submissions").insert({
      name: values.name,
      whatsapp: values.whatsapp,
      email: values.email,
      city: values.city,
      house_description: values.house_description,
      bedrooms: values.bedrooms,
      max_guests: values.max_guests,
      desired_daily_rate: values.desired_daily_rate,
      photo_url: photoPath,
      message: values.message || null,
    });
    if (error) {
      toast.error("Erro ao enviar. Tente novamente em instantes.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="bg-background">
      <div
        className="mx-auto"
        style={{ maxWidth: 640, paddingTop: 56, paddingBottom: 56, paddingLeft: 24, paddingRight: 24 }}
      >
        <h1 style={{ fontWeight: 600, fontSize: 32, color: "#1C1C1A" }}>
          Anuncie sua casa na RotainStay
        </h1>
        <p style={{ marginTop: 12, color: "#5C5B57", fontSize: 16, lineHeight: 1.6 }}>
          Tem uma casa na região serrana e quer alugá-la por temporada? Conte-nos sobre
          sua propriedade. Nosso time analisa cada submissão pessoalmente e entra em
          contato caso haja interesse mútuo em incluí-la em nosso portfólio.
        </p>

        <div
          style={{
            marginTop: 40,
            background: "#fff",
            borderRadius: 14,
            padding: 32,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {submitted ? (
            <div className="text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-[#1F6F35]" strokeWidth={1.5} />
              </div>
              <h2 style={{ fontWeight: 600, fontSize: 22, color: "#1C1C1A", marginTop: 16 }}>
                Submissão recebida!
              </h2>
              <p style={{ marginTop: 12, color: "#5C5B57", fontSize: 15, lineHeight: 1.6 }}>
                Obrigado por confiar na RotainStay. Nossa equipe analisará sua casa e
                entrará em contato em breve pelo WhatsApp ou e-mail informados.
              </p>
              <div className="mt-6">
                <Link to="/">
                  <Button variant="ghost">Voltar ao início</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <section className="space-y-3">
                <h3 style={{ fontWeight: 600, fontSize: 14, color: "#9A9890" }}>Sobre você</h3>
                <div>
                  <Label>Nome completo *</Label>
                  <Input placeholder="Seu nome" {...register("name")} />
                  {errors.name && (
                    <p className="mt-1 text-xs text-[#B43A3A]">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formatWhats(whats)}
                    onChange={(e) =>
                      setValue("whatsapp", e.target.value.replace(/\D/g, ""), {
                        shouldValidate: false,
                      })
                    }
                  />
                  {errors.whatsapp && (
                    <p className="mt-1 text-xs text-[#B43A3A]">{errors.whatsapp.message}</p>
                  )}
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input type="email" placeholder="seu@email.com" {...register("email")} />
                  {errors.email && (
                    <p className="mt-1 text-xs text-[#B43A3A]">{errors.email.message}</p>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 style={{ fontWeight: 600, fontSize: 14, color: "#9A9890" }}>Sobre a casa</h3>
                <div>
                  <Label>Cidade onde a casa está localizada *</Label>
                  <Select
                    value={watch("city") ?? ""}
                    onValueChange={(v) =>
                      setValue("city", v as FormValues["city"], { shouldValidate: false })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && (
                    <p className="mt-1 text-xs text-[#B43A3A]">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <Label>Nome ou descrição breve da casa *</Label>
                  <Input
                    maxLength={80}
                    placeholder="Ex: Chalé com vista para a montanha"
                    {...register("house_description")}
                  />
                  {errors.house_description && (
                    <p className="mt-1 text-xs text-[#B43A3A]">
                      {errors.house_description.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quartos *</Label>
                    <Input type="number" min={1} max={20} {...register("bedrooms")} />
                    {errors.bedrooms && (
                      <p className="mt-1 text-xs text-[#B43A3A]">{errors.bedrooms.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Capacidade *</Label>
                    <Input type="number" min={1} max={30} {...register("max_guests")} />
                    {errors.max_guests && (
                      <p className="mt-1 text-xs text-[#B43A3A]">{errors.max_guests.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Valor médio de diária pretendido (R$) *</Label>
                  <div className="relative">
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 13,
                        color: "#5C5B57",
                      }}
                    >
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0,00"
                      className="pl-9"
                      {...register("desired_daily_rate")}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4 }}>
                    Valor aproximado por noite que você pretende cobrar. Pode ser
                    ajustado depois.
                  </p>
                  {errors.desired_daily_rate && (
                    <p className="mt-1 text-xs text-[#B43A3A]">
                      {errors.desired_daily_rate.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Link de foto da casa *</Label>
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/... ou https://..."
                    {...register("photo_url")}
                  />
                  <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4 }}>
                    Cole o link de uma foto da casa (Google Drive, Imgur, Dropbox, etc.).
                    Ela ficará disponível apenas para nossa equipe.
                  </p>
                  {errors.photo_url && (
                    <p className="mt-1 text-xs text-[#B43A3A]">{errors.photo_url.message}</p>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 style={{ fontWeight: 600, fontSize: 14, color: "#9A9890" }}>Mensagem</h3>
                <div>
                  <Label>Mensagem</Label>
                  <Textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Conte-nos mais sobre a casa, comodidades, diferenciais..."
                    {...register("message")}
                  />
                  <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4, textAlign: "right" }}>
                    {msg.length}/1000
                  </p>
                </div>
              </section>

              <label className="flex items-start gap-2 text-sm text-text-secondary">
                <Checkbox
                  checked={watch("consent") === true}
                  onCheckedChange={(v) =>
                    setValue("consent", v === true ? true : (false as unknown as true), {
                      shouldValidate: false,
                    })
                  }
                />
                <span>
                  Autorizo a equipe da RotainStay a entrar em contato pelo WhatsApp ou
                  e-mail informados para análise da minha propriedade.
                </span>
              </label>
              {errors.consent && (
                <p className="text-xs text-[#B43A3A]">{errors.consent.message as string}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isSubmitting}
                style={{ marginTop: 24 }}
              >
                {isSubmitting ? "Enviando..." : "Enviar para análise"}
              </Button>
              <p
                style={{
                  fontSize: 12,
                  color: "#9A9890",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Analisamos cada submissão em até 5 dias úteis. Caso tenhamos interesse,
                entraremos em contato.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}