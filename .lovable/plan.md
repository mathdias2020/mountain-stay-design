## Objetivo

1. **Homepage mobile**: transformar o hero em uma "tela de boas-vindas" 16:9 ocupando 100% da largura + altura visível do primeiro contato, com um indicador animado de rolagem. Ao rolar, o restante da home aparece normalmente.
2. **Admin Home**: permitir subir conjuntos separados de imagens de fundo — um para **desktop**, outro para **mobile** — em vez de um único conjunto compartilhado.

---

## 1. Hero mobile 16:9 com scroll hint

Arquivo: `src/components/home/Hero.tsx`

- No breakpoint mobile (`< md`):
  - Section vira `aspect-[9/16]` (retrato, mais próximo do print de referência que o usuário mandou — a foto de fundo ocupa toda a "primeira dobra" do celular). Confirma se você prefere `9/16` (retrato, cobre a tela do celular como no print) ou literalmente `16/9` (paisagem, faixa curta no topo).
  - Largura 100% (`w-screen`), sem padding lateral que crie faixas.
  - Título/subtítulo alinhados na parte inferior-central (estilo dos prints).
  - Indicador de rolagem: chevron duplo animado (bounce) + texto curto tipo "Role para explorar", posicionado no rodapé do hero, escondendo automaticamente após o primeiro scroll.
- No desktop (`md+`): mantém o comportamento atual (min-height 480, padding, texto centralizado).
- Slideshow, overlay, escalas de fonte continuam funcionando nos dois modos.

Nenhuma mudança em `_public.index.tsx` além de garantir que o hero cole no topo (sem margem/padding do layout público acima dele no mobile).

---

## 2. Admin: imagens separadas desktop × mobile

### Backend (`src/lib/home.functions.ts`)

- Adicionar campo `mobile_images: string[]` (max 5) ao tipo `HomeHero` e ao `heroSchema`. `images` permanece como "desktop".
- `getHomeHero` retorna também `mobile_image_urls: string[]` (URLs assinadas).
- `setHomeHero` aceita e persiste `mobile_images`.
- Migração: adicionar coluna/JSON field correspondente com default `[]` (o hero hoje é guardado em uma tabela de settings — vou reutilizar o mesmo registro JSON, sem nova tabela).

### Admin UI (`src/routes/_admin.admin.home.tsx`)

- Na aba do Hero, dividir a seção de imagens em duas subseções via `Tabs` (`Desktop` / `Mobile`), cada uma com seu próprio uploader, lista reordenável e limite independente (até 5 cada).
- Preview WYSIWYG: dois previews lado a lado (ou toggle) — um renderizando o Hero com as imagens desktop, outro com o `viewport` mobile forçado usando as imagens mobile. Se você preferir um único preview com toggle Desktop/Mobile, faço só um.
- Se `mobile_images` estiver vazio, o site faz fallback para `images` (desktop) no mobile, para não quebrar configurações existentes.

### Consumo público (`src/components/home/Hero.tsx` + `_public.index.tsx`)

- `Hero` recebe também `mobileImageUrls`. Escolha da lista ativa via `useMediaQuery('(max-width: 767px)')` (com fallback para desktop durante SSR/hidratação para evitar flash).
- `slide_interval_ms`, overlay, escalas continuam globais (compartilhados).

---

## Pontos que preciso confirmar antes de implementar

1. Aspect ratio do hero mobile: **9:16 (retrato, cobre a tela toda)** como nos prints, ou literal 16:9 (faixa curta no topo)?
2. Textos (título/subtítulo) no mobile: **inferior-centralizado** (como nos prints) ou continuar centralizado no meio?
3. Preview admin: **um preview com toggle Desktop/Mobile** ou **dois previews lado a lado**?
4. Escalas de fonte e overlay: manter **compartilhados** entre desktop e mobile, ou virar campos separados também?