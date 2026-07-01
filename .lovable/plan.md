# Página de detalhes do evento + edição no admin

## 1. Banco de dados (migração)
Adicionar colunas à tabela `events`:
- `long_description` (text) — descrição longa em markdown
- `schedule` (jsonb) — array de itens `{ datetime, title, description? }`
- `gallery_paths` (text[]) — paths adicionais no bucket `event-photos`
- `location_name` (text)
- `location_address` (text)
- `map_url` (text)

Sem mudanças em RLS/policies (mantém as atuais).

## 2. Rota pública `/eventos/$id`
Nova rota `src/routes/_public.eventos.$id.tsx`:
- Server function `getEventById(id)` retornando o evento + URLs assinadas da capa e da galeria.
- Layout: capa grande, título, cidade, datas, local com link para o mapa, descrição longa (render markdown), programação em lista, galeria de fotos.
- Head/SEO por evento (title, description, og:image = capa).
- CTA no fim: "Ver hospedagens nas datas" → `/propriedades?checkin=...&checkout=...`.

## 3. Card de evento com 2 botões
Em `EventCard` (`src/components/home/EventsSection.tsx`):
- Grid de 2 colunas no rodapé do card:
  - **Ver Detalhes** (primário, verde cheio) → `Link` para `/eventos/$id`
  - **Ver Hospedagens** (secundário, outline verde) → mantém comportamento atual (`button_url` ou `/propriedades` com datas)
- Aplicado também na página `/eventos` (mesmo componente).

## 4. Admin — edição estendida
Na rota admin de eventos (`src/routes/_admin.admin.eventos.tsx`), no formulário de criar/editar, adicionar:
- Textarea de descrição longa (markdown, com hint).
- Editor de programação: lista dinâmica de itens (data/hora + título + descrição opcional), com adicionar/remover/reordenar.
- Upload múltiplo de fotos da galeria (bucket `event-photos`), com preview e remoção.
- Campos de local: nome, endereço, URL do mapa.

Server functions novas/estendidas:
- `updateEvent` aceitando os novos campos.
- `uploadEventGalleryPhoto` / remoção.

## 5. Fora do escopo
- Sem mudanças no header, filtros da home, ou outras seções.
- Sem alteração em RLS além do necessário para colunas novas (herdam as policies existentes).
- Markdown renderizado com biblioteca leve (`react-markdown`) — adicionar como dep.

## Ordem de execução
1. Migração das colunas.
2. Server functions (get by id, update estendido, upload galeria).
3. Rota pública `/eventos/$id`.
4. Ajuste do `EventCard` (2 botões).
5. Formulário do admin.
