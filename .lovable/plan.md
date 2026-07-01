# Hero da home configurável

## 1. Configuração do slideshow
- Aumentar `HERO_MAX_IMAGES` de 5 para **20** em `src/lib/home.functions.ts`.
- Adicionar campo `slide_interval_ms` ao tipo `HomeHero` (valores permitidos: 3000, 5000, 6000, 8000, 10000). Default: 6000.
- Estender `heroSchema`, `parseHero` e `defaultHero` para incluir/validar o novo campo com fallback.

## 2. Componente Hero
Em `src/components/home/Hero.tsx`:
- Remover a constante `SLIDE_INTERVAL_MS`.
- Aceitar prop `slideIntervalMs?: number` (default 6000).
- Usar essa prop no `setInterval`.

Em `src/routes/_public.index.tsx`:
- Passar `slideIntervalMs={hero?.slide_interval_ms ?? 6000}` para o `<Hero>`.

## 3. Admin — Home
Em `src/routes/_admin.admin.home.tsx`:
- No card do Hero:
  - Atualizar o texto explicativo para mencionar "até 20 imagens" e "intervalo configurável".
  - Adicionar um `<Select>` "Intervalo entre imagens" com as opções **3s, 5s, 6s, 8s, 10s**, ligado a `hero.slide_interval_ms`.
  - O contador de imagens (`{hero.images.length}/{HERO_MAX_IMAGES}`) e o botão de adicionar continuam funcionando (já usam a constante).
- Passar `slideIntervalMs` também para o `HeroPreview` para que a pré-visualização respeite o tempo escolhido.

## 4. Fora do escopo
- Nenhuma mudança em outras seções (curadoria, sobre, eventos).
- Sem migração de banco: `home_hero` já é um JSON no `site_settings`; o campo novo é aditivo com default.
- Ordem/seleção das imagens já é controlada pelo admin (mover ↑/↓, remover) — nada muda ali além do limite.

## Ordem de execução
1. Ajustes em `home.functions.ts` (tipos, schema, default, limite).
2. Prop no `Hero.tsx` + uso no `_public.index.tsx`.
3. UI no admin (`_admin.admin.home.tsx`) e no `HeroPreview`.