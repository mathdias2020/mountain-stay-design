# Reserva manual + melhorias no bloqueio de datas

## 1. Nova reserva manual (admin)

**Rota:** `/admin/reservas/nova` (botão "Nova reserva" em `/admin/reservas`).

**Formulário:**
- Propriedade (select, obrigatório)
- Hóspede: nome, WhatsApp, e-mail (opcional), CPF (opcional)
- Check-in / check-out (date pickers)
- Nº de hóspedes
- Valor total (auto-calculado pelo `calculatePrice` da propriedade, editável manualmente — admin pode sobrescrever para refletir negociação offline)
- Cupom (opcional, mesmo seletor já usado no site)
- Método de pagamento: Pix / Cartão / Dinheiro / Transferência / Outro
- **Modo de criação** (dropdown — o admin escolhe):
  - **"Reserva já confirmada (offline)"** → status entra direto como `confirmed`, bloqueia datas imediatamente, todos os campos de pagamento marcados como pagos (`deposit_paid_at`, `balance_paid_at` = agora).
  - **"Iniciar fluxo padrão (50% sinal / contrato / saldo)"** → status entra como `pending`, mesma esteira do fluxo do site, admin avança manualmente depois pela tela da reserva.
- Observações internas (textarea, salvas em campo admin-only)

**Validação de conflito (avisar mas permitir forçar):**
- Antes de salvar, server fn checa overlap com `reservations` ativas (`awaiting_contract`, `awaiting_balance`, `confirmed`) e `blocked_dates` da mesma propriedade.
- Se houver conflito: dialog amarelo lista os conflitos (código da reserva / motivo do bloqueio + datas) com botões "Cancelar" e "Confirmar mesmo assim".
- Server fn aceita flag `force: true` para permitir o overbooking; sem a flag, retorna 409 com a lista de conflitos.

**Marcação interna:**
- Nova coluna `reservations.created_by_admin boolean default false` (true para reservas manuais).
- Nova coluna `reservations.admin_notes text` (observações internas).
- Reservas manuais ganham badge "Manual" na lista de reservas para diferenciação.

## 2. Melhorias no bloqueio de datas (`/admin/calendario`)

Mantém o fluxo atual de clicar num dia para bloquear e adiciona:

**a) Painel lateral "Bloqueios desta propriedade"**
- Lista todos os bloqueios manuais futuros da propriedade selecionada (motivo + intervalo + dias restantes).
- Cada item tem botões **Editar** (abre dialog com motivo/datas pré-preenchidos) e **Remover**.
- Ignora bloqueios que vieram de reservas confirmadas (esses não são editáveis aqui — o admin gerencia pela tela da reserva).

**b) Botão "Bloquear intervalo"** no topo
- Abre dialog independente (sem precisar clicar num dia específico).
- Date pickers de início + fim, motivo, descrição.
- Mesma validação de conflito com reservas existentes (avisa mas permite forçar).

**c) Edição de bloqueio existente**
- Hoje, ao clicar num dia bloqueado, abre `UnblockDialog` que só permite remover.
- Vira `BlockEditDialog`: permite alterar intervalo + motivo OU remover.

## Detalhes técnicos

### Schema (migration)
```sql
ALTER TABLE public.reservations
  ADD COLUMN created_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN admin_notes text;
```

### Server functions novas (`src/lib/reservation-admin.functions.ts`, com `requireSupabaseAuth` + assert admin)
- `checkReservationConflicts({ propertyId, checkin, checkout, excludeReservationId? })` → retorna `{ reservations: [...], blocks: [...] }`. Usado pelo formulário antes de salvar e pelo dialog de bloqueio.
- `createManualReservation({ ...payload, force })` → cria a reserva. Se `mode === "confirmed_offline"`: status = `confirmed`, preenche timestamps de pagamento, insere `blocked_dates` correspondente. Se `mode === "standard_flow"`: status = `pending`, calcula `deposit_amount`/`balance_amount`/`balance_due_date` igual ao fluxo do site.
- `updateBlockedDate({ id, start_date, end_date, reason, force })` → edita bloqueio manual.

### UI nova
- `src/routes/_admin.admin.reservas.nova.tsx` — formulário completo.
- `src/components/admin/ConflictWarningDialog.tsx` — dialog reaproveitado (nova reserva + bloqueio).
- Botão "Nova reserva" em `_admin.admin.reservas.index.tsx`.
- `_admin.admin.calendario.tsx`: adiciona painel de bloqueios + botão "Bloquear intervalo" + troca `UnblockDialog` por `BlockEditDialog`.

### Validações
- Zod no client e no server: nome 2–120, WhatsApp 8–20 dígitos, e-mail opcional válido, valor > 0, checkout > checkin, motivo do bloqueio 1–200.

## Fora do escopo
- Não envia e-mails/WhatsApp automáticos para reservas manuais (admin trata offline).
- Não cobra cartão nem gera Pix automaticamente — é registro de algo já acertado fora.
- Não muda o fluxo de reservas vindas do site.

Posso seguir?