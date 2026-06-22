## Objetivo

Após o cliente clicar em "Enviar solicitação", em vez de ir direto para o WhatsApp, abrir um popup perguntando se o pagamento será via **Pix** ou **Cartão**. A reserva continua sendo criada no banco (aparece no admin como hoje).

## Fluxo novo

1. Cliente preenche o formulário e clica em **Enviar solicitação** → reserva é criada no banco (igual hoje, status `pending`).
2. Popup de sucesso muda: mostra "Solicitação enviada! Como deseja pagar?" com dois botões:
   - **Pix (à vista)**
   - **Cartão (parcelamento com juros)**
3. **Pix** → tela com:
   - Imagem do QR Code
   - Chave Pix com botão "Copiar"
   - Nome do beneficiário
   - Aviso "Após o pagamento, entraremos em contato pelo WhatsApp para confirmar"
4. **Cartão** → tela atual de redirecionamento ("Estamos te redirecionando para o WhatsApp para finalizar o pagamento via cartão") com contagem de 3s e link para `wa.me/...`.

Quando o cliente seleciona um método, esse método é gravado na reserva (PATCH no registro recém-criado).

## Mudanças no banco

Migração adicionando:

- Coluna `payment_method` em `public.reservations` (texto: `pix` | `card` | `null`).
- Em `public.site_settings`, novas chaves:
  - `pix_key` (texto)
  - `pix_beneficiary` (texto, ex: "SARAH PETERLI KUNERT")
  - `pix_qr_code_path` (caminho no bucket `home-assets`)

Valores iniciais já populados via `insert`:
- `pix_key` = `37.412.135/0001-74`
- `pix_beneficiary` = `SARAH PETERLI KUNERT`
- `pix_qr_code_path` = imagem que você enviou, subida para `home-assets/pix/qr-code.jpg`

## Mudanças no admin

Em `/admin/configuracoes`:
- Novo card **"Pagamento Pix"** com campos para chave Pix, nome do beneficiário e uploader da imagem do QR Code (com pré-visualização).

Em `/admin/reservas` (lista e detalhe):
- Mostrar a coluna/linha **Método de pagamento** com badge (Pix / Cartão / Não informado).

## Mudanças no fluxo público

`src/components/property/ReservationModal.tsx`:
- Remover o `SuccessView` atual (que redireciona pra WhatsApp em 3s).
- Após `createReservation` retornar sucesso, mostrar tela **PaymentChoiceView** com as duas opções.
- Ao escolher: chamar nova server fn `setReservationPaymentMethod({ reservation_id, method })` que atualiza a coluna.
- Renderizar `PixView` ou `CardRedirectView` (essa última é o `SuccessView` atual reaproveitado).

Novas server functions em `src/lib/reservations.functions.ts`:
- `setReservationPaymentMethod` (POST) — atualiza `payment_method` da reserva pelo `id` (sem auth, mas validado pelo `reservation_code` retornado para evitar abuso simples).

Nova server fn em `src/lib/home.functions.ts` (ou novo `payment.functions.ts`):
- `getPixSettings` — retorna `{ pix_key, pix_beneficiary, qr_code_url (signed) }` lendo `site_settings` via cliente publishable.

`createReservation` passa a retornar também `reservation_id` (além de `reservation_code` e `admin_whatsapp`) para que o cliente consiga atualizar o método.

## Arquivos tocados

- `supabase/migrations/...` (nova migração)
- `src/lib/reservations.functions.ts` (nova fn + ajuste de retorno)
- `src/lib/payment.functions.ts` (novo: `getPixSettings`)
- `src/components/property/ReservationModal.tsx` (novas views Pix/Cartão/escolha)
- `src/routes/_admin.admin.configuracoes.tsx` (card Pix)
- `src/routes/_admin.admin.reservas.index.tsx` e `_admin.admin.reservas.$id.tsx` (mostrar método)
- `src/components/admin/ReservationsTable.tsx` (coluna método)

## Pontos a confirmar

1. **Texto exato** do popup de escolha — está OK: "Solicitação enviada! Como deseja pagar?" + dois botões?
2. Manter o redirect automático de 3s no caminho Cartão, ou só botão manual "Abrir WhatsApp"?
3. No caminho Pix, deve haver um botão "Já paguei, abrir WhatsApp para confirmar" que leve ao WhatsApp do admin?
