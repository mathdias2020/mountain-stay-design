## Botão flutuante de WhatsApp

### O que ficará pronto

- Uma "bolinha" verde flutuante fixa no canto inferior direito de todas as páginas públicas (home, propriedades, eventos, atrações etc.).
- Ao clicar, abre o WhatsApp **em uma nova aba** com a mensagem pré-preenchida: `Vim do site e tenho uma dúvida`.
- O número usado vem da configuração que o admin já edita em **Admin → Configurações → WhatsApp**. Se o campo estiver vazio, o botão simplesmente não aparece (nada quebrado).

### O que NÃO muda

- A página de admin de Configurações **já existe** e o campo do número do WhatsApp **já está lá** (`admin_whatsapp` em `site_settings`). Não vou duplicar tela nem mexer nesse fluxo.
- Nada na home, no header, no rodapé ou nas demais páginas é alterado — só é adicionado o widget.

### Implementação técnica

1. **Server function pública** (em `src/lib/home.functions.ts`):
   - `getWhatsappNumber()` — leitura cacheada (60s) do `site_settings.admin_whatsapp`, retornando `{ number: string | null }` já normalizado (só dígitos, sem `+`, espaços ou parênteses).
2. **Componente** `src/components/layout/FloatingWhatsApp.tsx`:
   - Usa `useQuery` para buscar o número.
   - Renderiza um `<a href="https://wa.me/<numero>?text=<msg encodada>" target="_blank" rel="noopener noreferrer">` com ícone (`MessageCircle` ou ícone do WhatsApp via SVG inline).
   - Estilo: bolinha verde do WhatsApp (`#25D366`), 56px, fixed bottom-right, sombra, leve hover scale, acessível (`aria-label="Falar no WhatsApp"`).
3. **Montagem**: incluir `<FloatingWhatsApp />` dentro do `PublicLayout` em `src/routes/_public.tsx` (fora do `<main>`, no nível raiz), assim aparece em qualquer rota pública.
4. **Sem mudanças no admin**, sem migração nova, sem secret novo.

### Detalhes pequenos a confirmar

- **Mensagem fixa**: `Vim do site e tenho uma dúvida` — confirmado pelo briefing.
- **Onde aparece**: todas as páginas públicas. (Posso esconder no admin se quiser — vou esconder por padrão já que admin está em layout separado.)
- **Mobile**: bolinha continua no canto inferior direito; em mobile ela pode subir um pouco (~24px do fundo) para não cobrir botões nativos. OK assim?

Se aprovar, troco para build mode e implemento.
