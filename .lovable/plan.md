## Objetivo

Criar uma nova seção no painel admin (`/admin/sobre`) dedicada a gerenciar **todo o conteúdo da marca "Sobre"**, que hoje aparece em dois lugares do site:

1. **Seção "Sobre" na Home** (`AboutSection` em `/`) — já editável em `/admin/home`.
2. **Página `/sobre`** — hoje 100% hardcoded (`src/routes/_public.sobre.tsx`): título, parágrafo de intro, blocos "Nossa região", "Como funciona", "Nosso compromisso" e o card CTA verde no rodapé.

Tudo passa a ser editado em um único lugar.

## Mudanças

### 1. Backend (Lovable Cloud)
Reaproveitar a tabela `site_settings` (mesmo padrão do `home_about` / `home_hero`). Sem nova tabela.

Novas chaves:
- `home_about` — **mantida** (seção Sobre da Home), continua editável aqui.
- `about_page` — **nova**, JSON com a estrutura:
  - `hero_title` (texto curto)
  - `hero_intro` (parágrafo)
  - `sections[]` — lista de blocos `{ title, body }` (inicialmente 3: Nossa região / Como funciona / Nosso compromisso, mas com botão "adicionar bloco" / remover / reordenar)
  - `cta_title`, `cta_subtitle`, `cta_button_label`, `cta_button_link` (default `/propriedades`)
  - `image_path` (opcional — caso queiramos adicionar uma imagem de capa à página `/sobre` no futuro; por ora apenas armazenada, não exibida, se você não quiser visual novo)

### 2. Server functions (`src/lib/home.functions.ts` ou novo `about.functions.ts`)
- `getAboutPage()` (público, com cache) — retorna o conteúdo com fallback aos textos atuais hardcoded.
- `setAboutPage()` (admin) — valida com Zod e salva.

### 3. Nova rota admin: `src/routes/_admin.admin.sobre.tsx`
Layout com duas abas (Tabs do shadcn):
- **Aba "Sobre na Home"** — mesmos campos hoje em `/admin/home` (título, corpo, label do CTA, imagem). Move o formulário existente para cá.
- **Aba "Página /sobre"** — formulário completo para `about_page`: título, intro, lista editável de blocos (título + texto), e os campos do card CTA verde.

Cada aba tem botão "Salvar" próprio.

### 4. Atualizações nos arquivos existentes
- **`src/routes/_admin.admin.home.tsx`** — remover a seção "Sobre" do formulário (fica só Hero + curadoria de propriedades). Adicionar aviso "Conteúdo Sobre movido para /admin/sobre".
- **`src/routes/_public.sobre.tsx`** — substituir conteúdo hardcoded por `useQuery(getAboutPage)`. Manter fallback caso o setting esteja vazio.
- **`src/components/layout/AdminSidebar.tsx`** — adicionar item "Sobre" (ícone `Info` ou `FileText`) e renomear "Home (slideshow / sobre)" → "Home (slideshow)".

## Pontos para você confirmar antes de eu implementar

1. **Blocos da página `/sobre`** — quer que sejam uma lista dinâmica (admin adiciona/remove blocos livremente) ou fixos nos 3 atuais (Nossa região / Como funciona / Nosso compromisso) só com texto editável?
2. **Imagem na página `/sobre`** — hoje a página é só texto. Quer aproveitar para incluir um campo de imagem (capa) editável, ou deixar só texto por enquanto?
3. **Aba única vs duas rotas** — prefere `/admin/sobre` com duas abas (Home + Página), ou duas rotas separadas (`/admin/sobre/home` e `/admin/sobre/pagina`)?
