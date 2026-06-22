# Cupons de desconto

## 1. Banco de dados (migration)

Nova tabela `public.coupons`:
- `code` — texto único, salvo em CAIXA-ALTA, 3-30 chars (regex `[A-Z0-9_-]`)
- `discount_percent` — numeric(5,2), 0.01–100
- `active` — boolean, default true
- `expires_at` — timestamptz, opcional (validade)
- `max_uses` — int, opcional (limite de usos; null = ilimitado)
- `uses_count` — int, default 0 (incrementado a cada reserva criada com o cupom)
- `id`, `created_at`, `updated_at`

RLS / GRANTS:
- `service_role` total acesso
- `authenticated` (admin) leitura e gerenciamento via `has_role(auth.uid(),'admin')`
- Sem acesso para `anon` direto — validação do cupom acontece via server function

Alterações em `public.reservations`:
- `coupon_code` text null
- `coupon_discount_percent` numeric(5,2) null
- `coupon_discount_amount` numeric(10,2) null

## 2. Backend (server functions)

`src/lib/coupons.functions.ts` (novo):
- `validateCoupon({ code })` — público (sem auth). Faz uppercase, busca cupom; retorna `{ valid, code, discount_percent, reason? }`. Falhas: inexistente, inativo, expirado, esgotado.
- `listCoupons()` — admin (requireSupabaseAuth + checagem `has_role`).
- `createCoupon`, `updateCoupon`, `deleteCoupon` — admin.

`src/lib/reservations.functions.ts` (alterar):
- `inputSchema` ganha `coupon_code: z.string().optional()`.
- No handler, após calcular `breakdown.total`:
  - Se `coupon_code` veio: revalidar no servidor (não confiar no cliente). Se inválido → erro.
  - Calcular `discount_amount = round2(total * percent/100)` e `final_total = total - discount_amount`.
  - Salvar `coupon_code`, `coupon_discount_percent`, `coupon_discount_amount` e usar `final_total` em `total_price`. `price_breakdown` ganha campos `coupon_*` e `final_total` para histórico.
  - Incrementar `uses_count` do cupom (update atômico com `eq('id', ...)`).

## 3. Admin — `/admin/configuracoes`

Novo card "Cupons de desconto" abaixo dos existentes:
- Tabela com colunas: código, %, status (ativo/inativo), validade, usos (`uses_count / max_uses ou ∞`), ações (editar/excluir).
- Botão "Novo cupom" abre um dialog com campos: código (auto uppercase), %, ativo (switch), validade (date picker opcional), limite de usos (number opcional).
- Editar usa o mesmo dialog.

## 4. Público — `src/components/property/ReservationModal.tsx`

Nova seção no formulário, logo antes do bloco de termos/enviar:
- Label "Cupom de desconto (opcional)"
- Input de texto + botão "Aplicar"
- Estados: idle / validando / aplicado (mostra "✓ Cupom CODE — X% de desconto" + botão "Remover") / erro (mensagem em vermelho)
- Validação ao clicar em "Aplicar" chama `validateCoupon`. Se ok, guarda `{ code, percent }` no estado.
- Bloco "Resumo" passa a exibir, quando cupom aplicado:
  - linha "Subtotal" (breakdown.total atual)
  - linha "Desconto (X%)" em verde com valor negativo
  - linha "Total" com valor final
- `submit` envia `coupon_code` apenas se aplicado.

## 5. Admin — exibir cupom nas reservas

- `ReservationsTable.tsx`: pequena badge "Cupom: CODE (-X%)" quando houver.
- `_admin.admin.reservas.$id.tsx`: na seção de valores, mostrar subtotal, desconto e total final.

## Detalhes técnicos

- Códigos normalizados em UPPERCASE no servidor e no banco (constraint `code = upper(code)` opcional via CHECK simples — é imutável).
- Arredondamento: `Math.round(total * percent) / 100` aplicado ao valor em reais com 2 casas.
- Sem race condition crítica em `uses_count` (admin-only e volume baixo); update incremental simples.
- Validações Zod em todos os inputs de admin (código regex, percent 0–100).

Confirma para eu executar?
