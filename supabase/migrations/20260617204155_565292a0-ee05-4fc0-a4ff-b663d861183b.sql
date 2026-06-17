
-- 1. amenity_categories
CREATE TABLE public.amenity_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.amenity_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenity_categories TO authenticated;
GRANT ALL ON public.amenity_categories TO service_role;
ALTER TABLE public.amenity_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories" ON public.amenity_categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all categories" ON public.amenity_categories
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert categories" ON public.amenity_categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.amenity_categories
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.amenity_categories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_amenity_categories_updated
  BEFORE UPDATE ON public.amenity_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. amenities
CREATE TABLE public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.amenity_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
GRANT SELECT ON public.amenities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenities TO authenticated;
GRANT ALL ON public.amenities TO service_role;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active amenities" ON public.amenities
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all amenities" ON public.amenities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert amenities" ON public.amenities
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update amenities" ON public.amenities
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete amenities" ON public.amenities
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_amenities_updated
  BEFORE UPDATE ON public.amenities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_amenities_category ON public.amenities(category_id);

-- 3. Seed categorias
INSERT INTO public.amenity_categories (name, sort_order) VALUES
  ('Área Externa', 10),
  ('Área Gourmet e Lazer', 20),
  ('Vistas e Localização', 30),
  ('Quartos e Suítes', 40),
  ('Banheiros', 50),
  ('Cozinha Completa', 60),
  ('Tecnologia e Conectividade', 70),
  ('Conforto', 80),
  ('Entretenimento', 90),
  ('Família e Crianças', 100),
  ('Serviços', 110),
  ('Estacionamento e Segurança', 120),
  ('Experiências Exclusivas', 130);

-- 4. Seed itens (slugs globalmente únicos; duplicados entre famílias mantidos na 1ª)
WITH seed(cat_name, item_name, slug, ord) AS (VALUES
  -- Área Externa
  ('Área Externa','Piscina privativa','piscina-privativa',10),
  ('Área Externa','Piscina aquecida','piscina-aquecida',20),
  ('Área Externa','Ofurô','ofuro',30),
  ('Área Externa','Hidromassagem','hidromassagem',40),
  ('Área Externa','Jacuzzi','jacuzzi',50),
  ('Área Externa','Deck com vista panorâmica','deck-com-vista-panoramica',60),
  ('Área Externa','Jardim privativo','jardim-privativo',70),
  ('Área Externa','Área gramada','area-gramada',80),
  ('Área Externa','Fire pit (lareira externa)','fire-pit',90),
  ('Área Externa','Espaço para contemplação','espaco-para-contemplacao',100),
  ('Área Externa','Varanda','varanda',110),
  ('Área Externa','Sacada','sacada',120),
  ('Área Externa','Área de descanso ao ar livre','area-de-descanso-ao-ar-livre',130),
  ('Área Externa','Espreguiçadeiras','espreguicadeiras',140),
  ('Área Externa','Ombrelones','ombrelones',150),
  ('Área Externa','Mesa externa para refeições','mesa-externa-para-refeicoes',160),
  -- Área Gourmet e Lazer
  ('Área Gourmet e Lazer','Churrasqueira','churrasqueira',10),
  ('Área Gourmet e Lazer','Churrasqueira gourmet','churrasqueira-gourmet',20),
  ('Área Gourmet e Lazer','Parrilla','parrilla',30),
  ('Área Gourmet e Lazer','Forno de pizza','forno-de-pizza',40),
  ('Área Gourmet e Lazer','Área gourmet completa','area-gourmet-completa',50),
  ('Área Gourmet e Lazer','Mesa de jantar ampla','mesa-de-jantar-ampla',60),
  ('Área Gourmet e Lazer','Adega','adega',70),
  ('Área Gourmet e Lazer','Cervejeira','cervejeira',80),
  ('Área Gourmet e Lazer','Máquina de gelo','maquina-de-gelo',90),
  ('Área Gourmet e Lazer','Bar','bar',100),
  ('Área Gourmet e Lazer','Espaço para eventos intimistas','espaco-para-eventos-intimistas',110),
  -- Vistas e Localização
  ('Vistas e Localização','Vista para a Pedra Azul','vista-para-a-pedra-azul',10),
  ('Vistas e Localização','Vista para as montanhas','vista-para-as-montanhas',20),
  ('Vistas e Localização','Vista panorâmica','vista-panoramica',30),
  ('Vistas e Localização','Vista para a natureza','vista-para-a-natureza',40),
  ('Vistas e Localização','Vista para o vale','vista-para-o-vale',50),
  ('Vistas e Localização','Vista para o pôr do sol','vista-para-o-por-do-sol',60),
  ('Vistas e Localização','Vista para o nascer do sol','vista-para-o-nascer-do-sol',70),
  ('Vistas e Localização','Cercada por áreas verdes','cercada-por-areas-verdes',80),
  ('Vistas e Localização','Ambiente privativo e exclusivo','ambiente-privativo-e-exclusivo',90),
  -- Quartos e Suítes (Ar-condicionado e Smart TV ficam aqui; removidos das demais)
  ('Quartos e Suítes','Suítes amplas','suites-amplas',10),
  ('Quartos e Suítes','Camas king size','camas-king-size',20),
  ('Quartos e Suítes','Camas queen','camas-queen',30),
  ('Quartos e Suítes','Roupa de cama premium','roupa-de-cama-premium',40),
  ('Quartos e Suítes','Travesseiros extras','travesseiros-extras',50),
  ('Quartos e Suítes','Cobertores','cobertores',60),
  ('Quartos e Suítes','Blackout nas janelas','blackout-nas-janelas',70),
  ('Quartos e Suítes','Ar-condicionado','ar-condicionado',80),
  ('Quartos e Suítes','Ventilador','ventilador',90),
  ('Quartos e Suítes','Smart TV','smart-tv',100),
  ('Quartos e Suítes','Guarda-roupas','guarda-roupas',110),
  ('Quartos e Suítes','Cabides','cabides',120),
  ('Quartos e Suítes','Cofre','cofre',130),
  ('Quartos e Suítes','Espaço para trabalho','espaco-para-trabalho',140),
  -- Banheiros (Hidromassagem omitida por estar em Área Externa)
  ('Banheiros','Banheira','banheira',10),
  ('Banheiros','Toalhas de banho','toalhas-de-banho',20),
  ('Banheiros','Toalhas para piscina','toalhas-para-piscina',30),
  ('Banheiros','Secador de cabelo','secador-de-cabelo',40),
  -- Cozinha Completa
  ('Cozinha Completa','Geladeira','geladeira',10),
  ('Cozinha Completa','Freezer','freezer',20),
  ('Cozinha Completa','Fogão','fogao',30),
  ('Cozinha Completa','Cooktop','cooktop',40),
  ('Cozinha Completa','Forno elétrico','forno-eletrico',50),
  ('Cozinha Completa','Micro-ondas','micro-ondas',60),
  ('Cozinha Completa','Air Fryer','air-fryer',70),
  ('Cozinha Completa','Cafeteira','cafeteira',80),
  ('Cozinha Completa','Máquina de café expresso','maquina-de-cafe-expresso',90),
  ('Cozinha Completa','Liquidificador','liquidificador',100),
  ('Cozinha Completa','Sanduicheira','sanduicheira',110),
  ('Cozinha Completa','Torradeira','torradeira',120),
  ('Cozinha Completa','Chaleira elétrica','chaleira-eletrica',130),
  ('Cozinha Completa','Panela de pressão','panela-de-pressao',140),
  ('Cozinha Completa','Panelas completas','panelas-completas',150),
  ('Cozinha Completa','Travessas','travessas',160),
  ('Cozinha Completa','Assadeiras','assadeiras',170),
  ('Cozinha Completa','Talheres completos','talheres-completos',180),
  ('Cozinha Completa','Pratos','pratos',190),
  ('Cozinha Completa','Copos','copos',200),
  ('Cozinha Completa','Taças de vinho','tacas-de-vinho',210),
  ('Cozinha Completa','Taças de espumante','tacas-de-espumante',220),
  ('Cozinha Completa','Utensílios de cozinha','utensilios-de-cozinha',230),
  ('Cozinha Completa','Mesa de jantar','mesa-de-jantar',240),
  -- Tecnologia e Conectividade (Smart TV omitido)
  ('Tecnologia e Conectividade','Wi-Fi','wi-fi',10),
  ('Tecnologia e Conectividade','TV a cabo','tv-a-cabo',20),
  ('Tecnologia e Conectividade','Streaming disponível','streaming-disponivel',30),
  -- Conforto (Ar-condicionado omitido)
  ('Conforto','Lareira','lareira',10),
  ('Conforto','Aquecimento','aquecimento',20),
  ('Conforto','Cortinas blackout','cortinas-blackout',30),
  ('Conforto','Decoração sofisticada','decoracao-sofisticada',40),
  ('Conforto','Pé-direito elevado','pe-direito-elevado',50),
  ('Conforto','Grandes janelas panorâmicas','grandes-janelas-panoramicas',60),
  -- Entretenimento
  ('Entretenimento','Sala de jogos','sala-de-jogos',10),
  ('Entretenimento','Mesa de sinuca','mesa-de-sinuca',20),
  ('Entretenimento','Mesa de pebolim','mesa-de-pebolim',30),
  ('Entretenimento','Jogos de tabuleiro','jogos-de-tabuleiro',40),
  ('Entretenimento','Espaço kids','espaco-kids',50),
  ('Entretenimento','TV na sala','tv-na-sala',60),
  ('Entretenimento','Home theater','home-theater',70),
  ('Entretenimento','Videogame','videogame',80),
  -- Família e Crianças
  ('Família e Crianças','Berço','berco',10),
  ('Família e Crianças','Cadeira de alimentação','cadeira-de-alimentacao',20),
  ('Família e Crianças','Banheira infantil','banheira-infantil',30),
  ('Família e Crianças','Espaço para crianças','espaco-para-criancas',40),
  ('Família e Crianças','Área segura para famílias','area-segura-para-familias',50),
  -- Serviços
  ('Serviços','Café da manhã (quando contratado)','cafe-da-manha',10),
  ('Serviços','Serviço de limpeza (quando contratado)','servico-de-limpeza',20),
  ('Serviços','Concierge','concierge',30),
  ('Serviços','Check-in facilitado','check-in-facilitado',40),
  ('Serviços','Atendimento personalizado','atendimento-personalizado',50),
  ('Serviços','Indicações de passeios e restaurantes','indicacoes-de-passeios',60),
  -- Estacionamento e Segurança
  ('Estacionamento e Segurança','Estacionamento privativo','estacionamento-privativo',10),
  ('Estacionamento e Segurança','Garagem coberta','garagem-coberta',20),
  ('Estacionamento e Segurança','Portão eletrônico','portao-eletronico',30),
  ('Estacionamento e Segurança','Câmeras externas','cameras-externas',40),
  ('Estacionamento e Segurança','Condomínio fechado','condominio-fechado',50),
  ('Estacionamento e Segurança','Segurança 24 horas','seguranca-24-horas',60),
  -- Experiências Exclusivas
  ('Experiências Exclusivas','Ideal para casais','ideal-para-casais',10),
  ('Experiências Exclusivas','Ideal para famílias','ideal-para-familias',20),
  ('Experiências Exclusivas','Ideal para grupos','ideal-para-grupos',30),
  ('Experiências Exclusivas','Experiência romântica','experiencia-romantica',40),
  ('Experiências Exclusivas','Refúgio na montanha','refugio-na-montanha',50),
  ('Experiências Exclusivas','Experiência de luxo','experiencia-de-luxo',60),
  ('Experiências Exclusivas','Contato com a natureza','contato-com-a-natureza',70),
  ('Experiências Exclusivas','Perfeito para comemorações especiais','perfeito-para-comemoracoes',80),
  ('Experiências Exclusivas','Ambiente para descanso e desconexão','ambiente-para-descanso',90),
  ('Experiências Exclusivas','Experiência premium em Pedra Azul','experiencia-premium-pedra-azul',100)
)
INSERT INTO public.amenities (category_id, name, slug, sort_order)
SELECT c.id, s.item_name, s.slug, s.ord
FROM seed s
JOIN public.amenity_categories c ON c.name = s.cat_name;

-- 5. Migração dos dados existentes em properties.amenities (jsonb array de strings)
-- Mapa label antigo -> slug novo. Não-mapeados são descartados.
-- "Aceita pets" é descartado do array (já existe accepts_pets flag).
WITH old_to_new(old_label, new_slug) AS (VALUES
  ('Piscina','piscina-privativa'),
  ('Churrasqueira','churrasqueira'),
  ('Wi-Fi','wi-fi'),
  ('Lareira','lareira'),
  ('Ar-condicionado','ar-condicionado'),
  ('TV Smart','smart-tv'),
  ('Estacionamento','estacionamento-privativo'),
  ('Vista para montanha','vista-para-as-montanhas'),
  ('Área de jogos','sala-de-jogos')
)
UPDATE public.properties p
SET amenities = COALESCE((
  SELECT jsonb_agg(DISTINCT mapped.new_slug ORDER BY mapped.new_slug)
  FROM jsonb_array_elements_text(p.amenities) AS old_label
  JOIN old_to_new mapped ON mapped.old_label = old_label
), '[]'::jsonb)
WHERE jsonb_typeof(p.amenities) = 'array';
