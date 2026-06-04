# Plano: RLS admin-only + storage hardening

## 1. Função `public.is_admin()`

SECURITY DEFINER, STABLE, `search_path = public`, reaproveita `user_roles`:

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
```

Reaproveita o mesmo padrão do `has_role` já existente — não duplica lógica, só encurta o call site nas policies.

## 2. Policies por tabela

Padrão: DROP das policies `*_auth_*` atuais (USING true) e recriação restrita a `public.is_admin()`. Mantém o que é legitimamente público.

### properties
- KEEP: `properties_public_read` (SELECT anon/auth, USING true) — vitrine pública.
- REPLACE: `properties_auth_insert/update/delete` → exigir `is_admin()`.

### property_photos
- KEEP: `photos_public_read`.
- REPLACE: insert/update/delete → `is_admin()`.

### blocked_dates
- KEEP: `blocked_public_read` — `expandBlockedDates`/`searchProperties` leem como anon.
- REPLACE: insert/update/delete → `is_admin()`.

### reservations
- KEEP: `reservations_public_insert` (anon/auth, WITH CHECK true) — formulário público de reserva depende disso.
- REPLACE: select/update/delete → `is_admin()`.
- NÃO adicionar SELECT público (códigos de reserva não devem vazar).

### reservation_documents
- REPLACE policy ALL → split em select/insert/update/delete restritos a `is_admin()`.

### reservation_status_history
- Trigger `reservations_log_status_change` roda em contexto da sessão → precisa que `authenticated` consiga INSERT. Como o trigger é disparado por UPDATE/INSERT em `reservations` (que já são admin-only para UPDATE; INSERT é público), e INSERT público em `reservations` também dispara o log inicial → INSERT precisa permanecer permissivo a `anon, authenticated` (WITH CHECK true) para não quebrar criação de reserva. SELECT/UPDATE/DELETE → `is_admin()`.

### site_settings
- REPLACE ALL → split, todos exigem `is_admin()`. Sem leitura pública (nada no frontend público lê isso hoje).

### user_roles
- KEEP: `user_roles_self_read` (usuário lê suas próprias roles — necessário para o gate do `_admin.tsx`).
- ADD: insert/update/delete restritos a `is_admin()` (hoje não há policy → bloqueado, mas tornar explícito).

## 3. Storage

Buckets atuais: `property-photos` (privado), `reservation-docs` (privado).

- `property-photos`: precisa de leitura pública (cards/galeria usam `public_url`). Como o bucket é privado, os `public_url` armazenados na tabela só funcionam se houver policy de SELECT pública em `storage.objects` para esse bucket. Adicionar:
  - SELECT anon/auth WHERE `bucket_id = 'property-photos'`.
  - INSERT/UPDATE/DELETE → `is_admin()`.
- `reservation-docs`: tudo restrito a `is_admin()` (SELECT/INSERT/UPDATE/DELETE).

Observação: se as fotos já carregam hoje com bucket privado, é porque há policy permissiva pré-existente em `storage.objects`. Vou listar policies atuais antes de aplicar para não duplicar/quebrar — se já existir SELECT pública para `property-photos`, mantenho.

## 4. Validação após migration

- Build automático do harness.
- Rodar `supabase--linter` e reportar warnings (separando os relacionados à migration vs pré-existentes).
- Smoke manual (mental, sem browser): vitrine pública (`properties_public_read` + `photos_public_read` + `blocked_public_read` permanecem), criação de reserva pública (`reservations_public_insert` + trigger history INSERT permissivo), admin (login + role) consegue CRUD via `is_admin()`.

## 5. Fora do escopo

- Não vou tocar em `pricing.ts`, `properties.functions.ts`, `reservations.functions.ts` — esses já usam `supabaseAdmin` (service role) e ignoram RLS.
- Não vou alterar checagem de role no React (continua como defesa em profundidade).

## Riscos

- Se o frontend público fizer SELECT em `reservations` (ex.: confirmação por código), vai parar de funcionar — preciso confirmar. Pela leitura do código atual, criação de reserva retorna dados via server function com `supabaseAdmin`, então não há leitura pública direta. **Confirme se existe alguma tela pública que lê reservations diretamente do client.**

Posso aplicar?