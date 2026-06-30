Centralizar o `<nav>` desktop do `PublicHeader` em relação à largura total do header, mantendo a logo onde está (à esquerda no desktop).

## Mudança

Em `src/components/layout/PublicHeader.tsx`:

- Tornar o `<nav>` desktop posicionado de forma absoluta e centralizado no container do header (mesma técnica já usada pela logo no mobile), para que a centralização ignore a largura da logo.
- Manter a logo no fluxo normal à esquerda no desktop (`md:static`), sem alteração visual.
- Manter o botão do menu mobile como está.

### Detalhe técnico

```tsx
<nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
  ...
</nav>
```

O container pai já é `relative`, então o `absolute` centraliza o nav em relação à largura total do header (max-w-7xl), independente do tamanho da logo. A logo permanece à esquerda e o espaço do botão mobile fica vazio no desktop (já é `md:hidden`).

Nada mais é alterado: mobile, dropdown "O que fazer", estilos, cores e comportamento de scroll permanecem iguais.
