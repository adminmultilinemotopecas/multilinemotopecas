-- Multiline Motopeças - Schema Inicial
-- Extensões para busca avançada
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- MARCAS
-- ============================================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CATEGORIAS (hierárquicas)
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MODELOS DE MOTOCICLETAS
-- ============================================================
CREATE TABLE motorcycle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorcycle_brand TEXT NOT NULL,
  model TEXT NOT NULL,
  displacement TEXT,
  year_start INTEGER,
  year_end INTEGER,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'draft', 'out_of_stock');
CREATE TYPE listing_status AS ENUM ('active', 'paused', 'closed', 'not_listed');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL,
  internal_code TEXT,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  promotional_price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  weight DECIMAL(8,3),
  dimensions TEXT,
  short_description TEXT,
  full_description TEXT,
  technical_specs JSONB DEFAULT '[]',
  applications TEXT,
  compatibilities TEXT,
  product_references TEXT,
  tags TEXT[] DEFAULT '{}',
  seo_keywords TEXT[] DEFAULT '{}',
  mercado_livre_url TEXT,
  mercado_livre_id TEXT,
  listing_status listing_status DEFAULT 'not_listed',
  status product_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_promotion BOOLEAN DEFAULT false,
  is_launch BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  purchase_click_count INTEGER DEFAULT 0,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- IMAGENS DO PRODUTO
-- ============================================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMPATIBILIDADE PRODUTO <-> MODELO DE MOTO
-- ============================================================
CREATE TABLE product_motorcycle_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  motorcycle_model_id UUID NOT NULL REFERENCES motorcycle_models(id) ON DELETE CASCADE,
  UNIQUE(product_id, motorcycle_model_id)
);

-- ============================================================
-- AVALIAÇÕES
-- ============================================================
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LOGS DE BUSCA (analytics)
-- ============================================================
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EVENTOS DE ANALYTICS
-- ============================================================
CREATE TYPE analytics_event_type AS ENUM (
  'purchase_click',
  'product_view',
  'search',
  'share',
  'whatsapp_click'
);

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type analytics_event_type NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERFIS ADMIN
-- ============================================================
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FAQ
-- ============================================================
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);
CREATE INDEX idx_products_sku_trgm ON products USING GIN(sku gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
CREATE INDEX idx_products_internal_code_trgm ON products USING GIN(internal_code gin_trgm_ops);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_motorcycle_models_slug ON motorcycle_models(slug);
CREATE INDEX idx_search_logs_query ON search_logs(query);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);

-- ============================================================
-- FUNÇÃO: Atualizar search_vector
-- ============================================================
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  brand_name TEXT;
  category_name TEXT;
  subcategory_name TEXT;
  motorcycle_text TEXT;
BEGIN
  SELECT name INTO brand_name FROM brands WHERE id = NEW.brand_id;
  SELECT name INTO category_name FROM categories WHERE id = NEW.category_id;
  SELECT name INTO subcategory_name FROM categories WHERE id = NEW.subcategory_id;

  SELECT string_agg(
    mm.motorcycle_brand || ' ' || mm.model || ' ' || COALESCE(mm.displacement, '') || ' ' ||
    COALESCE(mm.year_start::text, '') || '-' || COALESCE(mm.year_end::text, ''),
    ' '
  ) INTO motorcycle_text
  FROM product_motorcycle_compatibility pmc
  JOIN motorcycle_models mm ON mm.id = pmc.motorcycle_model_id
  WHERE pmc.product_id = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.sku, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.internal_code, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(brand_name, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(category_name, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(subcategory_name, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.short_description, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.full_description, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.applications, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.compatibilities, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(NEW.product_references, ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(motorcycle_text, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(array_to_string(NEW.tags, ' '), ''))), 'C') ||
    setweight(to_tsvector('portuguese', unaccent(COALESCE(array_to_string(NEW.seo_keywords, ' '), ''))), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- ============================================================
-- FUNÇÃO: Busca inteligente avançada
-- ============================================================
CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  sku TEXT,
  price DECIMAL,
  promotional_price DECIMAL,
  short_description TEXT,
  mercado_livre_url TEXT,
  brand_name TEXT,
  category_name TEXT,
  primary_image_url TEXT,
  relevance REAL
) AS $$
DECLARE
  clean_query TEXT;
  ts_query TSQUERY;
BEGIN
  clean_query := trim(lower(unaccent(search_query)));

  IF clean_query = '' OR length(clean_query) < 1 THEN
    RETURN;
  END IF;

  ts_query := plainto_tsquery('portuguese', clean_query);

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.sku,
    p.price,
    p.promotional_price,
    p.short_description,
    p.mercado_livre_url,
    b.name AS brand_name,
    c.name AS category_name,
    pi.url AS primary_image_url,
    GREATEST(
      ts_rank_cd(p.search_vector, ts_query, 32),
      similarity(unaccent(lower(p.name)), clean_query),
      similarity(unaccent(lower(p.sku)), clean_query),
      similarity(unaccent(lower(COALESCE(p.internal_code, ''))), clean_query),
      similarity(unaccent(lower(COALESCE(b.name, ''))), clean_query),
      similarity(unaccent(lower(COALESCE(p.product_references, ''))), clean_query)
    )::REAL AS relevance
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT url FROM product_images
    WHERE product_id = p.id AND is_primary = true
    LIMIT 1
  ) pi ON true
  WHERE p.status = 'active'
    AND (
      p.search_vector @@ ts_query
      OR unaccent(lower(p.name)) % clean_query
      OR unaccent(lower(p.sku)) % clean_query
      OR unaccent(lower(COALESCE(p.internal_code, ''))) % clean_query
      OR unaccent(lower(COALESCE(b.name, ''))) % clean_query
      OR unaccent(lower(COALESCE(p.product_references, ''))) % clean_query
      OR unaccent(lower(p.sku)) LIKE '%' || clean_query || '%'
      OR unaccent(lower(COALESCE(p.internal_code, ''))) LIKE '%' || clean_query || '%'
      OR EXISTS (
        SELECT 1 FROM product_motorcycle_compatibility pmc
        JOIN motorcycle_models mm ON mm.id = pmc.motorcycle_model_id
        WHERE pmc.product_id = p.id
          AND (
            unaccent(lower(mm.model)) % clean_query
            OR unaccent(lower(mm.motorcycle_brand)) % clean_query
            OR unaccent(lower(COALESCE(mm.displacement, ''))) % clean_query
            OR unaccent(lower(mm.model)) LIKE '%' || clean_query || '%'
            OR unaccent(lower(mm.motorcycle_brand || ' ' || mm.model)) LIKE '%' || clean_query || '%'
          )
      )
      OR EXISTS (
        SELECT 1 FROM categories cat
        WHERE (cat.id = p.category_id OR cat.id = p.subcategory_id)
          AND unaccent(lower(cat.name)) % clean_query
      )
    )
  ORDER BY relevance DESC, p.view_count DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER motorcycle_models_updated_at BEFORE UPDATE ON motorcycle_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE motorcycle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_motorcycle_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Leitura pública para dados ativos
CREATE POLICY "Public read active brands" ON brands FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active motorcycle models" ON motorcycle_models FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active products" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Public read product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Public read compatibility" ON product_motorcycle_compatibility FOR SELECT USING (true);
CREATE POLICY "Public read approved reviews" ON product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Public read active faqs" ON faqs FOR SELECT USING (is_active = true);

-- Inserção pública para logs e analytics
CREATE POLICY "Public insert search logs" ON search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert analytics events" ON analytics_events FOR INSERT WITH CHECK (true);

-- Admin: acesso total para usuários autenticados com perfil admin
CREATE POLICY "Admin full access brands" ON brands FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access categories" ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access motorcycle_models" ON motorcycle_models FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access products" ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access product_images" ON product_images FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access compatibility" ON product_motorcycle_compatibility FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access reviews" ON product_reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access faqs" ON faqs FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin read search logs" ON search_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin read analytics" ON analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin read own profile" ON admin_profiles FOR SELECT
  USING (id = auth.uid());

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true);

CREATE POLICY "Public read product images storage" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'brand-logos', 'category-images'));
CREATE POLICY "Admin upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('product-images', 'brand-logos', 'category-images')
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );
CREATE POLICY "Admin update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('product-images', 'brand-logos', 'category-images')
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );
CREATE POLICY "Admin delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('product-images', 'brand-logos', 'category-images')
    AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================
INSERT INTO faqs (question, answer, sort_order) VALUES
  ('Como faço para comprar uma peça?', 'Clique no botão "Comprar no Mercado Livre" na página do produto. Você será direcionado para o anúncio oficial com segurança e garantia do Mercado Livre.', 1),
  ('As peças são originais?', 'Trabalhamos com peças originais e de reposição de alta qualidade das melhores marcas do mercado. Consulte a descrição de cada produto para mais detalhes.', 2),
  ('Como saber se a peça é compatível com minha moto?', 'Na página de cada produto você encontra a lista completa de compatibilidades. Use nossa busca inteligente digitando o modelo da sua moto, como "CG 160" ou "Titan 150".', 3),
  ('Qual o prazo de entrega?', 'O prazo de entrega é definido pelo Mercado Livre de acordo com sua região e a modalidade de envio escolhida no checkout.', 4),
  ('Posso trocar ou devolver?', 'Sim! As políticas de troca e devolução seguem as regras do Mercado Livre. Você tem até 7 dias após o recebimento para solicitar devolução.', 5);
