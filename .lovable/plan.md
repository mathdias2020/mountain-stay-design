## Objetivo

Fazer uma varredura das áreas admin e pública procurando o mesmo padrão de bug corrigido hoje (listas hardcoded que conflitam com dados dinâmicos do admin, GRANTs/CHECKs esquecidos, fontes de dados inconsistentes). Abaixo, cada item traz **o problema, o impacto real, e a correção proposta** — todos são pontuais e nenhum quebra o que já funciona.

---

## 1. Filtros públicos de cidade descartam cidades novas (BUG confirmado — impacto alto)

**Onde:** `src/routes/_public.index.tsx` e `src/routes/_public.propriedades.tsx`.

**Problema:** Ambas as páginas validam o parâmetro `city` da URL com `z.enum(CITY_VALUES)` onde `CITY_VALUES` é uma lista fixa das 6 cidades antigas. Quando o admin cria uma cidade nova em Configurações e o usuário público filtra por ela, o Zod cai no `fallback(undefined)` e **o filtro é silenciosamente descartado** — a lista mostra todas as propriedades como se nenhum filtro tivesse sido aplicado.

**Correção:** Trocar `z.enum(CITY_VALUES)` por `z.string().max(80)` (com `fallback(undefined)`) nas duas rotas. O `searchProperties` já aceita `city: string` e filtra com `.eq("city", ...)`. Remover a constante `CITY_VALUES` de ambos os arquivos.

---

## 2. Admin → Atrações usa a lista errada de cidades (BUG confirmado — impacto médio)

**Onde:** `src/routes/_admin.admin.atracoes.tsx` (linha ~97).

**Problema:** Ainda chama `getPropertyCities()` (que deriva a lista das propriedades existentes) em vez de `listActiveCities` (tabela `cities` gerenciada em Configurações). Cidades novas cadastradas no admin **não aparecem** no formulário de Atrações até que exista uma propriedade nelas — exatamente o mesmo bug que corrigimos em Eventos.

**Correção:** Trocar `getPropertyCities` por `listActiveCities` (via `useServerFn`), com queryKey `["cities", "active"]`, mapeando para `c.name`. Idem padrão de PropertyForm/Eventos.

---

## 3. Valor padrão hardcoded do formulário de propriedade (BUG leve)

**Onde:** `src/lib/property-form.ts` linha 63 — `defaultPropertyValues.city = "Domingos Martins"`.

**Problema:** Se o admin desativar/renomear "Domingos Martins" na tabela `cities`, o formulário de "Nova propriedade" abre com uma cidade default que não está mais na lista, obrigando o usuário a trocar antes de salvar (o CHECK antigo já foi removido, então não estoura mais erro no banco — mas a UX fica estranha).

**Correção:** Trocar o default para `""` (string vazia) e deixar o `PropertyForm` selecionar automaticamente a primeira cidade ativa retornada por `listActiveCities` quando o campo estiver vazio no modo "create". Zero impacto no modo "edit" (usa `initialValues.city`).

---

## 4. Fluxo `updateCity` — nomes de cidade duplicados nas propriedades (risco médio)

**Onde:** `src/lib/cities.functions.ts` linhas 151–156.

**Problema:** Quando o admin renomeia a cidade "X" para "Y", o código faz `UPDATE properties SET city='Y' WHERE city='X'`. Isso é correto — **mas** se já existir uma cidade "Y" ativa, o admin acaba com duas cidades diferentes (`id` diferentes) usando o mesmo `name`, e depois de renomear todas as propriedades apontam para "Y" indistintamente. Não quebra nada agora, mas cria ambiguidade.

**Correção:** Antes do `UPDATE`, checar se já existe outra cidade com o mesmo `name` (case-insensitive). Se existir, recusar a rename com mensagem "Já existe uma cidade com esse nome." O erro de constraint 23505 já é tratado no `insert`; aqui falta a checagem simétrica no `update`.

---

## 5. Validação de WhatsApp mais estrita que o banco (inconsistência menor)

**Onde:** `src/lib/reservations.functions.ts` linha 12 (regex `^\d{11}$`) vs `reservations_whatsapp_check` no banco (`^[0-9]{10,15}$`).

**Problema:** O código só aceita 11 dígitos (padrão BR celular), mas o CHECK do banco aceita 10–15. Não gera bug hoje (código é mais estrito, o banco nunca reclama). Apenas registro para consciência — **não precisa mexer** a menos que você queira aceitar telefones internacionais ou fixo.

**Sem correção proposta.** Deixar como está.

---

## 6. `properties_city_check` — outros CHECKs hardcoded para revisar

Já removemos `properties_city_check`. Outros CHECKs com listas fixas encontrados:

- `properties_status_check` (active/inactive/maintenance) — fixo no código, sem UI para adicionar novos → **manter**.
- `properties_tier_range` (1..4) — fixo no código → **manter**.
- `reservations_status_check` (pending/confirmed/cancelled/completed) → **manter**.
- `reservations_payment_method_check` (pix/card) → **manter**.
- `reservations_how_found_check` (Instagram/Indicação/Google/Outro) — fixo no código e no schema Zod, sem UI dinâmica → **manter**.
- `property_submissions_status_check` (pendente/em_analise/aprovada/recusada/arquivada) → **manter**.

Nenhum outro representa risco.

---

## 7. GRANTs de tabelas — verificação já feita, sem ação

A auditoria confirma que o projeto usa `supabaseAdmin` (service role, bypassa RLS) para praticamente toda leitura pública via server functions. Isso funciona hoje. Não vou mexer nesse padrão nesta rodada — mudanças em massa nos GRANTs poderiam quebrar leituras existentes. Se você quiser um dia migrar para o modelo "publishable + RLS restrito", isso é um refactor separado (fora desta auditoria).

---

## Plano de execução

Vou fazer tudo em uma única leva de edições, **só de código no frontend** (sem migration, sem mexer em RLS/GRANTs, sem mudar server functions existentes exceto o item 4):

1. `src/routes/_public.index.tsx` — remover `CITY_VALUES`, trocar validação por `z.string().max(80)`.
2. `src/routes/_public.propriedades.tsx` — idem.
3. `src/routes/_admin.admin.atracoes.tsx` — trocar `getPropertyCities` por `listActiveCities`.
4. `src/lib/property-form.ts` — `defaultPropertyValues.city = ""`.
5. `src/components/admin/PropertyForm.tsx` — no modo `create`, quando `city` estiver vazio e `activeCities` chegar, setar a primeira automaticamente.
6. `src/lib/cities.functions.ts` — no `updateCity`, checar conflito de nome antes de renomear.

## Fora de escopo

- Refatorar `properties.city` (text) para FK em `cities.id`.
- Migrar leituras públicas de `supabaseAdmin` → publishable + RLS.
- Ajustar validação de WhatsApp para aceitar 10–15 dígitos.
- Qualquer mudança em CHECKs estáticos legítimos (status, tier, payment_method, how_found, submission status).

## Verificação após aplicar

1. Criar uma cidade "Guarapari" em Configurações.
2. Filtrar por Guarapari na home e em `/propriedades` — deve funcionar e refletir na URL.
3. Abrir admin → Atrações → nova atração — Guarapari aparece no select.
4. Abrir admin → Propriedades → nova propriedade — o select vem com a primeira cidade ativa selecionada.
5. Renomear "Guarapari" para "Anchieta" quando já existir "Anchieta" — recusa com mensagem clara.
