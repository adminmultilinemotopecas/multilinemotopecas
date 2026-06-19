-- Sincronização de preços Mercado Livre
CREATE TYPE price_sync_status AS ENUM (
  'success',
  'failed',
  'skipped',
  'low_confidence',
  'no_url',
  'blocked',
  'unavailable',
  'inactive'
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ml_source_url TEXT,
  ADD COLUMN IF NOT EXISTS last_price_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_price_sync_status price_sync_status,
  ADD COLUMN IF NOT EXISTS last_price_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_products_price_sync_enabled
  ON products (price_sync_enabled)
  WHERE price_sync_enabled = TRUE;

CREATE TABLE IF NOT EXISTS price_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC(10, 2),
  new_price NUMERIC(10, 2),
  old_promotional_price NUMERIC(10, 2),
  new_promotional_price NUMERIC(10, 2),
  status price_sync_status NOT NULL,
  error TEXT,
  source_url TEXT,
  confidence_score NUMERIC(5, 4),
  evidence JSONB NOT NULL DEFAULT '{}',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_sync_logs_product_id
  ON price_sync_logs (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS price_sync_daily_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_products INT NOT NULL DEFAULT 0,
  processed INT NOT NULL DEFAULT 0,
  succeeded INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0
);
