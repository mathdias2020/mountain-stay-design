import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalDocsCard } from "@/components/admin/LegalDocsCard";

export const Route = createFileRoute("/_admin/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — RotainStay" }] }),
  component: SettingsPage,
});

type Setting = { key: string; value: string };

function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["block_on_request", "admin_whatsapp"]);
      if (error) throw error;
      return (data ?? []) as Setting[];
    },
  });

  const blockOnRequest =
    settings?.find((s) => s.key === "block_on_request")?.value === "true";
  const initialWhatsapp =
    settings?.find((s) => s.key === "admin_whatsapp")?.value ?? "";

  const [whatsapp, setWhatsapp] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    setWhatsapp(initialWhatsapp);
  }, [initialWhatsapp]);

  async function saveSetting(key: string, value: string) {
    const { error } = await supabase
      .from("site_settings")
      .update({ value })
      .eq("key", key);
    if (error) throw error;
  }

  async function handleToggle(checked: boolean) {
    setSavingToggle(true);
    try {
      await saveSetting("block_on_request", checked ? "true" : "false");
      await qc.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Configuração salva.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleSaveWhatsapp() {
    setSavingWhatsapp(true);
    try {
      await saveSetting("admin_whatsapp", whatsapp.trim());
      await qc.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("WhatsApp atualizado.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSavingWhatsapp(false);
    }
  }

  // Account
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  async function handleUpdateAccount() {
    if (!newEmail && !newPassword && !confirmPassword) {
      toast.error("Preencha um e-mail ou nova senha.");
      return;
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        toast.error("A senha deve ter no mínimo 8 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("As senhas não conferem.");
        return;
      }
    }
    setSavingAccount(true);
    try {
      const payload: { email?: string; password?: string } = {};
      if (newEmail) payload.email = newEmail;
      if (newPassword) payload.password = newPassword;
      const { error } = await supabase.auth.updateUser(payload);
      if (error) throw error;
      toast.success(
        newEmail
          ? "Atualização solicitada. Confira o link no novo e-mail."
          : "Conta atualizada com sucesso.",
      );
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar conta.");
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[24px] font-semibold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <Label htmlFor="block-toggle" className="flex-1 leading-snug">
              Bloquear automaticamente as datas quando uma solicitação for
              recebida (antes da confirmação do pagamento).
            </Label>
            <Switch
              id="block-toggle"
              checked={blockOnRequest}
              disabled={savingToggle || !settings}
              onCheckedChange={handleToggle}
            />
          </div>
          <p className="text-[12px]" style={{ color: "#9A9890" }}>
            Se desativado, as datas só serão bloqueadas quando você confirmar a
            reserva manualmente. Recomendado: desativado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="whatsapp">
              WhatsApp do administrador
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Número com DDD, somente números
              </span>
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              placeholder="27999999999"
              inputMode="numeric"
              maxLength={15}
            />
            <p className="text-[12px]" style={{ color: "#9A9890" }}>
              Este número recebe as notificações de novas solicitações via
              WhatsApp.
            </p>
          </div>
          <Button onClick={handleSaveWhatsapp} disabled={savingWhatsapp}>
            {savingWhatsapp ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minha conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-email">Novo e-mail</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@exemplo.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleUpdateAccount} disabled={savingAccount}>
            {savingAccount ? "Atualizando..." : "Atualizar conta"}
          </Button>
          <p className="text-[12px]" style={{ color: "#9A9890" }}>
            Ao alterar o e-mail, você receberá um link de confirmação no novo
            endereço.
          </p>
        </CardContent>
      </Card>

      <LegalDocsCard />

      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: "#F5F4F1",
          border: "1px dashed #E2E1DD",
        }}
      >
        <h2 className="text-base font-medium">
          Múltiplos usuários{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (em breve)
          </span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Em versões futuras, será possível criar acessos com permissões
          específicas para funcionários. A estrutura de dados já está preparada
          para essa funcionalidade.
        </p>
        <Button variant="ghost" disabled className="mt-3">
          Saiba mais
        </Button>
      </div>
    </div>
  );
}
