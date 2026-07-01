## Problema

Ao editar uma propriedade e escolher uma cidade nova (criada pelo admin em Configurações → Cidades), o "Salvar" falha com "Erro ao salvar".

## Causa raiz

A tabela `properties` tem uma restrição antiga no banco (`properties_city_check`) que só aceita 6 valores fixos:

`'Domingos Martins', 'Pedra Azul', 'Marechal Floriano', 'Venda Nova do Imigrante', 'Paraju', 'Outro'`

Qualquer cidade fora dessa lista (inclusive as novas cadastradas dinamicamente na tabela `cities`) é rejeitada pelo banco no `UPDATE`/`INSERT`, e o formulário mostra a mensagem genérica "Erro ao salvar".

Isso é inconsistente com o modelo atual, em que as cidades são gerenciadas dinamicamente pelo admin.

## Correção

Uma única migration para remover a restrição fixa:

```sql
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_city_check;
```

A validação de cidade continua sendo feita:
- **no frontend** (Select mostra apenas cidades ativas da tabela `cities`, com validação Zod de string obrigatória)
- **no admin** (só quem tem role `admin` pode alterar propriedades via RLS)

## Fora de escopo

- Não vou trocar `properties.city` (text) por uma FK para `cities.id` — isso seria uma refatoração maior que afeta várias telas públicas, filtros e o form de anúncio. Só remover o CHECK já resolve o erro sem quebrar nada existente.
- Nenhuma alteração de código no frontend.

## Verificação

Depois da migration aplicada:
1. Editar uma propriedade, trocar a cidade para uma criada em Configurações → Salvar deve funcionar.
2. Criar uma nova propriedade com qualquer cidade ativa também deve funcionar.
