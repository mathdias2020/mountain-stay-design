# Qualidade das fotos no desktop

## O problema é real — sim

Confirmei no código o que seu cliente percebeu:

- No upload, além da foto original, é gerada uma miniatura de **800px** no lado maior, JPEG com qualidade 78%.
- O site público (cards da home/propriedades e a **foto principal** da página do imóvel) usa essa miniatura de 800px. A foto original só é usada na galeria em tela cheia (lightbox).
- No celular, 800px cobre a largura da tela com folga, então parece nítida. No desktop, a foto principal do imóvel é exibida com cerca de 1100–1300px de largura (e mais ainda em telas Retina), ou seja, uma imagem de 800px é **esticada** — daí o aspecto borrado/perda de qualidade.

Então não é impressão: é uma imagem pequena sendo ampliada.

## O que vou fazer

1. **Gerar uma versão intermediária no upload** (~1800px no lado maior, qualidade 85%), além da miniatura de 800px que continua servindo os cards pequenos e thumbs.
2. **Usar a versão adequada em cada lugar**:
   - thumbs pequenos e cards de listagem: 800px (rápido, como hoje);
   - foto principal da página do imóvel e hero: versão de 1800px, com `srcset` para o navegador escolher conforme a tela e a densidade de pixels;
   - lightbox: original, como já é hoje.
3. **Fotos já cadastradas** (que não têm a versão intermediária): em telas grandes o site passa a usar a **foto original** em vez da miniatura de 800px, então a nitidez melhora imediatamente, sem o cliente precisar re-subir nada.
4. **Recomendação de upload** no painel admin: aviso curto indicando o tamanho ideal (lado maior ≥ 2000px) para que a versão de 1800px seja realmente nítida. Fotos enviadas pequenas não podem ser recuperadas — isso vale avisar ao cliente.

## Detalhes técnicos

- `src/lib/image-thumb.ts`: parametrizar o gerador para produzir duas saídas (800 e 1800).
- `src/components/admin/PropertyForm.tsx`: subir `id.thumb.jpg` (atual) + `id.med.jpg`, mantendo o original.
- `src/lib/properties.functions.ts`: assinar e devolver, por foto, `thumb_url`, `url` (média, com fallback para o original) e `full_url`; a listagem continua devolvendo thumbs.
- `src/components/property/PhotoGallery.tsx` e `src/components/home/PropertyCard.tsx`: consumir os novos campos com `srcset`/`sizes`; a foto principal deixa de usar o thumb de 800px.
- Sem mudança de schema: os caminhos derivados (`.thumb.jpg` / `.med.jpg`) continuam sendo resolvidos a partir de `storage_path`/`public_url`.

## Fora do escopo (posso fazer depois se quiser)

- Rotina de reprocessamento em lote das fotos antigas para gerar as versões de 1800px.
- Conversão para WebP/AVIF (ganho extra de nitidez por byte).
