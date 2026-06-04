# Revisão geral do RotainStay

Antes de executar, confirme o plano abaixo. Vou agrupar as mudanças em 6 frentes para facilitar a revisão.

---

## 1. Responsividade mobile (breakpoint 768px)

- **`PublicHeader.tsx`**: remover qualquer menu hambúrguer existente; deixar apenas logotipo (esq.) e link "Entrar" (dir.) em todos os tamanhos.
- **`FiltersCard.tsx` (home)**: empilhar campos em coluna única abaixo de 768px (`grid-cols-1 md:grid-cols-...`), cada campo `w-full`.
- **Grid de propriedades (home `_public.index.tsx`)**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **`_public.imovel.$slug.tsx`**: layout em duas colunas vira coluna única em mobile; o card de reserva + calendário aparecem abaixo do conteúdo principal (`flex-col lg:flex-row` ou `grid` com ordem).
- **`ReservationModal.tsx`**: em mobile, dialog em `w-screen h-auto`, padding 16px, `rounded-t-none rounded-b-[14px]` (arredondado só no rodapé). Manter visual desktop atual.
- **`AdminSidebar.tsx`**: já tem drawer mobile com overlay; revisar que o botão hambúrguer está no header e o overlay é `bg-black/40`. Sem mudanças se já estiver conforme.
- **`ReservationsTable.tsx` e tabela de propriedades**: ocultar colunas secundárias em mobile via `hidden md:table-cell`. Manter visíveis: nome/hóspede, status, ações.

## 2. Loading states (skeletons)

- Substituir textos "Carregando..." e spinners por skeletons com `animate-pulse bg-[#E2E1DD]`.
- Criar componentes reutilizáveis em `src/components/skeletons/`:
  - `PropertyCardSkeleton` (já existe — reutilizar).
  - `TableRowSkeleton` (linha genérica para tabelas admin).
  - `DetailPageSkeleton` (página de imóvel).
  - `FormSkeleton` (para `/admin/propriedades/[id]/editar`).
- Aplicar em: home (`_public.index.tsx`), detalhe (`_public.imovel.$slug.tsx`), `_admin.admin.tsx` (recentes), `_admin.admin.reservas.tsx`, `_admin.admin.propriedades.tsx`, `_admin.admin.calendario.tsx`, `_admin.admin.propriedades.$id.editar.tsx`.

## 3. Estados vazios

- **`/admin/propriedades` vazio**: ícone `Home` da lucide-react, tamanho 64px, cor `#DDDCD9`, texto "Nenhuma propriedade cadastrada ainda." + botão "Cadastrar primeira propriedade" que navega para `/admin/propriedades/nova`.
- **`/admin/reservas` vazio (após filtros)**: ícone `ClipboardList`, mesmo padrão, texto "Nenhuma reserva encontrada." (sem botão).
- Criar componente reutilizável `EmptyState` em `src/components/admin/EmptyState.tsx`.

## 4. Toasts (sonner)

- Customizar `src/components/ui/sonner.tsx` para:
  - Sucesso: `bg-[#D4EDDA] border-l-[3px] border-[#3A7D44] text-[#1A5C2A]` + ícone `Check`.
  - Erro: `bg-[#F8D7DA] border-l-[3px] border-[#A63C2E] text-[#6B1F1F]` + ícone `X`.
  - Posição: `bottom-right`, duração 4000ms, `visibleToasts={3}`.
  - Animação: slide-in da direita (sonner já faz por padrão na posição bottom-right).
- Definir cores via `toastOptions.classNames` por variante (`success`, `error`).

## 5. Favicon

- Gerar `public/favicon.svg` (e `favicon.ico` se possível) com letra "R" branca centralizada em fundo `#6B7052`, formato quadrado com cantos ligeiramente arredondados.
- Atualizar `__root.tsx` para referenciar o novo favicon.

## 6. Meta tags

- Em `__root.tsx`, atualizar defaults:
  - `title`: "RotainStay — Casas para temporada nas montanhas do Espírito Santo"
  - `description`: "Alugue casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana do Espírito Santo. Reserve agora com facilidade."
  - Adicionar `og:title`, `og:description`, `og:type=website`, `og:site_name=RotainStay`, `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`.
- Rotas internas (admin, edição) continuam com seus títulos próprios já definidos.

---

## Detalhes técnicos

- **Arquivos novos**:
  - `src/components/admin/EmptyState.tsx`
  - `src/components/skeletons/TableRowSkeleton.tsx`
  - `src/components/skeletons/DetailPageSkeleton.tsx`
  - `src/components/skeletons/FormSkeleton.tsx`
  - `public/favicon.svg`
- **Arquivos editados**: `sonner.tsx`, `__root.tsx`, `PublicHeader.tsx`, `FiltersCard.tsx`, `ReservationModal.tsx`, `ReservationsTable.tsx`, todas as rotas admin listadas, `_public.index.tsx`, `_public.imovel.$slug.tsx`.
- **Sem mudanças de schema/banco**.
- **Sem mudanças de lógica de negócio** — apenas apresentação, loading/empty UI e metadata.

---

Posso seguir com este plano? Quer ajustar algum item (por exemplo: deseja `.ico` além do `.svg`, ou um design diferente para o favicon)?