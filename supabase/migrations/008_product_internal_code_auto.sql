-- ============================================================
-- CÓDIGO INTERNO AUTOMÁTICO — 6 DÍGITOS NUMÉRICOS ÚNICOS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS product_internal_code_seq START 1;

DO $$
DECLARE
  max_numeric BIGINT;
BEGIN
  SELECT COALESCE(MAX(internal_code::BIGINT), 0)
  INTO max_numeric
  FROM products
  WHERE internal_code ~ '^\d{6}$';

  PERFORM setval(
    'product_internal_code_seq',
    GREATEST(max_numeric, 1),
    max_numeric > 0
  );
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_code_unique
  ON products (internal_code)
  WHERE internal_code IS NOT NULL AND btrim(internal_code) <> '';

CREATE OR REPLACE FUNCTION generate_product_internal_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
  candidate TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    next_val := nextval('product_internal_code_seq');
    IF next_val > 999999 THEN
      RAISE EXCEPTION 'Limite de códigos internos de 6 dígitos atingido';
    END IF;

    candidate := lpad(next_val::TEXT, 6, '0');

    IF NOT EXISTS (
      SELECT 1 FROM products WHERE internal_code = candidate
    ) THEN
      RETURN candidate;
    END IF;

    attempts := attempts + 1;
    IF attempts > 200 THEN
      RAISE EXCEPTION 'Não foi possível gerar código interno único';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION peek_next_product_internal_code()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_numeric BIGINT;
  seq_val BIGINT;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso não autorizado';
  END IF;

  SELECT COALESCE(MAX(internal_code::BIGINT), 0)
  INTO max_numeric
  FROM products
  WHERE internal_code ~ '^\d{6}$';

  SELECT last_value INTO seq_val FROM product_internal_code_seq;

  RETURN lpad((GREATEST(max_numeric, seq_val) + 1)::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_product_internal_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.internal_code IS NULL OR btrim(NEW.internal_code) = '' THEN
    NEW.internal_code := generate_product_internal_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_internal_code ON products;

CREATE TRIGGER products_set_internal_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_internal_code();

GRANT EXECUTE ON FUNCTION generate_product_internal_code() TO authenticated;
GRANT EXECUTE ON FUNCTION peek_next_product_internal_code() TO authenticated;
