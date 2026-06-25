## Problema

No modal de reserva, os steppers de "Número de adultos" e "Número de crianças" usam limites independentes (`max={property.max_guests}` e `max={10}`). Resultado: dá pra selecionar adultos + crianças acima da capacidade da casa, e o erro só aparece ao confirmar.

## Correção

Em `src/components/property/ReservationModal.tsx`, tornar os limites dos dois steppers dinâmicos com base na capacidade restante (`property.max_guests`):

- **Adultos**: `max = property.max_guests - children` (mantendo `min = 1`).
- **Crianças**: `max = property.max_guests - adults` (mantendo `min = 0`).

Assim o botão `+` desabilita automaticamente em qualquer um dos dois assim que o total atinge `max_guests`.

Adicional: exibir uma linha discreta de ajuda abaixo dos steppers com `Total: X / max_guests hóspedes` para o usuário entender por que o `+` ficou indisponível.

Validação no servidor (`reservations.functions.ts`) e a checagem `totalGuests > max_guests` permanecem como estão (defesa em profundidade).

Sem mudanças em backend, schema ou outros componentes.