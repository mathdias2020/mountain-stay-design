INSERT INTO public.site_settings (key, value, description) VALUES
  ('block_on_request', 'false', 'Bloquear automaticamente as datas quando uma solicitação for recebida'),
  ('admin_whatsapp', '', 'WhatsApp do administrador para receber notificações')
ON CONFLICT (key) DO NOTHING;