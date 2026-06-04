-- Padronizar valor antigo "Indicação" para "Indicação de amigo"
UPDATE public.reservations
SET how_found = 'Indicação de amigo'
WHERE how_found = 'Indicação';

-- Substituir a CHECK constraint para refletir os valores usados pelo frontend
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_how_found_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_how_found_check
  CHECK (how_found IS NULL OR how_found IN ('Instagram','Indicação de amigo','Google','Outro'));