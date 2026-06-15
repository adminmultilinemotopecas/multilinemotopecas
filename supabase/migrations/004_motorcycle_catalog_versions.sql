-- ============================================================
-- CATÁLOGO NORMALIZADO + VERSÕES + BUSCA DE COMPATIBILIDADE
-- Complementa motorcycle_models (usado pelo app) com:
--   motorcycle_model_catalog  → linha de modelo (marca + nome)
--   motorcycle_versions       → gerações/anos por modelo
-- Execute após 001_initial_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- TABELAS
-- ============================================================
CREATE TABLE IF NOT EXISTS motorcycle_model_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorcycle_brand TEXT NOT NULL,
  model TEXT NOT NULL,
  default_displacement TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (motorcycle_brand, model)
);

CREATE TABLE IF NOT EXISTS motorcycle_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES motorcycle_model_catalog(id) ON DELETE CASCADE,
  version_name TEXT,
  displacement TEXT,
  year_start INTEGER,
  year_end INTEGER,
  slug TEXT NOT NULL UNIQUE,
  motorcycle_model_id UUID REFERENCES motorcycle_models(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motorcycle_catalog_brand ON motorcycle_model_catalog(motorcycle_brand);
CREATE INDEX IF NOT EXISTS idx_motorcycle_catalog_slug ON motorcycle_model_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_motorcycle_versions_catalog ON motorcycle_versions(catalog_id);
CREATE INDEX IF NOT EXISTS idx_motorcycle_versions_slug ON motorcycle_versions(slug);
CREATE INDEX IF NOT EXISTS idx_motorcycle_versions_model_id ON motorcycle_versions(motorcycle_model_id);
CREATE INDEX IF NOT EXISTS idx_motorcycle_catalog_brand_trgm ON motorcycle_model_catalog USING GIN (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_motorcycle_versions_version_trgm ON motorcycle_versions USING GIN (version_name gin_trgm_ops);

-- RLS
ALTER TABLE motorcycle_model_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE motorcycle_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read motorcycle catalog" ON motorcycle_model_catalog
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read motorcycle versions" ON motorcycle_versions
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access motorcycle catalog" ON motorcycle_model_catalog
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access motorcycle versions" ON motorcycle_versions
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- ============================================================
-- HELPER: slug
-- ============================================================
CREATE OR REPLACE FUNCTION motorcycle_slugify(parts TEXT[])
RETURNS TEXT AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        unaccent(array_to_string(parts, ' ')),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '(^-|-$)', '', 'g'
    )
  );
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================
-- HELPER: registrar catálogo + versão + sincronizar motorcycle_models
-- ============================================================
CREATE OR REPLACE FUNCTION register_motorcycle_version(
  p_brand TEXT,
  p_model TEXT,
  p_version TEXT DEFAULT NULL,
  p_displacement TEXT DEFAULT NULL,
  p_year_start INTEGER DEFAULT NULL,
  p_year_end INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_catalog_id UUID;
  v_version_id UUID;
  v_model_id UUID;
  v_catalog_slug TEXT;
  v_version_slug TEXT;
  v_display_model TEXT;
BEGIN
  v_catalog_slug := motorcycle_slugify(ARRAY[p_brand, p_model]);
  v_version_slug := motorcycle_slugify(
    ARRAY[p_brand, p_model, COALESCE(p_version, ''), COALESCE(p_year_start::TEXT, '')]
  );

  INSERT INTO motorcycle_model_catalog (motorcycle_brand, model, default_displacement, slug)
  VALUES (p_brand, p_model, p_displacement, v_catalog_slug)
  ON CONFLICT (motorcycle_brand, model) DO UPDATE SET
    default_displacement = COALESCE(EXCLUDED.default_displacement, motorcycle_model_catalog.default_displacement),
    updated_at = now()
  RETURNING id INTO v_catalog_id;

  v_display_model := p_model || CASE WHEN p_version IS NOT NULL AND p_version <> '' THEN ' ' || p_version ELSE '' END;

  INSERT INTO motorcycle_models (motorcycle_brand, model, displacement, year_start, year_end, slug)
  VALUES (p_brand, v_display_model, p_displacement, p_year_start, p_year_end, v_version_slug)
  ON CONFLICT (slug) DO UPDATE SET
    displacement = EXCLUDED.displacement,
    year_start = EXCLUDED.year_start,
    year_end = EXCLUDED.year_end,
    updated_at = now()
  RETURNING id INTO v_model_id;

  INSERT INTO motorcycle_versions (catalog_id, version_name, displacement, year_start, year_end, slug, motorcycle_model_id)
  VALUES (v_catalog_id, NULLIF(p_version, ''), p_displacement, p_year_start, p_year_end, v_version_slug, v_model_id)
  ON CONFLICT (slug) DO UPDATE SET
    displacement = EXCLUDED.displacement,
    year_start = EXCLUDED.year_start,
    year_end = EXCLUDED.year_end,
    motorcycle_model_id = EXCLUDED.motorcycle_model_id,
    updated_at = now()
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HONDA
-- ============================================================
SELECT register_motorcycle_version('Honda', 'CG 125', NULL, '125cc', 1976, 2008);
SELECT register_motorcycle_version('Honda', 'CG 150 Titan', NULL, '150cc', 2004, 2015);
SELECT register_motorcycle_version('Honda', 'CG 160 Start', NULL, '160cc', 2016, 2022);
SELECT register_motorcycle_version('Honda', 'CG 160 Fan', NULL, '160cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'CG 160 Titan', NULL, '160cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'CG Cargo', '125', '125cc', 2001, 2008);
SELECT register_motorcycle_version('Honda', 'CG Cargo', '160', '160cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'Today', NULL, '50cc', 1985, 1998);
SELECT register_motorcycle_version('Honda', 'Titan KS', NULL, '125cc', 2000, 2004);
SELECT register_motorcycle_version('Honda', 'Titan ES', '125', '125cc', 2000, 2004);
SELECT register_motorcycle_version('Honda', 'Titan ES', '150', '150cc', 2004, 2008);
SELECT register_motorcycle_version('Honda', 'Titan EX', NULL, '150cc', 2013, 2015);
SELECT register_motorcycle_version('Honda', 'CBX 200 Strada', NULL, '200cc', 1994, 2002);
SELECT register_motorcycle_version('Honda', 'CBX 250 Twister', NULL, '250cc', 2001, 2008);
SELECT register_motorcycle_version('Honda', 'CB 250 Twister', NULL, '250cc', 2001, 2008);
SELECT register_motorcycle_version('Honda', 'CB 300R', NULL, '300cc', 2019, NULL);
SELECT register_motorcycle_version('Honda', 'CB 300F Twister', NULL, '250cc', 2008, 2015);
SELECT register_motorcycle_version('Honda', 'CB 500F', NULL, '500cc', 2013, NULL);
SELECT register_motorcycle_version('Honda', 'CB 650R', NULL, '650cc', 2019, NULL);
SELECT register_motorcycle_version('Honda', 'Hornet 600', NULL, '600cc', 2004, 2014);
SELECT register_motorcycle_version('Honda', 'Hornet 500', NULL, '500cc', 1999, 2003);
SELECT register_motorcycle_version('Honda', 'CBR 450 SR', NULL, '450cc', 1989, 1995);
SELECT register_motorcycle_version('Honda', 'CBR 600F', NULL, '600cc', 1987, 2006);
SELECT register_motorcycle_version('Honda', 'CBR 650R', NULL, '650cc', 2019, NULL);
SELECT register_motorcycle_version('Honda', 'CB 1000R', NULL, '1000cc', 2019, NULL);
SELECT register_motorcycle_version('Honda', 'Biz 100', NULL, '100cc', 1998, 2005);
SELECT register_motorcycle_version('Honda', 'Biz 110i', NULL, '110cc', 2016, 2020);
SELECT register_motorcycle_version('Honda', 'Biz 125', NULL, '125cc', 2005, NULL);
SELECT register_motorcycle_version('Honda', 'Pop 100', NULL, '100cc', 2000, 2010);
SELECT register_motorcycle_version('Honda', 'Pop 110i', NULL, '110cc', 2010, NULL);
SELECT register_motorcycle_version('Honda', 'NXR 125 Bros', NULL, '125cc', 1989, 2008);
SELECT register_motorcycle_version('Honda', 'NXR 150 Bros', NULL, '150cc', 2003, 2014);
SELECT register_motorcycle_version('Honda', 'NXR 160 Bros', NULL, '160cc', 2015, NULL);
SELECT register_motorcycle_version('Honda', 'XRE 190', NULL, '190cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'XRE 300', NULL, '300cc', 2010, NULL);
SELECT register_motorcycle_version('Honda', 'Sahara 300', NULL, '300cc', 2023, NULL);
SELECT register_motorcycle_version('Honda', 'Falcon NX400', NULL, '400cc', 1999, 2014);
SELECT register_motorcycle_version('Honda', 'Tornado XR250', NULL, '250cc', 2001, 2008);
SELECT register_motorcycle_version('Honda', 'CRF 230', NULL, '230cc', 2004, 2015);
SELECT register_motorcycle_version('Honda', 'CRF 250F', NULL, '250cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'CRF 300F', NULL, '300cc', 2021, NULL);
SELECT register_motorcycle_version('Honda', 'PCX 150', NULL, '150cc', 2013, 2020);
SELECT register_motorcycle_version('Honda', 'PCX 160', NULL, '160cc', 2021, NULL);
SELECT register_motorcycle_version('Honda', 'Elite 125', NULL, '125cc', 2018, NULL);
SELECT register_motorcycle_version('Honda', 'ADV 150', NULL, '150cc', 2020, NULL);
SELECT register_motorcycle_version('Honda', 'ADV 160', NULL, '160cc', 2023, NULL);
SELECT register_motorcycle_version('Honda', 'Lead 110', NULL, '110cc', 2010, 2018);
SELECT register_motorcycle_version('Honda', 'SH 150i', NULL, '150cc', 2016, NULL);
SELECT register_motorcycle_version('Honda', 'Forza 350', NULL, '350cc', 2020, NULL);

-- ============================================================
-- YAMAHA
-- ============================================================
SELECT register_motorcycle_version('Yamaha', 'Crypton 105', NULL, '105cc', 1998, 2005);
SELECT register_motorcycle_version('Yamaha', 'Crypton 115', NULL, '115cc', 2005, 2010);
SELECT register_motorcycle_version('Yamaha', 'Neo 115', NULL, '115cc', 2018, NULL);
SELECT register_motorcycle_version('Yamaha', 'YBR 125', 'E', '125cc', 2001, 2007);
SELECT register_motorcycle_version('Yamaha', 'YBR 125', 'ED', '125cc', 2007, 2009);
SELECT register_motorcycle_version('Yamaha', 'YBR 125', 'Factor', '125cc', 2009, NULL);
SELECT register_motorcycle_version('Yamaha', 'Factor 125', NULL, '125cc', 2009, 2016);
SELECT register_motorcycle_version('Yamaha', 'Factor 150', NULL, '150cc', 2016, NULL);
SELECT register_motorcycle_version('Yamaha', 'Factor DX', NULL, '125cc', 2012, 2018);
SELECT register_motorcycle_version('Yamaha', 'Factor ED', NULL, '125cc', 2009, 2016);
SELECT register_motorcycle_version('Yamaha', 'Factor UBS', NULL, '150cc', 2018, NULL);
SELECT register_motorcycle_version('Yamaha', 'Fazer 150', NULL, '150cc', 2008, 2016);
SELECT register_motorcycle_version('Yamaha', 'Fazer 250', NULL, '250cc', 2005, 2017);
SELECT register_motorcycle_version('Yamaha', 'FZ15', NULL, '150cc', 2018, NULL);
SELECT register_motorcycle_version('Yamaha', 'FZ25', NULL, '250cc', 2017, NULL);
SELECT register_motorcycle_version('Yamaha', 'Lander 250', NULL, '250cc', 2007, 2018);
SELECT register_motorcycle_version('Yamaha', 'Lander 250', 'Nova', '250cc', 2019, NULL);
SELECT register_motorcycle_version('Yamaha', 'XTZ 125', NULL, '125cc', 2002, 2014);
SELECT register_motorcycle_version('Yamaha', 'XTZ 150 Crosser', NULL, '150cc', 2014, NULL);
SELECT register_motorcycle_version('Yamaha', 'XTZ 250 Lander', NULL, '250cc', 2019, NULL);
SELECT register_motorcycle_version('Yamaha', 'Tenere 250', NULL, '250cc', 2011, 2019);
SELECT register_motorcycle_version('Yamaha', 'XT 660R', NULL, '660cc', 2004, 2016);
SELECT register_motorcycle_version('Yamaha', 'MT-03', NULL, '300cc', 2016, NULL);
SELECT register_motorcycle_version('Yamaha', 'MT-07', NULL, '700cc', 2014, NULL);
SELECT register_motorcycle_version('Yamaha', 'MT-09', NULL, '900cc', 2014, NULL);
SELECT register_motorcycle_version('Yamaha', 'MT-10', NULL, '1000cc', 2016, NULL);
SELECT register_motorcycle_version('Yamaha', 'R15', NULL, '155cc', 2018, NULL);
SELECT register_motorcycle_version('Yamaha', 'R3', NULL, '300cc', 2015, NULL);
SELECT register_motorcycle_version('Yamaha', 'R7', NULL, '700cc', 2022, NULL);
SELECT register_motorcycle_version('Yamaha', 'R1', NULL, '1000cc', 1998, NULL);
SELECT register_motorcycle_version('Yamaha', 'NMax 160', NULL, '160cc', 2017, NULL);
SELECT register_motorcycle_version('Yamaha', 'XMax 250', NULL, '250cc', 2018, NULL);
SELECT register_motorcycle_version('Yamaha', 'Fluo 125', NULL, '125cc', 2023, NULL);

-- ============================================================
-- SUZUKI
-- ============================================================
SELECT register_motorcycle_version('Suzuki', 'Yes 125', NULL, '125cc', 2003, 2010);
SELECT register_motorcycle_version('Suzuki', 'Intruder 125', NULL, '125cc', 2002, 2008);
SELECT register_motorcycle_version('Suzuki', 'EN125', NULL, '125cc', 2004, 2010);
SELECT register_motorcycle_version('Suzuki', 'GSR 125', NULL, '125cc', 2011, 2016);
SELECT register_motorcycle_version('Suzuki', 'GSR 150i', NULL, '150cc', 2014, 2018);
SELECT register_motorcycle_version('Suzuki', 'DK 150', NULL, '150cc', 2016, NULL);
SELECT register_motorcycle_version('Suzuki', 'DR 160', NULL, '160cc', 2020, NULL);
SELECT register_motorcycle_version('Suzuki', 'Burgman 125', NULL, '125cc', 2005, 2015);
SELECT register_motorcycle_version('Suzuki', 'Burgman 400', NULL, '400cc', 2006, NULL);
SELECT register_motorcycle_version('Suzuki', 'GS500', NULL, '500cc', 1989, 2009);
SELECT register_motorcycle_version('Suzuki', 'Bandit 650', NULL, '650cc', 1999, 2016);
SELECT register_motorcycle_version('Suzuki', 'Bandit 1200', NULL, '1200cc', 1996, 2006);
SELECT register_motorcycle_version('Suzuki', 'GSX650F', NULL, '650cc', 2008, 2016);
SELECT register_motorcycle_version('Suzuki', 'GSX-S750', NULL, '750cc', 2017, NULL);
SELECT register_motorcycle_version('Suzuki', 'GSX-S1000', NULL, '1000cc', 2015, NULL);
SELECT register_motorcycle_version('Suzuki', 'GSX-R750', NULL, '750cc', 2000, 2017);
SELECT register_motorcycle_version('Suzuki', 'GSX-R1000', NULL, '1000cc', 2001, NULL);
SELECT register_motorcycle_version('Suzuki', 'Hayabusa', NULL, '1300cc', 1999, NULL);
SELECT register_motorcycle_version('Suzuki', 'V-Strom 650', NULL, '650cc', 2004, NULL);
SELECT register_motorcycle_version('Suzuki', 'V-Strom 1000', NULL, '1000cc', 2014, NULL);

-- ============================================================
-- KAWASAKI
-- ============================================================
SELECT register_motorcycle_version('Kawasaki', 'Ninja 250R', NULL, '250cc', 2008, 2012);
SELECT register_motorcycle_version('Kawasaki', 'Ninja 300', NULL, '300cc', 2013, 2017);
SELECT register_motorcycle_version('Kawasaki', 'Ninja 400', NULL, '400cc', 2018, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Ninja 500', NULL, '500cc', 2024, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Ninja 650', NULL, '650cc', 2006, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Ninja ZX-6R', NULL, '600cc', 2000, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Ninja ZX-10R', NULL, '1000cc', 2004, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Z250', NULL, '250cc', 2015, 2018);
SELECT register_motorcycle_version('Kawasaki', 'Z300', NULL, '300cc', 2015, 2018);
SELECT register_motorcycle_version('Kawasaki', 'Z400', NULL, '400cc', 2019, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Z500', NULL, '500cc', 2024, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Z650', NULL, '650cc', 2017, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Z900', NULL, '900cc', 2017, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Versys 300', NULL, '300cc', 2017, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Versys 650', NULL, '650cc', 2007, NULL);
SELECT register_motorcycle_version('Kawasaki', 'Versys 1000', NULL, '1000cc', 2012, NULL);
SELECT register_motorcycle_version('Kawasaki', 'ER-6N', NULL, '650cc', 2006, 2016);
SELECT register_motorcycle_version('Kawasaki', 'ER-6F', NULL, '650cc', 2006, 2016);
SELECT register_motorcycle_version('Kawasaki', 'KLX 300', NULL, '300cc', 2021, NULL);
SELECT register_motorcycle_version('Kawasaki', 'KLR 650', NULL, '650cc', 1987, NULL);

-- ============================================================
-- DEMAIS MARCAS (PRINCIPAIS MODELOS NO BRASIL)
-- ============================================================

-- BMW
SELECT register_motorcycle_version('BMW', 'G 310 R', NULL, '310cc', 2017, NULL);
SELECT register_motorcycle_version('BMW', 'G 310 GS', NULL, '310cc', 2017, NULL);
SELECT register_motorcycle_version('BMW', 'F 750 GS', NULL, '750cc', 2018, NULL);
SELECT register_motorcycle_version('BMW', 'F 850 GS', NULL, '850cc', 2018, NULL);
SELECT register_motorcycle_version('BMW', 'F 900 R', NULL, '900cc', 2020, NULL);
SELECT register_motorcycle_version('BMW', 'R 1250 GS', NULL, '1250cc', 2019, NULL);
SELECT register_motorcycle_version('BMW', 'S 1000 RR', NULL, '1000cc', 2009, NULL);

-- Triumph
SELECT register_motorcycle_version('Triumph', 'Bonneville T100', NULL, '900cc', 2001, NULL);
SELECT register_motorcycle_version('Triumph', 'Bonneville T120', NULL, '1200cc', 2016, NULL);
SELECT register_motorcycle_version('Triumph', 'Street Triple 765', NULL, '765cc', 2017, NULL);
SELECT register_motorcycle_version('Triumph', 'Tiger 900', NULL, '900cc', 2020, NULL);
SELECT register_motorcycle_version('Triumph', 'Tiger 1200', NULL, '1200cc', 2012, NULL);
SELECT register_motorcycle_version('Triumph', 'Speed Triple 1200', NULL, '1200cc', 2021, NULL);

-- Royal Enfield
SELECT register_motorcycle_version('Royal Enfield', 'Classic 350', NULL, '350cc', 2015, NULL);
SELECT register_motorcycle_version('Royal Enfield', 'Classic 500', NULL, '500cc', 2015, 2020);
SELECT register_motorcycle_version('Royal Enfield', 'Himalayan', NULL, '411cc', 2017, NULL);
SELECT register_motorcycle_version('Royal Enfield', 'Interceptor 650', NULL, '650cc', 2018, NULL);
SELECT register_motorcycle_version('Royal Enfield', 'Meteor 350', NULL, '350cc', 2020, NULL);
SELECT register_motorcycle_version('Royal Enfield', 'Hunter 350', NULL, '350cc', 2022, NULL);

-- Harley-Davidson
SELECT register_motorcycle_version('Harley-Davidson', 'Sportster 883', NULL, '883cc', 1993, 2020);
SELECT register_motorcycle_version('Harley-Davidson', 'Iron 883', NULL, '883cc', 2010, 2020);
SELECT register_motorcycle_version('Harley-Davidson', 'Forty-Eight', NULL, '1200cc', 2010, NULL);
SELECT register_motorcycle_version('Harley-Davidson', 'Fat Boy', NULL, '1600cc', 1990, NULL);
SELECT register_motorcycle_version('Harley-Davidson', 'Street Glide', NULL, '1600cc', 2006, NULL);
SELECT register_motorcycle_version('Harley-Davidson', 'Pan America 1250', NULL, '1250cc', 2021, NULL);

-- Dafra
SELECT register_motorcycle_version('Dafra', 'Apache RTR 150', NULL, '150cc', 2010, 2015);
SELECT register_motorcycle_version('Dafra', 'Apache RTR 160', NULL, '160cc', 2016, NULL);
SELECT register_motorcycle_version('Dafra', 'Apache RTR 200', NULL, '200cc', 2016, NULL);
SELECT register_motorcycle_version('Dafra', 'Next 250', NULL, '250cc', 2012, 2018);
SELECT register_motorcycle_version('Dafra', 'Citycom 300i', NULL, '300cc', 2011, NULL);
SELECT register_motorcycle_version('Dafra', 'NH 190', NULL, '190cc', 2020, NULL);
SELECT register_motorcycle_version('Dafra', 'Super Max 125', NULL, '125cc', 2018, NULL);

-- Shineray
SELECT register_motorcycle_version('Shineray', 'XY 150-5', NULL, '150cc', 2010, 2018);
SELECT register_motorcycle_version('Shineray', 'XY 200', NULL, '200cc', 2012, 2018);
SELECT register_motorcycle_version('Shineray', 'Jet 50', NULL, '50cc', 2008, 2015);

-- Bajaj
SELECT register_motorcycle_version('Bajaj', 'Pulsar 150', NULL, '150cc', 2005, 2012);
SELECT register_motorcycle_version('Bajaj', 'Pulsar 180', NULL, '180cc', 2005, 2012);
SELECT register_motorcycle_version('Bajaj', 'Pulsar 200NS', NULL, '200cc', 2012, 2018);
SELECT register_motorcycle_version('Bajaj', 'Pulsar 220', NULL, '220cc', 2007, 2015);
SELECT register_motorcycle_version('Bajaj', 'Dominar 400', NULL, '400cc', 2017, NULL);

-- Kasinski
SELECT register_motorcycle_version('Kasinski', 'Comet 150', NULL, '150cc', 2005, 2012);
SELECT register_motorcycle_version('Kasinski', 'Comet 250R', NULL, '250cc', 2005, 2012);
SELECT register_motorcycle_version('Kasinski', 'Mirage 150', NULL, '150cc', 2005, 2012);
SELECT register_motorcycle_version('Kasinski', 'CRZ 150', NULL, '150cc', 2010, 2015);
SELECT register_motorcycle_version('Kasinski', 'Win 110', NULL, '110cc', 2005, 2012);

-- Sundown
SELECT register_motorcycle_version('Sundown', 'Future 125', NULL, '125cc', 2003, 2010);
SELECT register_motorcycle_version('Sundown', 'Max 125', NULL, '125cc', 2005, 2010);
SELECT register_motorcycle_version('Sundown', 'Hunter 90', NULL, '90cc', 2003, 2010);
SELECT register_motorcycle_version('Sundown', 'Stx 200', NULL, '200cc', 2005, 2010);
SELECT register_motorcycle_version('Sundown', 'Vblade 250', NULL, '250cc', 2005, 2010);

-- Traxx
SELECT register_motorcycle_version('Traxx', 'Fly 125', NULL, '125cc', 2008, 2015);
SELECT register_motorcycle_version('Traxx', 'Sky 125', NULL, '125cc', 2010, 2016);
SELECT register_motorcycle_version('Traxx', 'JH 125', NULL, '125cc', 2012, 2018);

-- Agrale
SELECT register_motorcycle_version('Agrale', 'Traxx 150', NULL, '150cc', 2008, 2015);
SELECT register_motorcycle_version('Agrale', 'Traxx 200', NULL, '200cc', 2010, 2015);
SELECT register_motorcycle_version('Agrale', 'Traxx 35', NULL, '350cc', 2008, 2014);
SELECT register_motorcycle_version('Agrale', 'Traxx 50', NULL, '500cc', 2008, 2014);

-- KTM
SELECT register_motorcycle_version('KTM', 'Duke 200', NULL, '200cc', 2012, NULL);
SELECT register_motorcycle_version('KTM', 'Duke 390', NULL, '390cc', 2013, NULL);
SELECT register_motorcycle_version('KTM', 'Duke 890', NULL, '890cc', 2020, NULL);
SELECT register_motorcycle_version('KTM', 'RC 390', NULL, '390cc', 2014, NULL);
SELECT register_motorcycle_version('KTM', 'Adventure 390', NULL, '390cc', 2017, NULL);
SELECT register_motorcycle_version('KTM', 'Adventure 890', NULL, '890cc', 2021, NULL);
SELECT register_motorcycle_version('KTM', 'Adventure 1290', NULL, '1290cc', 2013, NULL);

-- Ducati
SELECT register_motorcycle_version('Ducati', 'Monster 821', NULL, '821cc', 2014, 2020);
SELECT register_motorcycle_version('Ducati', 'Monster 1200', NULL, '1200cc', 2014, 2021);
SELECT register_motorcycle_version('Ducati', 'Scrambler 800', NULL, '800cc', 2015, NULL);
SELECT register_motorcycle_version('Ducati', 'Multistrada 950', NULL, '950cc', 2017, NULL);
SELECT register_motorcycle_version('Ducati', 'Panigale V2', NULL, '955cc', 2020, NULL);
SELECT register_motorcycle_version('Ducati', 'Panigale V4', NULL, '1103cc', 2018, NULL);

-- MV Agusta
SELECT register_motorcycle_version('MV Agusta', 'Brutale 800', NULL, '800cc', 2013, NULL);
SELECT register_motorcycle_version('MV Agusta', 'F3 800', NULL, '800cc', 2013, NULL);
SELECT register_motorcycle_version('MV Agusta', 'Turismo Veloce 800', NULL, '800cc', 2015, NULL);

-- Haojue
SELECT register_motorcycle_version('Haojue', 'DK 150', NULL, '150cc', 2016, NULL);
SELECT register_motorcycle_version('Haojue', 'DK 160', NULL, '160cc', 2019, NULL);
SELECT register_motorcycle_version('Haojue', 'NK 150', NULL, '150cc', 2018, NULL);
SELECT register_motorcycle_version('Haojue', 'DR 160', NULL, '160cc', 2020, NULL);
SELECT register_motorcycle_version('Haojue', 'Chopper Road 150', NULL, '150cc', 2016, NULL);

-- Zontes
SELECT register_motorcycle_version('Zontes', '310R', NULL, '310cc', 2021, NULL);
SELECT register_motorcycle_version('Zontes', '350X', NULL, '350cc', 2022, NULL);
SELECT register_motorcycle_version('Zontes', '350E', NULL, '350cc', 2023, NULL);

-- Kymco
SELECT register_motorcycle_version('Kymco', 'Agility 125', NULL, '125cc', 2010, NULL);
SELECT register_motorcycle_version('Kymco', 'Downtown 300i', NULL, '300cc', 2014, NULL);
SELECT register_motorcycle_version('Kymco', 'People 150', NULL, '150cc', 2012, NULL);
SELECT register_motorcycle_version('Kymco', 'Xciting 400i', NULL, '400cc', 2015, NULL);

-- Benelli
SELECT register_motorcycle_version('Benelli', 'TNT 300', NULL, '300cc', 2015, NULL);
SELECT register_motorcycle_version('Benelli', 'TNT 600', NULL, '600cc', 2015, NULL);
SELECT register_motorcycle_version('Benelli', 'TRK 502', NULL, '500cc', 2017, NULL);
SELECT register_motorcycle_version('Benelli', 'Leoncino 500', NULL, '500cc', 2018, NULL);
SELECT register_motorcycle_version('Benelli', 'Imperiale 400', NULL, '400cc', 2019, NULL);

-- CFMoto
SELECT register_motorcycle_version('CFMoto', '300NK', NULL, '300cc', 2019, NULL);
SELECT register_motorcycle_version('CFMoto', '650NK', NULL, '650cc', 2019, NULL);
SELECT register_motorcycle_version('CFMoto', '650MT', NULL, '650cc', 2020, NULL);
SELECT register_motorcycle_version('CFMoto', '800MT', NULL, '800cc', 2022, NULL);
SELECT register_motorcycle_version('CFMoto', '700CL-X', NULL, '700cc', 2021, NULL);

-- Moto Morini
SELECT register_motorcycle_version('Moto Morini', 'Seiemmezzo 6', NULL, '650cc', 2022, NULL);
SELECT register_motorcycle_version('Moto Morini', 'X-Cape 650', NULL, '650cc', 2022, NULL);
SELECT register_motorcycle_version('Moto Morini', 'Calibro 700', NULL, '700cc', 2024, NULL);

-- ============================================================
-- FUNÇÃO: search_motorcycles
-- Busca por marca, modelo, cilindrada, ano e versão
-- ============================================================
CREATE OR REPLACE FUNCTION search_motorcycles(search_term TEXT)
RETURNS TABLE (
  catalog_id UUID,
  version_id UUID,
  motorcycle_model_id UUID,
  motorcycle_brand TEXT,
  model TEXT,
  version_name TEXT,
  displacement TEXT,
  year_start INTEGER,
  year_end INTEGER,
  year_label TEXT,
  slug TEXT,
  relevance REAL
) AS $$
DECLARE
  clean_query TEXT;
  year_query INTEGER;
BEGIN
  clean_query := trim(lower(unaccent(COALESCE(search_term, ''))));

  IF clean_query = '' THEN
    RETURN;
  END IF;

  -- Detectar busca por ano (ex: "2018", "160", "cg 160")
  year_query := NULL;
  IF clean_query ~ '^\d{4}$' THEN
    year_query := clean_query::INTEGER;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS catalog_id,
    v.id AS version_id,
    v.motorcycle_model_id,
    c.motorcycle_brand,
    c.model,
    v.version_name,
    COALESCE(v.displacement, c.default_displacement) AS displacement,
    v.year_start,
    v.year_end,
    CASE
      WHEN v.year_start IS NOT NULL AND v.year_end IS NOT NULL THEN v.year_start::TEXT || '-' || v.year_end::TEXT
      WHEN v.year_start IS NOT NULL AND v.year_end IS NULL THEN v.year_start::TEXT || '-atual'
      ELSE NULL
    END AS year_label,
    v.slug,
    GREATEST(
      similarity(unaccent(lower(c.motorcycle_brand)), clean_query),
      similarity(unaccent(lower(c.model)), clean_query),
      similarity(unaccent(lower(COALESCE(v.version_name, ''))), clean_query),
      similarity(unaccent(lower(COALESCE(v.displacement, ''))), clean_query),
      similarity(unaccent(lower(c.motorcycle_brand || ' ' || c.model)), clean_query),
      similarity(unaccent(lower(c.motorcycle_brand || ' ' || c.model || ' ' || COALESCE(v.version_name, ''))), clean_query)
    )::REAL AS relevance
  FROM motorcycle_model_catalog c
  JOIN motorcycle_versions v ON v.catalog_id = c.id
  WHERE c.is_active = true
    AND v.is_active = true
    AND (
      unaccent(lower(c.motorcycle_brand)) % clean_query
      OR unaccent(lower(c.model)) % clean_query
      OR unaccent(lower(COALESCE(v.version_name, ''))) % clean_query
      OR unaccent(lower(COALESCE(v.displacement, ''))) % clean_query
      OR unaccent(lower(c.motorcycle_brand || ' ' || c.model)) % clean_query
      OR unaccent(lower(c.motorcycle_brand || ' ' || c.model || ' ' || COALESCE(v.version_name, ''))) LIKE '%' || clean_query || '%'
      OR unaccent(lower(COALESCE(v.displacement, ''))) LIKE '%' || clean_query || '%'
      OR (year_query IS NOT NULL AND v.year_start <= year_query AND COALESCE(v.year_end, 9999) >= year_query)
      OR (clean_query ~ '^\d{2,4}$' AND unaccent(lower(COALESCE(v.displacement, ''))) LIKE '%' || clean_query || '%')
    )
  ORDER BY relevance DESC, c.motorcycle_brand, c.model, v.year_start DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VIEW: compatibilidade unificada (app + admin)
-- ============================================================
CREATE OR REPLACE VIEW motorcycle_catalog_full AS
SELECT
  v.id AS version_id,
  v.motorcycle_model_id,
  c.motorcycle_brand,
  c.model,
  v.version_name,
  COALESCE(v.displacement, c.default_displacement) AS displacement,
  v.year_start,
  v.year_end,
  v.slug,
  c.motorcycle_brand || ' ' || c.model ||
    CASE WHEN v.version_name IS NOT NULL THEN ' ' || v.version_name ELSE '' END ||
    CASE WHEN v.year_start IS NOT NULL THEN ' (' || v.year_start::TEXT ||
      CASE WHEN v.year_end IS NULL THEN '+' ELSE '-' || v.year_end::TEXT END || ')' ELSE '' END
  AS full_name
FROM motorcycle_versions v
JOIN motorcycle_model_catalog c ON c.id = v.catalog_id
WHERE c.is_active = true AND v.is_active = true;

-- Estatísticas finais
DO $$
DECLARE
  v_catalog INTEGER;
  v_versions INTEGER;
  v_models INTEGER;
  v_brands INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_catalog FROM motorcycle_model_catalog;
  SELECT COUNT(*) INTO v_versions FROM motorcycle_versions;
  SELECT COUNT(*) INTO v_models FROM motorcycle_models;
  SELECT COUNT(DISTINCT motorcycle_brand) INTO v_brands FROM motorcycle_model_catalog;

  RAISE NOTICE 'Catálogo base: % modelos | Versões: % | motorcycle_models (app): % | Marcas: %',
    v_catalog, v_versions, v_models, v_brands;
END $$;
