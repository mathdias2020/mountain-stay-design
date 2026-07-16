Ajustar o fundo verde da homepage no mobile para cobrir toda a área de propriedades, indo até abaixo do botão "Ver todas as propriedades".

## Contexto atual
- Em `src/routes/_public.index.tsx`, o fundo `bg-primary` (verde) envolve Hero, filtros e o título "Propriedades disponíveis".
- A `<section>` seguinte, com os cards e o botão "Ver todas as propriedades", é puxada para cima com `margin-top` negativo e fica sobre fundo branco/surface.
- No desktop essa divisão na altura da foto do primeiro card é o comportamento desejado; no mobile o cliente quer que o verde continue até depois do botão.

## Mudança proposta
1. Em `src/routes/_public.index.tsx`, adicionar `max-md:bg-primary` na `<section>` que lista as propriedades.
   - Isso faz com que, no mobile, o verde cubra os cards e o botão "Ver todas as propriedades", sem alterar o posicionamento/overlap existente.
   - No desktop (`md:` para cima) o fundo permanece transparente/surface, preservando o layout atual.
2. Avaliar se é necessário adicionar cantos arredondados na base da seção no mobile (`max-md:rounded-b-[14px]`) para suavizar a transição para a seção "Sobre".
3. Verificar visualmente no preview mobile que o botão fica inteiramente sobre o fundo verde e que a transição para a próxima seção fica agradável.

## Arquivos envolvidos
- `src/routes/_public.index.tsx` (único arquivo a ser editado).

## Validação
- Preview em viewport mobile para confirmar que o verde cobre toda a área de cards e o botão.
- Verificar desktop para garantir que não houve regressão.