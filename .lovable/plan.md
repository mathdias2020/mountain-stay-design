## Objetivo

Fazer o bloco verde da home terminar exatamente na linha que separa a foto do card e a área branca de informações, em qualquer tela.

## Mudanças

Tudo em `src/routes/_public.index.tsx`. Nenhuma alteração em componentes, design system ou arquitetura.

1. Adicionar um `ref` no primeiro card de foto do slideshow (via prop opcional `firstPhotoRef` no `PropertiesSlideshow`, ou — alternativa mais isolada — um `ref` no wrapper `<section>` e um `querySelector` para `[data-card-photo]`). Decisão: usar `data-card-photo` no `PropertyCard` (atributo de marcação, zero impacto) + `ref` no wrapper da section, e medir o primeiro elemento com esse atributo.
2. Em `_public.index.tsx`: `useState<number | null>(null)` para guardar a altura da foto. Um `useEffect` cria um `ResizeObserver` que observa o primeiro `[data-card-photo]` e atualiza o state quando a altura muda.
3. Substituir o `pb-40 md:pb-56` fixo do wrapper verde por um `paddingBottom` inline calculado: `alturaDaFoto + offsetDoTopoDoCardAteOSlideshow`. O offset é a distância entre o topo do `<section>` e o topo do card (que vem do `-mt` atual + qualquer espaçamento). Mais simples: usar `position: relative` no `<section>` e medir `card.offsetTop` dentro da section; o verde precisa cobrir até `sectionTop + cardOffsetTop + photoHeight`.

### Abordagem mais limpa

Em vez de calcular o padding do verde, inverter a lógica:

- Verde vira `position: absolute` num wrapper `relative` que engloba Hero + Filters + título + parte do slideshow.
- Altura do verde = `tituloBottom + gap + photoHeight` medidos via refs e `ResizeObserver`.

Mas isso muda mais coisa. Manter abordagem direta:

- Manter estrutura atual (wrapper verde com `pb` + section com `-mt`).
- Trocar `pb-40 md:pb-56` por `style={{ paddingBottom: photoHeight + GAP }}` onde `GAP` é o espaço atual entre título e foto (~32px que já calibramos).
- Trocar `-mt-32 md:-mt-48` por `style={{ marginTop: -(photoHeight + GAP - TITLE_TO_PHOTO_GAP) }}`... fica confuso.

### Simplificação final

Reescrever só este trecho assim:
- Wrapper verde sem `pb` fixo; em vez disso, `pb` = altura da foto + 32px (gap atual desejado abaixo do título).
- `<section>` com `-mt` = altura da foto (puxa o card pra cima exatamente o tanto da foto, deixando o verde terminar na divisória foto/info).
- Fallback inicial (antes da medição): usar `pb-[420px]` / `-mt-[300px]` aproximados pra não dar flash visual.

## Fora do escopo

- Não mudar `PropertyCard` além de adicionar `data-card-photo` na div da imagem.
- Não mudar `PropertiesSlideshow`, design system, ou outras seções.
- Sem animação na transição do padding (atualização instantânea no resize).
