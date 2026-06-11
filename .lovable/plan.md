## Slideshow de propriedades — refinamento

### Diagnóstico do que já existe

- O slideshow na home já mostra propriedades em **uma linha com 3 colunas** (desktop), com **autoplay de 7 segundos**, loop infinito, pause no hover.
- O admin **já tem** a tela `Admin → Home` com os 3 modos de curadoria: **Manual** (ordem específica completa), **Aleatório** e **Fixos + Aleatório** (1º, 2º e 3º fixos e o restante varia). Não precisa nem refazer nem duplicar.
- A ordem das seções na home **já está exatamente como pediu**: Propriedades → Sobre → Instagram → Eventos → O que fazer. Nada a mover.

### Único ajuste real necessário

Hoje o carrossel avança **uma página de 3 por vez** (slide 1 = props 1‑3, slide 2 = props 4‑6...). Vou trocar para o comportamento que descreveu: **avança 1 propriedade por vez** a cada 7 s, mantendo sempre 3 visíveis.

Exemplo com 5 propriedades [A, B, C, D, E]:
```text
t=0s   [A B C]
t=7s   [B C D]
t=14s  [C D E]
t=21s  [D E A]   ← loop infinito
t=28s  [E A B]
...
```

### Implementação (sem remendos)

Arquivo único: `src/components/home/PropertiesSlideshow.tsx`.

- Remover a função `chunk` e o conceito de "páginas".
- `CarouselItem` passa a ser **uma propriedade** com `basis-1/3` no desktop (3 visíveis) e `basis-full` no mobile.
- `opts={{ align: "start", loop: ordered.length > 3, slidesToScroll: 1 }}` — avança de 1 em 1.
- Mantém: autoplay 7 s, pause no hover, reset do timer quando a lista muda, curadoria via `applyCuration`, respeito a filtros ativos.
- Setas só aparecem quando `ordered.length > 3` (mesma regra de loop).
- Unifica desktop/mobile no mesmo `<Carousel>` usando `basis-full sm:basis-1/2 lg:basis-1/3` — elimina a duplicação atual de dois carrosséis (um para mobile, outro para desktop).

### Fora do escopo (mas quero confirmar antes)

- **Manter o botão "Ver todas as propriedades"** abaixo do slideshow quando houver mais de 3? (hoje aparece — sugiro manter)
- **Limite duro de 3 visíveis no desktop**, mesmo em telas muito largas? (sim, conforme pedido)
- **Mobile**: 1 visível por vez, avançando de 1 em 1 a cada 7 s — OK?

Se aprovar, vou para build mode e faço só a edição do `PropertiesSlideshow.tsx`.
