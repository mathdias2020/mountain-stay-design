CREATE OR REPLACE FUNCTION public.reservations_generate_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  yr INT;
  seq_name TEXT;
  next_val BIGINT;
BEGIN
  IF NEW.reservation_code IS NOT NULL AND NEW.reservation_code <> '' THEN
    RETURN NEW;
  END IF;
  yr := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT;
  seq_name := format('reservation_seq_%s', yr);
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = seq_name AND n.nspname = 'public'
  ) THEN
    EXECUTE format('CREATE SEQUENCE public.%I START 1', seq_name);
  END IF;
  EXECUTE format('SELECT nextval(''public.%I'')', seq_name) INTO next_val;
  NEW.reservation_code := format('RES-%s-%s', yr, lpad(next_val::TEXT, 4, '0'));
  RETURN NEW;
END;
$function$;