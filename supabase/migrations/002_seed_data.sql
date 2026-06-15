-- Dados de exemplo para desenvolvimento

INSERT INTO brands (name, slug, description) VALUES
  ('NGK', 'ngk', 'Velas e componentes elétricos de alta performance'),
  ('Honda', 'honda', 'Peças originais e reposição Honda'),
  ('COBREQ', 'cobreq', 'Pastilhas e lonas de freio'),
  ('Yamalube', 'yamalube', 'Óleos e lubrificantes Yamaha'),
  ('Magnetron', 'magnetron', 'Iluminação e elétrica para motos')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description) VALUES
  ('Motor', 'motor', 'Peças para motor e transmissão'),
  ('Freios', 'freios', 'Pastilhas, discos e fluidos de freio'),
  ('Elétrica', 'eletrica', 'Velas, bobinas e componentes elétricos'),
  ('Suspensão', 'suspensao', 'Amortecedores e componentes'),
  ('Filtros', 'filtros', 'Filtros de ar, óleo e combustível'),
  ('Iluminação', 'iluminacao', 'Lâmpadas e faróis')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO motorcycle_models (motorcycle_brand, model, displacement, year_start, year_end, slug) VALUES
  ('Honda', 'CG 160', '160cc', 2016, NULL, 'honda-cg-160'),
  ('Honda', 'CG 150 Titan', '150cc', 2009, 2015, 'honda-cg-150-titan'),
  ('Honda', 'CB 300F Twister', '300cc', 2016, NULL, 'honda-cb-300f-twister'),
  ('Yamaha', 'Fazer 250', '250cc', 2008, NULL, 'yamaha-fazer-250'),
  ('Yamaha', 'YBR 125', '125cc', 2001, NULL, 'yamaha-ybr-125'),
  ('Suzuki', 'GSX-S750', '750cc', 2017, NULL, 'suzuki-gsx-s750')
ON CONFLICT (slug) DO NOTHING;

-- Produtos de exemplo (requer brands e categories existentes)
DO $$
DECLARE
  brand_ngk UUID;
  brand_cobreq UUID;
  cat_eletrica UUID;
  cat_freios UUID;
  moto_cg160 UUID;
  moto_titan UUID;
  prod_vela UUID;
  prod_pastilha UUID;
BEGIN
  SELECT id INTO brand_ngk FROM brands WHERE slug = 'ngk';
  SELECT id INTO brand_cobreq FROM brands WHERE slug = 'cobreq';
  SELECT id INTO cat_eletrica FROM categories WHERE slug = 'eletrica';
  SELECT id INTO cat_freios FROM categories WHERE slug = 'freios';
  SELECT id INTO moto_cg160 FROM motorcycle_models WHERE slug = 'honda-cg-160';
  SELECT id INTO moto_titan FROM motorcycle_models WHERE slug = 'honda-cg-150-titan';

  INSERT INTO products (
    name, slug, sku, internal_code, brand_id, category_id,
    price, promotional_price, short_description, full_description,
    applications, compatibilities, product_references, tags, seo_keywords,
    mercado_livre_url, listing_status, status,
    is_featured, is_bestseller, is_new
  ) VALUES (
    'Vela de Ignição NGK CR7HSA',
    'vela-ignicao-ngk-cr7hsa',
    'NGK-CR7HSA',
    'CR7HSA',
    brand_ngk,
    cat_eletrica,
    24.90,
    19.90,
    'Vela de ignição NGK CR7HSA para motos Honda CG, Biz e Pop 100/110.',
    '<p>Vela de ignição NGK CR7HSA com eletrodo de níquel, ideal para motores de baixa cilindrada.</p><p>Alta durabilidade e melhor performance de ignição.</p>',
    'Motos Honda CG 125/150/160, Biz 100/110/125, Pop 100/110',
    'Honda CG 160, CG 150 Titan, Biz 125, Pop 110i',
    'CR7HSA, 4549, BPR7HS',
    ARRAY['vela', 'ngk', 'cr7hsa', 'ignição'],
    ARRAY['vela ngk', 'vela cr7hsa', 'vela honda cg'],
    'https://produto.mercadolivre.com.br/exemplo-vela-ngk',
    'active',
    'active',
    true, true, true
  ) ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_vela;

  INSERT INTO products (
    name, slug, sku, internal_code, brand_id, category_id,
    price, short_description, full_description,
    applications, compatibilities, product_references, tags, seo_keywords,
    mercado_livre_url, listing_status, status,
    is_featured, is_bestseller, is_promotion
  ) VALUES (
    'Pastilha de Freio Dianteira Cobreq Honda CG Titan',
    'pastilha-freio-cobreq-honda-cg-titan',
    'COB-N-1085',
    'N-1085',
    brand_cobreq,
    cat_freios,
    89.90,
    'Pastilha de freio dianteira Cobreq para Honda CG Titan 150 e CG 160.',
    '<p>Pastilha de freio dianteira de alta qualidade Cobreq.</p><p>Excelente poder de frenagem e durabilidade.</p>',
    'Honda CG 150 Titan, CG 160, CB 300F',
    'Honda CG 150 Titan 2009-2015, CG 160 2016+',
    'N-1085, FA200HH',
    ARRAY['pastilha', 'freio', 'cobreq', 'titan'],
    ARRAY['pastilha titan', 'pastilha cg 160', 'freio honda'],
    'https://produto.mercadolivre.com.br/exemplo-pastilha-titan',
    'active',
    'active',
    true, true, true
  ) ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_pastilha;

  IF prod_vela IS NOT NULL THEN
    INSERT INTO product_motorcycle_compatibility (product_id, motorcycle_model_id)
    VALUES (prod_vela, moto_cg160), (prod_vela, moto_titan)
    ON CONFLICT DO NOTHING;
  END IF;

  IF prod_pastilha IS NOT NULL THEN
    INSERT INTO product_motorcycle_compatibility (product_id, motorcycle_model_id)
    VALUES (prod_pastilha, moto_cg160), (prod_pastilha, moto_titan)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
