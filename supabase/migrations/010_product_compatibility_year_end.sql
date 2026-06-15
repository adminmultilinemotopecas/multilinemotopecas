-- Ano final de compatibilidade por modelo no cadastro de produto

ALTER TABLE product_motorcycle_compatibility
  ADD COLUMN IF NOT EXISTS year_end INTEGER;

UPDATE product_motorcycle_compatibility
SET year_end = year
WHERE year_end IS NULL AND year IS NOT NULL;

DROP INDEX IF EXISTS idx_product_moto_compat_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_moto_compat_model_unique
  ON product_motorcycle_compatibility (product_id, motorcycle_model_id);
