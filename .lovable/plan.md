## Problema

Ao clicar nas setas do PropertyCard, a próxima foto demora 3-5s para carregar (é baixada sob demanda da URL assinada). Enquanto isso, a foto **anterior continua visível**, o que dá a sensação de que a seta não funcionou.

## Solução

Duas mudanças no `PropertyCard.tsx` (apenas frontend, sem alterar backend nem URLs):

### 1. Pré-carregar todas as fotos do card em background
Ao montar o card, disparar `new Image()` para cada uma das (até 5) URLs em `photos`. Isso aquece o cache do navegador, então depois do primeiro carregamento as setas ficam instantâneas.

### 2. Indicador de carregamento + limpar foto anterior ao trocar
- Adicionar estado `loaded[index]` (ou `isLoading` para o índice atual).
- Ao clicar na seta:
  - Atualizar o `index` imediatamente.
  - Se a próxima foto ainda não está carregada: mostrar a área da imagem em branco/skeleton (fundo `bg-secondary` que já existe) com uma **barra de progresso indeterminada** animada no topo da imagem (linha fina em `bg-white/70` com animação CSS `translate-x` em loop).
  - Quando a `<img>` dispara `onLoad`, marcar como carregada e esconder a barra.
- Usar `key={currentSrc}` na `<img>` para forçar remount e garantir que a foto anterior suma na hora (evita o "fantasma" da foto antiga).
- Manter `loading="lazy"` apenas na primeira foto; nas demais usar `loading="eager"` já que o usuário pediu para ver.

### Detalhes técnicos
- Sem mudanças em `properties.functions.ts`, sem novas requisições, sem mudar tamanho das URLs assinadas.
- A barra de progresso é indeterminada (não sabemos % real do download) — só sinaliza atividade.
- Pré-carregamento usa `new Image(); img.src = url` dentro de um `useEffect` que roda uma vez por card; respeita o cache do navegador.

### Fora do escopo
- Não mexer na galeria interna da página de detalhes.
- Não mexer no carrossel da home.
- Não trocar o backend de URLs assinadas por URLs públicas/CDN (pode ser conversa futura se quiser performance ainda melhor).
