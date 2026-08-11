# Refatoração da precificação — motor único

## O que muda, em resumo

Hoje o preço é calculado em vários lugares com uma lógica simples (dia de semana / fim de semana / alta temporada / taxa de limpeza). Vou substituir isso por **um único motor de cálculo** no servidor, com regras configuráveis pelo admin e detalhamento (breakdown) completo. Busca, página do imóvel, reserva e painel passam a usar o mesmo motor — mesmo input, mesmo total, sempre.

## Fases de entrega

Como é grande, proponho entregar em 4 fases, cada uma funcionando ponta a ponta:

**Fase 1 — Motor + base de dados**
- Novas tabelas: preços por dia da semana, overrides por data, regras sazonais, promoções por período, faixas de desconto por duração, desconto de última hora, taxas extras, impostos.
- Preço-base por propriedade + hóspedes incluídos + valor por hóspede adicional + taxa de pet (por reserva / noite / pet / pet-noite) + limpeza reduzida para estadias curtas.
- Migração dos dados atuais: `price_weekday` vira preço-base; `price_weekend` vira preço de sexta/sábado; alta temporada atual vira regra sazonal; `cleaning_fee` preservado. Nenhuma reserva existente é recalculada.
- Motor `calculatePrice` (servidor) com precedência fixa e trace de cálculo.
- Testes automatizados dos cenários do documento (base, dia da semana, override, sazonal+override, duração, última hora, limpeza reduzida, hóspede adicional, pet, taxa percentual).

**Fase 2 — Painel administrativo**
- Seção "Precificação" da propriedade dividida em abas: Preço, Calendário, Descontos, Promoções, Taxas, Impostos (usando os componentes atuais do admin).
- Simulador de reserva (check-in, check-out, hóspedes, pets) mostrando o breakdown.

**Fase 3 — Calendário operacional**
- Calendário por propriedade mostrando preço de cada noite, com marcação visual de: padrão, dia da semana, sazonal, override manual, promoção, reservado, bloqueado.
- Seleção de data / intervalo com "Definir preço fixo", "Estadia mínima" e "Restaurar preço calculado".

**Fase 4 — Público + reserva**
- Busca (`/propriedades` e home) e página do imóvel passam a exibir totais do motor oficial; sem datas continua "a partir de R$ X/noite".
- `BookingCard` mostra o breakdown simplificado (noites, desconto, extras, limpeza, impostos, total).
- Criação de reserva recalcula no servidor e grava **snapshot** do breakdown; reserva manual do admin usa o mesmo motor como sugestão.
- Remoção do cálculo antigo (`src/lib/pricing.ts`) depois que tudo estiver migrado.

## Regras de cálculo (precedência)

Preço da noite: base → preço do dia da semana → regra sazonal (valor fixo ou ±%) → override manual da data (vence tudo).

Depois, sobre o subtotal de hospedagem: desconto por duração (só a maior faixa aplicável) → desconto de última hora (só a maior faixa aplicável) → promoção do período. Duração + última hora + promoção podem coexistir; dentro de cada grupo não acumulam.

Em seguida: hóspedes adicionais → pet → limpeza → taxas extras → impostos (com base de incidência configurável) → total.

## Decisões técnicas que preciso confirmar

1. **Dinheiro**: manter `numeric` no banco (padrão atual) e arredondar para 2 casas em cada etapa do cálculo — evita migrar tudo para centavos.
2. **Semanal/mensal**: implementar como presets da tabela única de descontos por duração (7+ e 28+), como o próprio documento permite.
3. **Cupom**: continua existindo como hoje, aplicado no final, depois dos impostos.
4. **Estadia mínima**: passa a vir da regra sazonal / override quando existir, com fallback nos campos atuais `min_nights_weekday` / `min_nights_weekend`.
5. **Fuso**: todas as datas tratadas como `date` puro (string `YYYY-MM-DD`), sem conversão para UTC.
6. **Performance na busca**: uma única leitura em lote das regras de todas as propriedades do resultado, sem N+1.

## Riscos

- Reservas antigas não têm snapshot completo; elas continuam exibindo o `price_breakdown` que já foi gravado.
- Propriedades existentes ficam com o comportamento equivalente ao de hoje após a migração; qualquer nova regra é opt-in do admin.
