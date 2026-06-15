-- Ano de compatibilidade por modelo no cadastro de produto

ALTER TABLE product_motorcycle_compatibility
  ADD COLUMN IF NOT EXISTS year INTEGER;

UPDATE product_motorcycle_compatibility pmc
SET year = COALESCE(mm.year_end, mm.year_start, EXTRACT(YEAR FROM NOW())::INTEGER)
FROM motorcycle_models mm
WHERE mm.id = pmc.motorcycle_model_id
  AND pmc.year IS NULL;

ALTER TABLE product_motorcycle_compatibility
  DROP CONSTRAINT IF EXISTS product_motorcycle_compatibility_product_id_motorcycle_model_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_moto_compat_unique
  ON product_motorcycle_compatibility (product_id, motorcycle_model_id, year);
