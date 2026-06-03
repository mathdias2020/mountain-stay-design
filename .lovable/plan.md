## Escopo
Revisão transversal nas páginas já criadas. Sem novas features — apenas ajustes de UI, responsividade e mensagens.

## 1. Meta tags e favicon (`src/routes/__root.tsx`)
- Substituir título/descrição padrão por:
  - title: "RotainStay — Casas para temporada nas montanhas do Espírito Santo"
  - description e og:description com o texto pedido
  - og:title, og:type=website, twitter:card=summary_large_image, twitter:title, twitter:description
- Favicon SVG inline (data URI) com letra "R" branca em quadrado `#6B7052`, registrado em `links` como `rel="icon"`.

## 2. Toasts (sonner)
- Editar `src/components/ui/sonner.tsx` para:
  - `position="bottom-right"`, `duration={4000}`, `visibleToasts={3}`
  - `toastOptions.classNames` aplicando fundo/borda/texto/ícone para variantes `success` e `error` conforme as cores pedidas
  - Animação default do sonner (slide direita / fade) já atende.

## 3. Header público (`src/components/layout/PublicHeader.tsx`)
- Garantir: logo à esquerda, "Entrar" à direita, sem hambúrguer, sempre na mesma estrutura (apenas ajustes de tipografia/espacamento em mobile).

## 4. Home (`src/components/home/FiltersCard.tsx` + grid em `_public.index.tsx`)
- Filtros: `flex flex-col md:flex-row`, campos `w-full`.
- Grid de propriedades: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Loading: usar `PropertyCardSkeleton` enquanto carrega (sem spinner).

## 5. Detalhe da propriedade (`_public.imovel.$slug.tsx`)
- Layout: `grid-cols-1 lg:grid-cols-3` — coluna lateral (BookingCard + AvailabilityCalendar) vai abaixo em mobile.

## 6. Modal de solicitação (`ReservationModal.tsx`)
- Em `< 768px`: `w-screen h-auto max-w-none rounded-t-none rounded-b-2xl` + `p-4`. Em desktop mantém estilo atual.

## 7. Painel admin
- `_admin.tsx`: header com botão hambúrguer visível só em mobile que abre `Sheet` lateral contendo o `AdminSidebar`. Sidebar normal `hidden md:flex`.
- Tabelas em `_admin.admin.reservas.tsx` e `_admin.admin.propriedades.tsx`: marcar colunas secundárias com `hidden md:table-cell`, mantendo visíveis: nome/hóspede, status e ações.

## 8. Loading states (skeletons)
- Criar `src/components/ui/skeleton-row.tsx` e `skeleton-card.tsx` (retângulos `bg-[#E2E1DD] animate-pulse`).
- Substituir spinners/`isLoading` em:
  - Home (grid) → `PropertyCardSkeleton` x6
  - Admin reservas/propriedades/calendário/configurações → skeleton rows enquanto `useQuery.isLoading`.
- Não tocar em formulários (sem loading inicial).

## 9. Estados vazios
- `_admin.admin.propriedades.tsx`: quando `data.length===0` (e sem filtro), exibir bloco centralizado com ícone `Home` 96px cor `#DDDCD9`, texto e botão "Cadastrar primeira propriedade" → `/admin/propriedades/nova`.
- `_admin.admin.reservas.tsx`: quando lista vazia, ícone `ClipboardList` 96px `#DDDCD9` e texto "Nenhuma reserva encontrada."

## Decisões a confirmar
1. **Favicon**: SVG inline data-URI (rápido, sem build asset) ok? Alternativa: gerar PNG em `src/assets/`.
2. **Toasts coloridos**: aplicar via `toastOptions.classNames` no `<Toaster />` (afeta todos os toasts já espalhados sem precisar trocar chamadas). Confirma?
3. **Drawer admin mobile**: usar componente `Sheet` (shadcn) com overlay padrão. Confirma?
4. **Skeletons**: aceitar substituição de todos os spinners atuais por skeletons (incluindo páginas internas como detalhe/calendário), ou manter spinner em ações pontuais (ex.: "Salvando…" em botões)?

Aguardo aprovação antes de implementar.