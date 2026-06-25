## Problema

O preview no admin (`_admin.admin.home.tsx`) é uma **versão fake**: caixa 8:3 com fontes 18/26px e texto centralizado vertical+horizontal. O hero real (`components/home/Hero.tsx`) usa altura mínima 480px, padding assimétrico (96 topo / 128 base), fontes 28/44px e 15/18px. Resultado: o que o admin vê não bate com o que sai na home.

## Solução

Substituir o preview customizado por uma **renderização WYSIWYG do próprio componente `<Hero>**`, escalada para caber na largura disponível do card. Assim qualquer mudança futura no Hero real reflete automaticamente no preview.

Além disso nessa parte do admin, que ele mexe na foto, adiciona a opção de alterar o tamanho da fonte do título que vai aparecer e do subtítulo também. 

### Como

No bloco de preview do `_admin.admin.home.tsx`:

1. Remover o markup atual da prévia (img + overlay + título/subtítulo manuais).
2. Renderizar `<Hero imageUrls={heroImageUrls} title={hero.title} subtitle={hero.subtitle} overlayOpacity={hero.overlay_opacity} />` dentro de um wrapper:
  - Wrapper externo: `overflow:hidden`, `border` e `rounded` (como hoje), com largura 100% e altura calculada para manter proporção.
  - Wrapper interno: largura fixa de referência (ex.: `1280px`) e `transform: scale(containerWidth / 1280)` com `transformOrigin: "top left"`.
  - Usar `ResizeObserver` (hook local) para recalcular a escala quando o card muda de tamanho.
  - Altura do wrapper externo = `heroRenderedHeight * scale` (capturada via `ref` no Hero).
3. Pequeno rótulo "Pré-visualização (proporcional à home)" mantido acima.

### Detalhes técnicos

- Não muda nada no `Hero.tsx`, na home pública nem nas server functions — só o admin.
- Como o Hero usa `min-height: 480`, a escala vai produzir um preview com a mesma proporção visual da home real.
- Para evitar interações (carrossel rodando dentro do preview): o slideshow do Hero continua, o que é desejável — mostra exatamente o comportamento real. Se preferir congelar, podemos passar só a primeira imagem; **vou manter o slideshow ativo a menos que você prefira congelar**.

### Fora do escopo

- Não alterar tipografia, cores, padding ou overlay do Hero real.
- Não mudar o fluxo de upload/crop de imagens.