## Problema encontrado

Fui verificar a tabela `cities` no banco e ela **não tem nenhum GRANT** (`anon`, `authenticated`, `service_role`). Isso explica os sintomas:

- **Salvar cidade dá erro** — as funções admin (`createCity`, `updateCity`, `deleteCity`) usam o cliente `supabaseAdmin` (service role), mas sem `GRANT` na tabela, o PostgREST/Data API responde "permission denied".
- **Cidades novas não aparecem em Propriedades / Anuncie / Filtros** — o `listActiveCities` usa a chave publishable (`anon`), que também precisa de `GRANT SELECT`.

Além disso, o formulário de **Eventos** (`_admin/admin/eventos`) usa `getPropertyCities()`, que só lê nomes de cidade a partir da tabela `properties`. Ou seja, uma cidade recém-criada em Configurações **nunca** aparece no select de Eventos até existir alguma propriedade com aquela cidade — inconsistente com o restante do sistema.

## Plano

### 1. Migration: adicionar GRANTs faltantes na tabela `cities`
```sql
GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
```
(RLS já está habilitada e as policies já existem — só faltam os grants para o Data API enxergar a tabela.)

### 2. Unificar a fonte de cidades no admin de Eventos
Em `src/routes/_admin.admin.eventos.tsx`:
- Trocar `getPropertyCities` por `listActiveCities` (de `@/lib/cities.functions`).
- Ordenar/exibir pelo `name` das cidades cadastradas em Configurações.
- Manter a opção "Outra cidade..." como fallback livre (mesma UX de hoje).

Depois disso, o comportamento fica consistente:

| Onde | Fonte da lista de cidades |
|---|---|
| Admin → Propriedades (form) | `listActiveCities` ✅ (já era) |
| Admin → Eventos (form) | `listActiveCities` ← **muda** |
| Home → Filtros | `listActiveCities` ✅ |
| Público → Anuncie | `listActiveCities` ✅ |

### 3. Verificação
- Após aplicar a migration, tentar criar/editar uma cidade em Configurações — o toast "Cidade salva." deve aparecer sem erro.
- Abrir o form de nova propriedade e de novo evento — a nova cidade deve constar no select.

### Fora do escopo
- Não vou mexer em `getPropertyCities` em si (ainda pode ser útil em outros lugares); só troco o uso no form de Eventos.
- Não mexo em RLS/policies existentes.
