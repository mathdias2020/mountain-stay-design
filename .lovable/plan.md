## Objetivo

1. Limitar a seção "Propriedades disponíveis" da home a **6 cards** (2 linhas × 3 colunas no desktop).
2. Adicionar abaixo uma nova seção **"Siga no Instagram"** em formato de carrossel (setas + auto-play).
3. Criar área no admin para cadastrar manualmente os posts do Instagram exibidos no carrossel.

---

## 1. Banco de dados

Nova tabela `public.instagram_posts`:

| Campo         | Tipo         | Observação                                  |
|---------------|--------------|---------------------------------------------|
| image_path    | text         | path no bucket `instagram-photos`           |
| caption       | text         | legenda curta, opcional                     |
| post_url      | text         | link público do post no Instagram (opcional)|
| sort_order    | int          | controla ordem de exibição                  |
| is_active     | boolean      | admin pode ocultar sem deletar              |

- Bucket de Storage privado novo: `instagram-photos`.
- RLS:
  - Leitura pública (anon + authenticated) apenas de posts com `is_active = true`.
  - INSERT/UPDATE/DELETE só para `is_admin()`.
- Policies de Storage no bucket: SELECT público (anon, via signed URL renderizada server-side ou bucket público — usaremos signed URL no client, igual já feito em `submission-photos`, para manter padrão). Upload/Delete só admin.

---

## 2. Home — limite de 6 propriedades

Em `src/routes/_public.index.tsx`:

- Após buscar via `searchProperties`, exibir `properties.slice(0, 6)`.
- Manter contagem total mostrada ao lado do título com base no array completo.
- Adicionar abaixo do grid um botão **"Ver todas as propriedades"** linkando para `/propriedades` preservando os search params atuais (checkin/checkout/guests/city). O botão só aparece quando `total > 6`.
- Grid já é `sm:grid-cols-2 lg:grid-cols-3`; com 6 itens dá exatamente 2×3 no desktop.

Mobile fica com a coluna única atual (3 cards visíveis empilhados, depois mais 3) — sem mudança estrutural.

---

## 3. Nova seção pública "Siga no Instagram"

Novo componente `src/components/home/InstagramCarousel.tsx`:

- Renderizado **abaixo** da seção de propriedades na home (`_public.index.tsx`).
- Fetch via novo server fn público `getInstagramPosts` em `src/lib/instagram.functions.ts` (usa `supabaseAdmin` carregado dentro do handler; retorna apenas posts ativos, ordenados por `sort_order`, limit configurável).
- Para cada post, gera signed URL da imagem (válida ~1h) no server fn e devolve no DTO.
- Carrossel usa o `Carousel` do shadcn (Embla) já presente no projeto.
  - Desktop: 4 cards visíveis por slide.
  - Tablet: 2 cards.
  - Mobile: 1 card.
- Auto-play a cada 5s + setas (`CarouselPrevious` / `CarouselNext`). Plugin `embla-carousel-autoplay` (instalar) com pause-on-hover.
- Cada card é quadrado (aspect-square), arredondado, mostra a imagem. Ao clicar abre `post_url` em nova aba se existir; caso contrário, sem ação.
- Cabeçalho da seção: título "Siga no Instagram", subtítulo "Acompanhe nosso dia a dia em @rotainstay" (handle configurável depois) e link "Ver no Instagram".
- Se não houver posts ativos, a seção não é renderizada.

Acessibilidade: `aria-label` no carrossel, navegação por teclado (já suportada pelo componente).

---

## 4. Admin — CRUD de posts

Nova rota: `src/routes/_admin.admin.instagram.tsx`.

- Listagem em tabela: thumbnail, legenda, link, ordem, ativo (toggle), ações (editar/excluir).
- Botão "Novo post" abre modal/form com:
  - Upload de imagem (JPG/PNG/WEBP, até 10MB) para bucket `instagram-photos`.
  - Campo legenda (textarea, opcional, até 280 chars).
  - Campo URL do post (opcional, validação de URL).
  - Campo ordem (number).
  - Switch ativo.
- Editar reusa o mesmo form.
- Excluir: confirmação + remove arquivo do storage e linha do banco.
- Item de menu novo no `AdminSidebar` chamado "Instagram".

---

## 5. Arquivos a criar/editar

**Criar**
- `supabase/migrations/<timestamp>_instagram_posts.sql` — tabela, grants, RLS, bucket + policies.
- `src/lib/instagram.functions.ts` — `getInstagramPosts` (público), `listInstagramPostsAdmin`, `createInstagramPost`, `updateInstagramPost`, `deleteInstagramPost`.
- `src/components/home/InstagramCarousel.tsx`.
- `src/routes/_admin.admin.instagram.tsx`.

**Editar**
- `src/routes/_public.index.tsx` — slice em 6, botão "Ver todas", montar `<InstagramCarousel />`.
- `src/components/layout/AdminSidebar.tsx` — novo item "Instagram".
- `package.json` — adicionar `embla-carousel-autoplay`.

---

## 6. Pontos não cobertos (intencional)

- **Sem integração automática com Instagram Graph API**. Se no futuro quiser, plugamos por cima sem refazer a UI (mesma tabela, fonte de dados muda).
- **Handle do Instagram** (`@rotainstay`) fica hardcoded no componente por enquanto; se quiser configurável via `site_settings`, posso incluir num próximo passo.
- Não mudaremos `/propriedades`, `/sobre`, `/anuncie` nem nada do detalhe do imóvel.

---

Posso seguir com a implementação?