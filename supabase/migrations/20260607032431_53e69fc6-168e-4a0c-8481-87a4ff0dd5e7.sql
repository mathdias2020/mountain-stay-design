ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tier integer NOT NULL DEFAULT 3;
ALTER TABLE public.properties ADD CONSTRAINT properties_tier_range CHECK (tier IN (1,2,3,4));
COMMENT ON COLUMN public.properties.tier IS 'Classificação interna: 1=Premium, 2=Destaque, 3=Padrão, 4=Entrada. Usado para ordenação. Nunca exibir publicamente.';