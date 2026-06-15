-- Campos para controle de verificação do link do Mercado Livre
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ml_verification_pending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ml_verification_message TEXT,
  ADD COLUMN IF NOT EXISTS ml_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_ml_verification_pending
  ON products (ml_verification_pending)
  WHERE ml_verification_pending = true;
