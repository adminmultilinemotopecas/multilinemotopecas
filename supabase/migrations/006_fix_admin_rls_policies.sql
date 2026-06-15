-- Garante que políticas admin permitam INSERT/UPDATE (WITH CHECK explícito)
-- Corrige falhas silenciosas de RLS ao salvar produtos e imagens

DO $$
DECLARE
  entry RECORD;
BEGIN
  FOR entry IN
    SELECT *
    FROM (VALUES
      ('brands', 'Admin full access brands'),
      ('categories', 'Admin full access categories'),
      ('motorcycle_models', 'Admin full access motorcycle_models'),
      ('products', 'Admin full access products'),
      ('product_images', 'Admin full access product_images'),
      ('product_motorcycle_compatibility', 'Admin full access compatibility'),
      ('product_reviews', 'Admin full access reviews'),
      ('faqs', 'Admin full access faqs')
    ) AS t(table_name, policy_name)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', entry.policy_name, entry.table_name);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL
         USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
         WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))',
      entry.policy_name,
      entry.table_name
    );
  END LOOP;
END $$;
