## Plano

Criar uma nova área no painel Admin em `/admin/sobre`, dedicada exclusivamente ao conteúdo “Sobre”, separando isso da tela atual `Admin/Home`.

## O que será implementado

1. **Nova rota Admin: `/admin/sobre`**
   - Uma única rota com abas.
   - Aba **Sobre na Home** para editar a seção Sobre que aparece na página inicial.
   - Aba **Página /sobre** para editar o conteúdo da rota pública `/sobre`.

2. **Sobre na Home**
   - Mover para essa nova rota os campos que hoje ficam em `Admin/Home`:
     - título
     - texto
     - imagem
     - texto do botão/CTA
   - A seção continuará aparecendo normalmente na Home pública.
   - Em `Admin/Home`, remover essa configuração ou deixar apenas um aviso indicando que o conteúdo foi movido para `Admin/Sobre`.

3. **Página pública `/sobre`**
   - Trocar o conteúdo fixo atual por conteúdo configurável pelo Admin.
   - Manter 3 blocos fixos, conforme confirmado:
     - Nossa região
     - Como funciona
     - Nosso compromisso
   - Cada bloco terá título e texto editáveis.
   - Adicionar imagem de capa editável na página `/sobre`, conforme confirmado.

4. **Card inferior da página `/sobre`**
   - Tornar editáveis os textos do card final:
     - título
     - subtítulo
     - texto do botão
     - link do botão

5. **Backend / armazenamento**
   - Reaproveitar a estrutura existente de configurações do site.
   - Manter a configuração atual `home_about` para a seção Sobre da Home.
   - Criar uma nova configuração `about_page` para o conteúdo completo da página `/sobre`.
   - Não criar nova tabela.

6. **Menu lateral do Admin**
   - Adicionar item **Sobre** no menu lateral.
   - Ajustar o item **Home** para não indicar mais que edita a parte Sobre.

7. **Fallbacks**
   - Se ainda não houver conteúdo salvo para `/sobre`, a página continuará usando os textos atuais como padrão.
   - Isso evita página vazia depois da mudança.

## Resultado esperado

O Admin terá uma área centralizada para editar tudo relacionado a “Sobre”:

```text
Admin
├── Home
│   └── Slideshow / propriedades da Home
└── Sobre
    ├── Sobre na Home
    └── Página /sobre
        ├── capa
        ├── título e introdução
        ├── 3 blocos fixos
        └── card inferior
```

## Observação técnica

A implementação seguirá os padrões atuais do projeto com funções server-side internas, validação dos dados antes de salvar e uso do bucket de imagens já existente para assets da Home/site.