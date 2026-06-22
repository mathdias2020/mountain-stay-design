## Objetivo

No painel `admin/home`, permitir editar o **título** e **subtítulo** que aparecem sobre o hero, e gerenciar **até 5 imagens de fundo** que rodam em slideshow automático (6s, fade) na home pública.

## Mudanças no schema de dados

Hoje `site_settings.key = 'home_hero'` guarda `{ image_path, overlay_opacity }`. Vou expandir o JSON para:

```json
{
  "title": "Sua próxima escapada nas montanhas do Espírito Santo",
  "subtitle": "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.",
  "overlay_opacity": 35,
  "images": ["hero/abc.jpg", "hero/def.jpg"]
}
```

**Migração da imagem existente:** ao ler, se vier o formato antigo (`image_path` preenchido, sem `images`), promover automaticamente `image_path` para `images[0]`. Sem SQL — tratado no parser do `home.functions.ts`.

Sem mudança de tabela, sem migration.

## Backend (`src/lib/home.functions.ts`)

- Atualizar `HomeHero` / `heroSchema` para o novo shape (title, subtitle obrigatórios; `images` array de 0–5 strings; `overlay_opacity` 0–100).
- `parseHero` aceita formato novo e antigo (faz a migração em memória).
- `getHomeHero` retorna `{ title, subtitle, overlay_opacity, image_urls: string[] }` — assinando cada path do array (mantém comportamento atual do bucket privado `home-assets`).
- `setHomeHero` valida e grava o novo JSON.

## Hero público (`src/components/home/Hero.tsx`)

- Trocar prop `imageUrl` por `imageUrls: string[]`, adicionar `title` e `subtitle`.
- Render: empilhar todas as `<img>` em `absolute inset-0`; controlar opacidade via state (`activeIndex`) com transição CSS `opacity 1000ms ease`.
- `setInterval` de 6000ms avança o índice; pausa quando `images.length <= 1`; limpa no unmount; respeita `prefers-reduced-motion` (sem auto-advance).
- Overlay escuro e textos ficam acima das imagens (z-index).
- Sem setas/bolinhas (conforme escolha do usuário).

## Home (`src/routes/_public.index.tsx`)

- Passar `imageUrls`, `title`, `subtitle`, `overlayOpacity` lidos de `getHomeHero` para `<Hero />`.

## Admin (`src/routes/_admin.admin.home.tsx`)

Seção "Hero" reformulada:

1. **Textos**
   - `Input` para Título (máx 120 chars).
   - `Textarea` para Subtítulo (máx 200 chars).
2. **Imagens (até 5)**
   - Grid com até 5 slots; cada slot mostra preview, botão remover, e setas ↑/↓ para reordenar.
   - Botão "Adicionar imagem" abre file picker → valida JPG/PNG/WebP, máx 10MB, mín 1920×720 → abre `ImageCropDialog` com `aspect = 1920/720` → upload em `home-assets/hero/<uuid>.jpg` → adiciona ao array.
   - Desabilita "Adicionar" quando já houver 5.
3. **Opacidade do overlay** (slider existente, mantém).
4. **Preview** do hero com a primeira imagem + textos digitados + overlay aplicado.
5. Botão "Salvar" chama `setHomeHero` com `{ title, subtitle, overlay_opacity, images }`.

## Arquivos tocados

- `src/lib/home.functions.ts` — schema, parser, get/set.
- `src/components/home/Hero.tsx` — slideshow + textos via props.
- `src/routes/_public.index.tsx` — passar novos props.
- `src/routes/_admin.admin.home.tsx` — UI de textos + lista de imagens.

Nenhuma alteração em outros componentes, rotas, ou banco.
