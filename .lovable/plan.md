# Plano: Slideshow de propriedades, seção Sobre na home, e "O que fazer na Serra Capixaba"

## 1. Slideshow de propriedades na home (3 cards, 1 linha, auto-rotate 7s)

### Comportamento

- Sempre 3 cards em uma linha (desktop). Mobile: 1 card por vez com swipe.
- Auto-rotate a cada 7 segundos, em loop infinito, pausa ao hover.
- **Respeita filtros**: se o visitante aplicar data/cidade/hóspedes, o slideshow rotaciona apenas entre propriedades que batem com o filtro. Sem filtro, usa a curadoria do admin.
- Botão "Ver todas as propriedades" preservado abaixo.

### Curadoria do admin — modos de ordenação

Novo registro em `site_settings` (`key = 'home_properties_curation'`) com JSON:

```json
{
  "mode": "manual" | "random" | "pinned",
  "pinned_ids": ["uuid1", "uuid2", "uuid3"],   // posições fixas
  "manual_order": ["uuid1", "uuid2", ...]      // ordem completa para modo manual
}
```

**Três modos:**
- **Manual** — admin define a ordem completa por drag-and-drop. As 3 primeiras aparecem no rotacionamento; as próximas entram na rotação após cada ciclo.
- **Aleatória** — ordem sorteada a cada visita (seed por sessão).
- **Pinada (híbrido)** — admin escolhe até 3 propriedades fixas em posições 1/2/3, demais entram aleatoriamente nas posições restantes.

**Quando há filtro aplicado:** o modo é ignorado e o slideshow respeita o resultado filtrado, ordenado pela curadoria onde houver match.

### UI no admin

Nova aba **"Home"** (sidebar admin) com:
- Seletor de modo (radio).
- Lista de propriedades com drag-and-drop (manual) ou seleção de slots 1/2/3 (pinada).
- Preview do slideshow.

### Tela pública

Componente `PropertiesSlideshow` usando o `Carousel` (Embla) já instalado com plugin `Autoplay({ delay: 7000, stopOnInteraction: false, stopOnMouseEnter: true })`. Reaproveita `PropertyCard`.

---

## 2. Seção "Sobre" curta na home

Novo componente `AboutSection` (acima do Instagram) com:
- Título + parágrafo curto sobre a marca.
- Imagem ilustrativa.
- CTA "Conheça nossa história" → `/sobre`.

Conteúdo gerenciável pelo admin em `site_settings` (`key = 'home_about'`): `{ title, body, image_path, cta_label }`. Reusa bucket existente ou cria `home-assets`.

### Ordem final das seções na home

```text
Hero (com card de busca)
↓
Propriedades disponíveis (slideshow 3 cards, 7s)
↓
Sobre a marca (novo)
↓
Instagram
↓
Eventos
↓
O que fazer na Serra Capixaba (novo)
```

---

## 3. "O que fazer na Serra Capixaba"

### Estrutura de dados

Nova tabela `attractions` (uma só tabela para os 3 tipos):

| Campo | Tipo |
|---|---|
| id | uuid |
| category | enum('atracao', 'restaurante', 'passeio') |
| slug | text (único por categoria) |
| title | text |
| short_description | text (cards) |
| long_description | text (página de detalhe) |
| city | text (lista dinâmica das propriedades + "Outra") |
| external_url | text nullable (site oficial, Google Maps) |
| cover_image_path | text |
| gallery (json[]) | array de paths adicionais |
| sort_order, is_active | controle |
| created_at, updated_at | timestamps |

Novo bucket privado `attraction-photos` (URLs assinadas, mesma estratégia de events/instagram).

### Seção na home

Componente `WhatToDoSection` com 3 grandes cards-categoria (não item):

```text
[🏞️ Atrações]   [🍽️ Restaurantes]   [🥾 Passeios]
  Cachoeiras       Sabores da serra      Trilhas e
  e mirantes                              experiências
  Ver tudo →       Ver tudo →             Ver tudo →
```

Cada card mostra: ícone, título da categoria, frase curta, contagem de itens ativos, imagem de fundo (primeira foto de um item da categoria, fallback estático). Clica → vai para `/atracoes`, `/restaurantes`, `/passeios`.

### Rotas públicas

3 rotas novas:
- `/atracoes`
- `/restaurantes`
- `/passeios`

Cada uma:
- Header com título da categoria, descrição curta, filtro por cidade.
- Grid responsivo de cards (1/2/3 colunas).
- Cada card: foto, título, cidade, descrição curta, "Ver mais →" linka para detalhe.

E 3 rotas de detalhe (uma por categoria, com slug):
- `/atracoes/$slug`
- `/restaurantes/$slug`
- `/passeios/$slug`

Página de detalhe: galeria de fotos (cover + gallery), título, cidade, descrição longa, botão para link externo (se houver), botão "Encontrar hospedagem perto" → `/propriedades?city=<cidade>`.

### Admin

Nova aba **"O que fazer"** na sidebar com:
- Tabs internas (Atrações / Restaurantes / Passeios).
- Listagem com thumbnail, título, cidade, ordem, switch ativo, editar/excluir.
- Formulário modal: upload de cover, upload múltiplo de galeria, título, descrição curta (texto), descrição longa (textarea maior), cidade (mesmo dropdown dinâmico de events), URL externa opcional, ordem, ativo.

### Header público

Adicionar item dropdown **"O que fazer"** com 3 sublinks (Atrações, Restaurantes, Passeios). Em mobile, vira 3 itens expandidos.

---

## 4. Detalhes técnicos

### Banco
- Migration 1: tabela `attractions` + bucket `attraction-photos` + policies de storage.
- Migration 2: tipo enum `attraction_category`.
- Migration 3: garantir `site_settings` para `home_properties_curation` e `home_about` (a tabela já existe).

### Server functions (`createServerFn`)
- `getHomeProperties({ filters })` — aplica curadoria + filtros, retorna até N (todas que rotacionam, ex. até 12).
- `getHomePropertiesCuration()` / `setHomePropertiesCuration()` — admin.
- `getHomeAbout()` / `setHomeAbout()` — admin.
- `getAttractionsByCategory({ category, city? })` — público, lista com signed URLs.
- `getAttractionBySlug({ category, slug })` — público, detalhe com galeria.
- Admin CRUD para `attractions`.

### Componentes novos
```text
src/components/home/
  PropertiesSlideshow.tsx
  AboutSection.tsx
  WhatToDoSection.tsx
src/components/attractions/
  AttractionCard.tsx
  AttractionGallery.tsx
src/routes/
  _public.atracoes.tsx
  _public.atracoes.$slug.tsx
  _public.restaurantes.tsx
  _public.restaurantes.$slug.tsx
  _public.passeios.tsx
  _public.passeios.$slug.tsx
  _admin.admin.home.tsx               (curadoria + about)
  _admin.admin.o-que-fazer.tsx        (CRUD attractions)
src/lib/
  home.functions.ts                   (curadoria propriedades + about)
  attractions.functions.ts            (público + admin)
```

### Sidebar admin (ordem final)
Visão Geral, Reservas, Propriedades, **Home**, Submissões, Instagram, Eventos, **O que fazer**, Calendário, Configurações.

### Sem retrabalho / sem redundância
- `PropertiesSlideshow` reusa `PropertyCard` (não duplica markup).
- `AttractionCard` segue o mesmo padrão visual de `EventCard`.
- Dropdown de cidade no admin reusa o `getPropertyCities` já criado.
- Signed URL helper compartilhado (refatorar pequeno helper em `src/lib/storage.ts` que recebe bucket + paths e devolve map).
- Header público: NAV agora vira estrutura com suporte a children (dropdown).

---

## Pontos NÃO cobertos
- Geração automática de slugs: trigger no banco igual ao de `properties`.
- SEO de detalhe (`og:image` puxa cover_image signed URL).
- Sem integração com Google Maps API — apenas URL livre.

## Aprovar para implementar?
Posso implementar em 2 fases para ficar mais seguro de revisar:
1. **Fase 1**: Slideshow de propriedades + curadoria admin + seção Sobre na home.
2. **Fase 2**: "O que fazer" (tabela, admin, rotas, seção na home, header dropdown).

Ou implementar tudo de uma vez. Me confirma a abordagem e sigo.
