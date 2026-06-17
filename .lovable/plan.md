## Problema

Depois de adicionar a imagem de fundo no Hero, o card de busca (Check-in / Check-out / Hóspedes / Região / Buscar) está sendo coberto pela faixa verde / overlay do Hero no topo, como mostra o print. O card precisa ficar **acima** do Hero (ele já sobrepõe o Hero por design — `-mt-8`), e a faixa verde/imagem do Hero precisa ficar **atrás**.

## Causa

O `<Hero>` agora tem `position: relative` com uma `<img>` e um `<div>` de overlay (`absolute inset-0`) dentro dele. O `<FiltersCard>` é irmão posterior, mas o wrapper externo do card (`<div className="mx-auto -mt-8 max-w-5xl px-6">`) não tem `position` nem `z-index`, então em alguns cenários (com a presença do overlay absoluto + `overflow-hidden` no Hero) o card termina visualmente abaixo da faixa final do Hero.

## Correção (mínima, só visual)

Arquivo: `src/components/home/FiltersCard.tsx`

- Alterar o wrapper externo de:
  ```
  <div className="mx-auto -mt-8 max-w-5xl px-6">
  ```
  para:
  ```
  <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-6">
  ```

Isso garante que o card crie um contexto de empilhamento próprio e fique pintado **por cima** da imagem + overlay do Hero, mantendo o efeito de "card flutuando sobre o hero verde/foto" que já era a intenção.

## Fora do escopo

- Não mexer no layout do Hero (altura, padding, opacidade, imagem) — só ajustar a sobreposição.
- Não mexer em business logic, dados, ou em outras seções da home.

## Verificação

Abrir `/` no preview e confirmar:
- O card de busca aparece inteiro, branco, com cantos arredondados visíveis.
- A faixa verde / foto do Hero fica atrás do card (não mais cobrindo o topo dele).
- Em mobile, o card continua centralizado e sem ser cortado.
