## Termos de Uso e Política de Privacidade

Admin sobe PDFs no painel; site mostra links que abrem em nova aba; mantém histórico de versões.

### 1. Banco de dados (nova migração)

Nova tabela `legal_documents`:
- `id` (uuid, pk)
- `doc_type` (enum/text: `terms` | `privacy`)
- `version` (int, auto-incremento por `doc_type`)
- `storage_path` (text — caminho no bucket)
- `file_size` (int), `original_filename` (text)
- `is_current` (bool — só uma versão "atual" por tipo)
- `uploaded_by` (uuid), `created_at` (timestamptz)
- Índice em `(doc_type, is_current)` e `(doc_type, version)`

RLS:
- `SELECT` para `anon` e `authenticated` apenas onde `is_current = true` (para gerar URL pública)
- `INSERT/UPDATE/DELETE` apenas admin (`has_role(auth.uid(), 'admin')`)
- GRANTs explícitos conforme padrão

Novo bucket de Storage **`legal-documents`** (privado):
- Caminho: `{terms|privacy}/v{N}-{timestamp}.pdf`
- Policies em `storage.objects`: leitura aberta (anon + authenticated) só nesse bucket; escrita só admin
- URL pública: ao clicar, gera **signed URL** de 1h via serverFn e abre em nova aba (mantém bucket privado, mas acessível por link temporário)

### 2. Server functions (`src/lib/legal.functions.ts`)

- `getCurrentLegalDoc({ docType })` — público; retorna `{ version, storage_path, signed_url, updated_at } | null`
- `listLegalDocVersions({ docType })` — admin; lista histórico
- `uploadLegalDoc({ docType, file })` — admin; valida MIME `application/pdf` e tamanho ≤ 10 MB, faz upload, cria registro com `version = max+1` e marca como `is_current` (transação que desmarca a anterior)
- `setCurrentLegalDoc({ id })` — admin; permite reverter para versão anterior
- `deleteLegalDocVersion({ id })` — admin; bloqueia exclusão da versão atual

Todas usam `requireSupabaseAuth` + verificação `has_role('admin')` exceto `getCurrentLegalDoc`.

### 3. Admin — nova aba dentro de `/admin/configuracoes`

Adicionar um Card "Termos de Uso e Política de Privacidade" no fim da página (não criar rota nova, mantém tudo agrupado):
- Duas seções (Termos / Privacidade), cada uma com:
  - Versão atual exibida (nº, data, nome do arquivo) + botão "Abrir PDF atual"
  - Input de upload (aceita só `.pdf`)
  - Lista colapsável "Versões anteriores" com botões "Abrir", "Tornar atual", "Excluir"
- Confirmação antes de "Tornar atual" e "Excluir"
- Toasts de sucesso/erro

### 4. Frontend público

**Rodapé (`PublicFooter.tsx`)**: adicionar dois links "Termos de Uso" e "Política de Privacidade" abaixo do copyright. Cada link chama uma função que busca a signed URL via `getCurrentLegalDoc` e abre em `window.open(url, "_blank", "noopener,noreferrer")`. Se não houver doc cadastrado, link fica desabilitado/oculto.

**Checkbox da reserva (`ReservationModal.tsx`)**: substituir o texto plano "Li e aceito os termos de uso e a política de reservas..." por:
> "Li e aceito os [termos de uso](#) e a [política de privacidade](#) da RotainStay."

Cada link abre o PDF correspondente em nova aba (mesma função do rodapé). Sem alteração na lógica de aceite.

### 5. Detalhes técnicos

- Componente reutilizável `<LegalLink docType="terms"|"privacy" className="..." children="..."/>` em `src/components/legal/LegalLink.tsx` — encapsula a busca + open
- Signed URL gerada sob demanda no clique (não pré-buscar para todas as páginas) com cache de 5min via `useQuery` por `docType`
- Validação no servidor: header MIME + magic bytes do PDF (`%PDF-`) para evitar uploads disfarçados

### 6. Fora de escopo

- Editor de texto rico / página HTML dedicada (`/termos`, `/privacidade`)
- Notificação a usuários quando termos mudam
- Registro de qual versão cada reserva aceitou (a coluna `terms_accepted` existente continua boolean simples)
