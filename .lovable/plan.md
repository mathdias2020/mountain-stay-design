## Objetivo

Trocar o pagamento Pix de "1× total" para **2× 50%**, com etapa intermediária de contrato (enviado manualmente pelo admin por e-mail), e tornar os status da reserva granulares para refletir cada passo.

## Novo fluxo (visão do hóspede)

1. Hóspede preenche reserva → escolhe Pix → vê tela explicando que o Pix **é de 50% do total para garantir a reserva** e que o saldo será cobrado depois (até 5 dias antes do check-in).
2. Recebe a página com QR/chave Pix do sinal (50%) + instruções claras dos próximos passos.
3. Após sinal confirmado pelo admin → recebe e-mail (fora do sistema) com confirmação da pré-reserva + contrato em PDF para assinatura + demais informações.
4. Após contrato assinado → recebe cobrança do Pix da 2ª parcela (50%) gerada manualmente pelo admin, com prazo até D-5 do check-in.
5. Pagou o saldo → reserva confirmada.

## Status da reserva (granular)

`pending` (sinal não pago) → `awaiting_contract` (sinal pago, contrato pendente) → `awaiting_balance` (contrato assinado, falta saldo) → `confirmed` (saldo pago) → `completed` / `cancelled`.

## Mudanças de banco (migration)

Tabela `reservations`, novas colunas (todas opcionais, sem quebrar reservas antigas):

- `deposit_amount numeric` — valor do sinal (50% de `total_price` no momento da criação).
- `balance_amount numeric` — saldo (50% restante).
- `balance_due_date date` — calculado como `checkin_date - 5 dias`.
- `deposit_paid_at timestamptz` — admin marca quando recebe o sinal.
- `contract_sent_at timestamptz` — admin marca quando envia contrato por e-mail.
- `contract_signed_at timestamptz` — admin marca quando recebe contrato assinado.
- `balance_paid_at timestamptz` — admin marca quando recebe a 2ª parcela.
- `admin_balance_notes text` — campo livre para a 2ª cobrança.

`reservations.status` aceita os novos valores; ajustar CHECK constraint (se houver) ou validar só na server fn. `reservation-status.functions.ts` passa a aceitar o enum estendido. Trigger existente de `reservation_status_history` continua logando.

`blocked_dates`: passa a ser inserido em `**awaiting_contract**` (datas seguram assim que o sinal entra), e removido em `cancelled`. Hoje só insere em `confirmed`.

## Mudanças no fluxo do hóspede

- `src/components/property/ReservationModal.tsx`:
  - Ao escolher Pix, exibir um bloco de **expectativa**: "Este Pix é o sinal de 50% (R$ X). Após confirmarmos o recebimento, enviaremos por e-mail a confirmação da pré-reserva e o contrato para assinatura. O saldo de 50% (R$ Y) será pago via Pix até 5 dias antes do check-in (DD/MM)."
  - `PixView` mostra o valor do **sinal**, não do total. Mantém QR/chave atuais.
  - "Próximos passos" listados em 4 etapas (sinal → e-mail com contrato → assinatura → Pix do saldo).

## Mudanças no admin

- `src/routes/_admin.admin.reservas.$id.tsx` ganha um painel **"Pagamento e contrato"** com 4 ações sequenciais, cada uma libera a próxima:
  1. **Marcar sinal recebido** → `status=awaiting_contract`, `deposit_paid_at=now()`, insere `blocked_dates`.
  2. **Marcar contrato enviado** → `contract_sent_at=now()` (status não muda).
  3. **Marcar contrato assinado** → `status=awaiting_balance`, `contract_signed_at=now()`.
  4. **Marcar saldo recebido** → `status=confirmed`, `balance_paid_at=now()`.
  - Botão **"Cancelar reserva"** continua disponível em qualquer etapa (libera datas).
  - Mostra `balance_due_date` em destaque quando `status=awaiting_balance`; se passar de D-5 sem pagamento, mostra alerta vermelho **"Saldo vencido — decidir manualmente"** (sem ação automática).
  - Campo de notas livre para a 2ª cobrança (link, comprovante, observações).
- `ReservationsTable` (lista): nova coluna de status com badges para os 5 estados; filtros incluem `awaiting_contract` e `awaiting_balance`.

## Server functions

- `src/lib/reservations.functions.ts` (criação): calcula e grava `deposit_amount`, `balance_amount`, `balance_due_date` no insert. Status inicial continua `pending`.
- `src/lib/reservation-status.functions.ts`: enum atualizado; lógica de `blocked_dates` move de `confirmed` para `awaiting_contract` (insert) e mantém remoção em `cancelled`.
- Nova `src/lib/reservation-payment.functions.ts` com ações admin: `markDepositPaid`, `markContractSent`, `markContractSigned`, `markBalancePaid`, `updateBalanceNotes`. Todas usam `requireSupabaseAuth` + checagem de `has_role('admin')`.

## Fora de escopo (confirmado nas perguntas)

- Sem integração com e-signature: contrato é enviado por e-mail manualmente pelo admin.
- Sem geração/envio automático do Pix da 2ª parcela: admin gera e envia manualmente, sistema só rastreia.
- Sem cancelamento automático por atraso de saldo: apenas alerta visual ao admin.
- Sem mudanças no fluxo de cartão (segue como está hoje).

## Detalhes técnicos

- Valores em `numeric(12,2)`. Cálculo: `deposit = round(total_price/2, 2)`, `balance = total_price - deposit` (evita centavo perdido).
- `balance_due_date` recalculado se admin alterar `checkin_date` (fora de escopo agora; assumir imutável após criação).
- Reservas antigas (sem as novas colunas preenchidas) continuam funcionando; UI admin mostra "—" e oculta botões novos quando `deposit_amount IS NULL`.
- `reservation_status_history` já loga transições automaticamente via trigger — sem mudança.
- Após a migration o `types.ts` é regerado; só então editamos os arquivos TS que dependem das novas colunas.