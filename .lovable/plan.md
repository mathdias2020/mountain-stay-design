## Correção

Exibir o valor total da reserva no pop-up do Pix.

Em `src/components/property/ReservationModal.tsx`:

1. Passar `amount={finalTotal}` (já calculado no escopo do modal — inclui desconto do cupom) para `<PixView ... />`.
2. `PixView` aceita prop `amount: number` e renderiza um bloco destacado logo abaixo do título "Pagamento via Pix", antes do QR Code:
   - Label "Valor a pagar"
   - Valor formatado em BRL (`R$ X.XXX,XX`) em tipografia grande/negrito
3. Adicionar botão "Copiar valor" ao lado, para facilitar colar no app do banco (mesmo padrão visual do "Copiar" da chave Pix).

Sem mudanças no `CardRedirectView`, backend ou pricing.