## Problema

O arquivo `src/routes/_public.eventos.tsx` funciona como **rota pai** (layout) de `_public.eventos.$id.tsx`, mas em vez de renderizar `<Outlet />`, ele renderiza a listagem completa de eventos. Resultado: ao navegar para `/eventos/algum-id`, o TanStack casa a rota filha corretamente, mas o pai continua mostrando a lista — e a filha nunca aparece na tela.

## Correção

Aplicar o padrão layout + index do TanStack Router:

1. **Criar `src/routes/_public.eventos.index.tsx`** — mover para cá todo o conteúdo atual de `EventsPage` (a listagem, o `head()` de "Eventos na região"), registrando como `createFileRoute("/_public/eventos/")`.

2. **Reescrever `src/routes/_public.eventos.tsx`** para ser apenas layout:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/_public/eventos")({
     component: () => <Outlet />,
   });
   ```
   (sem `head()` — o index e o `$id` definem o próprio).

3. **Nenhuma outra mudança** — o `<Link to="/eventos/$id" params={{ id }}>` no `EventsSection` já está correto, e `_public.eventos.$id.tsx` já existe e está bem construído.

O routeTree.gen.ts se regenera automaticamente. Após isso, "Ver detalhes" abre `/eventos/{id}` com os dados do evento específico.