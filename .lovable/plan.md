## Objetivo
Deixar o header público transparente no mobile, exibindo a foto de fundo do Hero por trás dele, com logo, texto e ícone do menu em branco. O drawer mobile continua branco como está hoje.

## Decisões confirmadas
- Header transparente **sempre** no mobile (não apenas sobre o Hero).
- Drawer lateral ao abrir o menu continua **branco**.
- Desktop permanece inalterado (fundo branco, texto escuro).

## Implementação

### 1. `src/components/layout/PublicHeader.tsx`
- Adicionar detecção de viewport mobile (`max-width: 767px`).
- No mobile:
  - Posicionar header como `fixed top-0` (ou `absolute`) sobre o conteúdo.
  - Remover fundo branco e borda inferior (`bg-transparent`).
  - Tornar logo, links de navegação e ícone do menu **brancos**.
  - Adicionar um gradiente escuro sutil por trás do header (`bg-gradient-to-b from-black/40 to-transparent`) para garantir legibilidade do texto branco sobre qualquer fundo, sem esconder completamente a imagem.
  - Manter `z-50` para ficar acima do Hero.
- No desktop: manter comportamento atual (fundo branco, texto escuro).
- Drawer mobile: **não alterar** — continua branco com links escuros.

### 2. `src/components/home/Hero.tsx`
- Ajustar altura do Hero mobile de `calc(100dvh - 68px)` para `100dvh` (ou `100svh`), pois o header passa a sobrepor a imagem.
- Adicionar `padding-top` no conteúdo do Hero mobile equivalente à altura do header (~68–72 px), para que o título e subtítulo não fiquem escondidos atrás do header.
- Garantir que o indicador "Role para explorar" continue visível e posicionado na parte inferior da tela.

### 3. Ajustes no layout geral (`src/routes/_public.tsx`)
- Verificar se o header fixo no mobile não cria espaçamento indesejado no topo das páginas subsequentes.
- Se necessário, compensar com `pt-[altura-do-header]` apenas nas rotas que não possuem Hero em tela cheia.

## Resultado esperado
- No mobile, o usuário vê a foto de fundo do Hero ocupando toda a tela inicial, com o header transparente e elementos em branco por cima.
- Ao rolar para baixo, o header permanece transparente com texto branco (com gradiente sutil para legibilidade).
- Ao abrir o menu hambúrguer, o drawer continua branco e legível.
- Desktop não sofre alterações visuais.

## Arquivos alterados
- `src/components/layout/PublicHeader.tsx`
- `src/components/home/Hero.tsx`
- Possivelmente `src/routes/_public.tsx` (ajuste de espaçamento, se necessário)