## Mudança

Adicionar setinhas (◀ ▶) sobrepostas na **foto de cada card de propriedade**, permitindo trocar entre as fotos da casa sem abrir a página de detalhes. Aplicado nos dois lugares onde o `PropertyCard` aparece: home (slideshow) e `/propriedades`.

O clique nas setas **só troca a foto** — não navega. O resto do card (título, "Ver detalhes") continua levando para a página da propriedade.

## Backend

`src/lib/properties.functions.ts` (`searchProperties` e versão admin do listing): em vez de devolver só `cover_url`, devolver `photos: string[]` com até **5 URLs assinadas** por propriedade (ordenadas por capa primeiro, depois `sort_order`). Mantém compatibilidade: `cover_url = photos[0] ?? null`.

Performance: a função já busca todas as fotos das propriedades retornadas; só vou ampliar o limite implícito para 5 por propriedade e batear a assinatura no mesmo `signMany` que já existe.

## UI no `PropertyCard`

- Estado local `index` (0..n-1).
- Foto mostra `photos[index]` (ou fallback ícone se vazio).
- Setas circulares semitransparentes nos cantos esquerdo/direito da foto. Aparecem só no hover em desktop e sempre visíveis no mobile.
- Setas com `e.preventDefault(); e.stopPropagation();` para não disparar a navegação do card.
- Indicador discreto no rodapé da foto: pontinhos (até 5) OU contador `2/5` — a definir; meu default é **pontinhos**.
- Setas escondidas quando só há 1 foto.
- Sem auto-play (o usuário pediu controle manual).
- Acessibilidade: `aria-label="Próxima foto"` / `"Foto anterior"`, navegação por teclado quando o card recebe foco.

## Fora de escopo

- Sem swipe gesture no mobile nesta etapa (posso adicionar depois se quiser).
- Sem mudança na galeria interna da página de detalhes (`PhotoGallery`) — ela já tem navegação própria.
- Sem mudança nas setas que trocam propriedades no carrossel da home — também já existem.