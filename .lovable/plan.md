## Objetivo

Criar no painel admin uma área para gerenciar o catálogo de comodidades (famílias + itens). Depois, no cadastro/edição de propriedades, a lista de checkboxes passa a vir desse catálogo (não mais da constante fixa em `src/lib/property-form.ts`).

## Estrutura de dados (banco)

Duas tabelas novas em `public`:

`**amenity_categories**` (famílias, ex: "Área Externa", "Cozinha Completa")

- `id` (uuid), `name` (text, único), `sort_order` (int), `is_active` (bool), timestamps

`**amenities**` (itens individuais)

- `id` (uuid), `category_id` (fk → amenity_categories), `name` (text), `slug` (text, único — usado para gravar em `properties.amenities`), `sort_order` (int), `is_active` (bool), timestamps
- Unique (`category_id`, `name`)

RLS:

- Leitura pública (`anon` + `authenticated`) somente de itens com `is_active = true` — a home/página da propriedade precisa renderizar os labels.
- Escrita (insert/update/delete) só para admins (via `has_role(auth.uid(), 'admin')`).

Seed: migração popula com toda a lista que você mandou (famílias + itens, na ordem que você enviou).

**Propriedades existentes:** o campo `properties.amenities` (text[]) continua igual. Vamos gravar `slug` dos itens nele. Uma migração de dados mapeia os valores antigos ("Piscina", "Wi-Fi", etc.) para os novos slugs equivalentes; itens antigos sem correspondência viram um item novo "legado" ou são preservados como string livre (a decidir — ver pergunta abaixo).

## Backend (server functions)

Novo arquivo `src/lib/amenities.functions.ts`:

- `listAmenityCatalog()` — público, retorna famílias ativas com seus itens ativos, ordenados. Usado pelo form de propriedade e pela página pública.
- `listAmenityCatalogAdmin()` — admin, retorna tudo (inclusive inativos) para a tela de gestão.
- `createCategory`, `updateCategory`, `deleteCategory` — admin.
- `createAmenity`, `updateAmenity`, `deleteAmenity` — admin.
- `reorderCategories`, `reorderAmenities` — admin (atualizam `sort_order`).

Todas as mutações usam `requireSupabaseAuth` + checagem `has_role('admin')`.

## Frontend admin

Nova rota: `src/routes/_admin.admin.comodidades.tsx`

- Lista famílias (colapsáveis) com seus itens.
- Botões: nova família, novo item, editar, ativar/desativar, excluir, reordenar (drag ou setas ↑↓).
- Link no `AdminSidebar` ("Comodidades", abaixo de "Propriedades" ou em "Configurações" — ver pergunta).

## Frontend cadastro de propriedade

`src/components/admin/PropertyForm.tsx`:

- Substituir a constante `AMENITY_OPTIONS` por uma query ao catálogo (`listAmenityCatalog`).
- Renderizar checkboxes agrupados por família (hoje é uma lista flat).
- `accepts_pets` continua como flag separada (não vira amenity), igual hoje.

`src/lib/property-form.ts`:

- Remover `AMENITY_OPTIONS` e `PETS_AMENITY` (ou manter `PETS_AMENITY` se ainda usado).
- `amenities` no schema continua `z.array(z.string())` — guarda slugs.

## Frontend público (página da propriedade)

`src/components/property/AmenitiesList.tsx`:

- Hoje resolve label via mapa local fixo + ícones do `lucide-react`.
- Mudar para receber labels já resolvidos (ou buscar do catálogo). Ícones: ver pergunta abaixo.

## Migração de dados

Uma migração SQL faz o de-para dos valores atuais em `properties.amenities` (ex: "Piscina" → `piscina-privativa` ou novo slug genérico) para os slugs do novo catálogo. Itens sem match: opção A — criar item "legado" e manter; opção B — descartar; opção C — preservar string original.

## Perguntas respondidads:

1. **Ícones**: ícone padrão (check) para tudo.
2. **Onde colocar no menu admin**: dentro de `/admin/configuracoes` como uma aba
3. **Migração dos dados existentes** (propriedades já cadastradas com amenities antigas): tentar mapear automaticamente para os novos slugs equivalentes e descartar o que não bater
4. **Famílias/itens**: pode seguir exatamente a lista que mandei 
  &nbsp;