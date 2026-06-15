-- ============================================================
-- CATÁLOGO COMPLETO DE CATEGORIAS — MOTOPEÇAS E ACESSÓRIOS
-- Categorias principais (parent_id NULL) + subcategorias
-- Idempotente: pode rodar mais de uma vez (ON CONFLICT slug)
-- Execute após 001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- CATEGORIAS PRINCIPAIS
-- ------------------------------------------------------------
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Motor', 'motor', 'Peças internas e externas do motor', 10),
  ('Transmissão', 'transmissao', 'Corrente, pinhão, coroa, câmbio e relação', 20),
  ('Embreagem', 'embreagem', 'Discos, platos, molas e cabos de embreagem', 30),
  ('Freios', 'freios', 'Pastilhas, discos, fluidos e sistema de frenagem', 40),
  ('Suspensão', 'suspensao', 'Amortecedores, molas, retentores e kits de reparo', 50),
  ('Direção e Chassi', 'direcao-chassi', 'Guidão, mesa, braço oscilante, pivô e chassi', 60),
  ('Elétrica e Ignição', 'eletrica', 'Velas, bobina, CDI, bateria, fiação e sensores', 70),
  ('Iluminação', 'iluminacao', 'Faróis, lanternas, lâmpadas e sinalização', 80),
  ('Filtros', 'filtros', 'Filtros de ar, óleo e combustível', 90),
  ('Lubrificantes e Fluidos', 'lubrificantes-fluidos', 'Óleos, graxas, fluidos e aditivos', 100),
  ('Combustível e Alimentação', 'combustivel-alimentacao', 'Carburador, injeção, bomba e tanque', 110),
  ('Escapamento', 'escapamento', 'Coletor, silencioso, abafador e juntas', 120),
  ('Pneus, Rodas e Cubos', 'pneus-rodas-cubos', 'Pneus, câmaras, rodas, raios e cubos', 130),
  ('Carenagem e Plásticos', 'carenagem-plasticos', 'Paralamas, carenagens, rabeta e proteções', 140),
  ('Assento e Conforto', 'assento-conforto', 'Bancos, capas, apoios de pé e ergonomia', 150),
  ('Acessórios', 'acessorios', 'Retrovisores, bagageiros, suportes e utilitários', 160),
  ('Segurança e Proteção', 'seguranca-protecao', 'Capacetes, travas, alarmes e equipamentos', 170),
  ('Performance e Tuning', 'performance-tuning', 'Peças esportivas e upgrades de performance', 180),
  ('Manutenção e Ferramentas', 'manutencao-ferramentas', 'Ferramentas, cavaletes e produtos de limpeza', 190)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ------------------------------------------------------------
-- SUBCATEGORIAS
-- ------------------------------------------------------------
DO $$
DECLARE
  cat_motor UUID;
  cat_transmissao UUID;
  cat_embreagem UUID;
  cat_freios UUID;
  cat_suspensao UUID;
  cat_direcao UUID;
  cat_eletrica UUID;
  cat_iluminacao UUID;
  cat_filtros UUID;
  cat_lubrificantes UUID;
  cat_combustivel UUID;
  cat_escapamento UUID;
  cat_pneus UUID;
  cat_carenagem UUID;
  cat_assento UUID;
  cat_acessorios UUID;
  cat_seguranca UUID;
  cat_performance UUID;
  cat_manutencao UUID;
BEGIN
  SELECT id INTO cat_motor FROM categories WHERE slug = 'motor';
  SELECT id INTO cat_transmissao FROM categories WHERE slug = 'transmissao';
  SELECT id INTO cat_embreagem FROM categories WHERE slug = 'embreagem';
  SELECT id INTO cat_freios FROM categories WHERE slug = 'freios';
  SELECT id INTO cat_suspensao FROM categories WHERE slug = 'suspensao';
  SELECT id INTO cat_direcao FROM categories WHERE slug = 'direcao-chassi';
  SELECT id INTO cat_eletrica FROM categories WHERE slug = 'eletrica';
  SELECT id INTO cat_iluminacao FROM categories WHERE slug = 'iluminacao';
  SELECT id INTO cat_filtros FROM categories WHERE slug = 'filtros';
  SELECT id INTO cat_lubrificantes FROM categories WHERE slug = 'lubrificantes-fluidos';
  SELECT id INTO cat_combustivel FROM categories WHERE slug = 'combustivel-alimentacao';
  SELECT id INTO cat_escapamento FROM categories WHERE slug = 'escapamento';
  SELECT id INTO cat_pneus FROM categories WHERE slug = 'pneus-rodas-cubos';
  SELECT id INTO cat_carenagem FROM categories WHERE slug = 'carenagem-plasticos';
  SELECT id INTO cat_assento FROM categories WHERE slug = 'assento-conforto';
  SELECT id INTO cat_acessorios FROM categories WHERE slug = 'acessorios';
  SELECT id INTO cat_seguranca FROM categories WHERE slug = 'seguranca-protecao';
  SELECT id INTO cat_performance FROM categories WHERE slug = 'performance-tuning';
  SELECT id INTO cat_manutencao FROM categories WHERE slug = 'manutencao-ferramentas';

  -- MOTOR
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Pistão, Anel e Cilindro', 'motor-pistao-anel-cilindro', 'Kits de cilindro, pistões e anéis', cat_motor, 1),
    ('Válvulas e Comando', 'motor-valvulas-comando', 'Válvulas, retentores, comando de válvulas e tuchos', cat_motor, 2),
    ('Juntas do Motor', 'motor-juntas', 'Juntas de cabeçote, carter e completo', cat_motor, 3),
    ('Bomba de Óleo', 'motor-bomba-oleo', 'Bombas de óleo e peças relacionadas', cat_motor, 4),
    ('Carcaça e Tampa do Motor', 'motor-carcaca-tampa', 'Carcaças, tampas e parafusos do motor', cat_motor, 5),
    ('Virabrequim e Biela', 'motor-virabrequim-biela', 'Virabrequim, bielas e bronzinas', cat_motor, 6),
    ('Corrente de Comando', 'motor-corrente-comando', 'Correntes, tensor e guias de comando', cat_motor, 7),
    ('Motor de Partida', 'motor-partida', 'Motores de partida e peças de arranque', cat_motor, 8),
    ('Radiador e Arrefecimento', 'motor-arrefecimento', 'Radiador, mangueiras e termostato', cat_motor, 9),
    ('Kit Motor Completo', 'motor-kit-completo', 'Kits de revisão e retífica do motor', cat_motor, 10)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- TRANSMISSÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Corrente', 'transmissao-corrente', 'Correntes de transmissão', cat_transmissao, 1),
    ('Pinhão', 'transmissao-pinha', 'Pinhões de transmissão', cat_transmissao, 2),
    ('Coroa', 'transmissao-coroa', 'Coroas de transmissão', cat_transmissao, 3),
    ('Kit Relação', 'transmissao-kit-relacao', 'Kits coroa, pinhão e corrente', cat_transmissao, 4),
    ('Câmbio', 'transmissao-cambio', 'Engrenagens e peças do câmbio', cat_transmissao, 5),
    ('Pedal de Câmbio', 'transmissao-pedal-cambio', 'Pedais e hastes de câmbio', cat_transmissao, 6),
    ('Corrente de Transmissão Primária', 'transmissao-corrente-primaria', 'Correntes primárias e secundárias', cat_transmissao, 7)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- EMBREAGEM
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Disco de Embreagem', 'embreagem-disco', 'Discos de embreagem e separadores', cat_embreagem, 1),
    ('Platô e Molas', 'embreagem-plato-molas', 'Platos, molas e centragem', cat_embreagem, 2),
    ('Kit Embreagem Completo', 'embreagem-kit-completo', 'Kits completos de embreagem', cat_embreagem, 3),
    ('Cabo de Embreagem', 'embreagem-cabo', 'Cabos e conectores de embreagem', cat_embreagem, 4),
    ('Manete de Embreagem', 'embreagem-manete', 'Manetes e manetes ajustáveis', cat_embreagem, 5)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- FREIOS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Pastilhas de Freio', 'freios-pastilhas', 'Pastilhas dianteiras e traseiras', cat_freios, 1),
    ('Lonas de Freio', 'freios-lonas', 'Lonas para freio a tambor', cat_freios, 2),
    ('Disco de Freio', 'freios-disco', 'Discos de freio ventilados e sólidos', cat_freios, 3),
    ('Cilindro Mestre e Pinça', 'freios-cilindro-pinca', 'Cilindros mestres, pinças e reparos', cat_freios, 4),
    ('Fluido de Freio', 'freios-fluido', 'Fluidos DOT 3, DOT 4 e DOT 5.1', cat_freios, 5),
    ('Cabo de Freio', 'freios-cabo', 'Cabos de freio dianteiro e traseiro', cat_freios, 6),
    ('Manete de Freio', 'freios-manete', 'Manetes de freio e reguladores', cat_freios, 7),
    ('Tambor e Sapata', 'freios-tambor-sapata', 'Tambores, sapatas e kits de reparo', cat_freios, 8),
    ('ABS e Sensores', 'freios-abs-sensores', 'Sensores ABS e componentes eletrônicos', cat_freios, 9)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- SUSPENSÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Amortecedor Dianteiro', 'suspensao-amortecedor-dianteiro', 'Amortecedores dianteiros e peças', cat_suspensao, 1),
    ('Amortecedor Traseiro', 'suspensao-amortecedor-traseiro', 'Amortecedores traseiros e monochoque', cat_suspensao, 2),
    ('Molas', 'suspensao-molas', 'Molas dianteiras e traseiras', cat_suspensao, 3),
    ('Retentores e Buchas', 'suspensao-retentores-buchas', 'Retentores, buchas e batentes', cat_suspensao, 4),
    ('Kit Reparo Suspensão', 'suspensao-kit-reparo', 'Kits de reparo de amortecedor', cat_suspensao, 5),
    ('Óleo de Suspensão', 'suspensao-oleo', 'Óleos específicos para suspensão', cat_suspensao, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- DIREÇÃO E CHASSI
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Guidão e Punho', 'direcao-guidao-punho', 'Guidões, punhos e pesos', cat_direcao, 1),
    ('Mesa de Direção', 'direcao-mesa', 'Mesas superior e inferior', cat_direcao, 2),
    ('Rolamento de Direção', 'direcao-rolamento', 'Rolamentos e cones de direção', cat_direcao, 3),
    ('Braço Oscilante', 'direcao-braco-oscilante', 'Balanças e braços oscilantes', cat_direcao, 4),
    ('Pivô e Buchas', 'direcao-pivo-buchas', 'Pivôs, buchas e parafusos', cat_direcao, 5),
    ('Parafusos e Porcas do Chassi', 'direcao-parafusos-chassi', 'Fixadores e parafusos estruturais', cat_direcao, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ELÉTRICA E IGNIÇÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Velas de Ignição', 'eletrica-velas', 'Velas de ignição NGK, Denso e similares', cat_eletrica, 1),
    ('Bobina e CDI', 'eletrica-bobina-cdi', 'Bobinas, CDI, módulos e ignição eletrônica', cat_eletrica, 2),
    ('Bateria', 'eletrica-bateria', 'Baterias seladas, gel e convencionais', cat_eletrica, 3),
    ('Alternador e Estator', 'eletrica-alternador-estator', 'Estator, rotor e reguladores', cat_eletrica, 4),
    ('Fiação e Chicote', 'eletrica-fiacao-chicote', 'Chicotes, fios e conectores', cat_eletrica, 5),
    ('Relé e Fusíveis', 'eletrica-rele-fusiveis', 'Relés, fusíveis e caixas', cat_eletrica, 6),
    ('Painel e Instrumentos', 'eletrica-painel', 'Painéis, velocímetros e tacômetros', cat_eletrica, 7),
    ('Sensores e Interruptores', 'eletrica-sensores', 'Sensores, chaves e botoeiras', cat_eletrica, 8),
    ('Buzina e Alarme', 'eletrica-buzina-alarme', 'Buzinas e sistemas de alarme', cat_eletrica, 9)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ILUMINAÇÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Lâmpadas', 'iluminacao-lampadas', 'Lâmpadas halógenas, LED e incandescentes', cat_iluminacao, 1),
    ('Farol', 'iluminacao-farol', 'Faróis dianteiros e lentes', cat_iluminacao, 2),
    ('Lanterna Traseira', 'iluminacao-lanterna', 'Lanternas e lentes traseiras', cat_iluminacao, 3),
    ('Pisca e Seta', 'iluminacao-pisca', 'Piscas, lentes e relés', cat_iluminacao, 4),
    ('Refletores', 'iluminacao-refletores', 'Refletores e catadióptricos', cat_iluminacao, 5),
    ('Kit LED e Xenon', 'iluminacao-kit-led', 'Kits de conversão LED e xenon', cat_iluminacao, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- FILTROS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Filtro de Ar', 'filtros-ar', 'Filtros de ar esportivos e originais', cat_filtros, 1),
    ('Filtro de Óleo', 'filtros-oleo', 'Filtros de óleo do motor', cat_filtros, 2),
    ('Filtro de Combustível', 'filtros-combustivel', 'Filtros de linha e tanque', cat_filtros, 3),
    ('Filtro de Ar Esportivo', 'filtros-ar-esportivo', 'Filtros de alto fluxo e K&N', cat_filtros, 4)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- LUBRIFICANTES E FLUIDOS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Óleo de Motor 4 Tempos', 'lubrificantes-oleo-4t', 'Óleos minerais, semissintéticos e sintéticos', cat_lubrificantes, 1),
    ('Óleo 2 Tempos', 'lubrificantes-oleo-2t', 'Óleos para motores 2 tempos', cat_lubrificantes, 2),
    ('Óleo de Corrente', 'lubrificantes-oleo-corrente', 'Lubrificantes para corrente de transmissão', cat_lubrificantes, 3),
    ('Graxa', 'lubrificantes-graxa', 'Graxas para rolamentos e cubos', cat_lubrificantes, 4),
    ('Fluido de Freio', 'lubrificantes-fluido-freio', 'Fluidos de freio DOT', cat_lubrificantes, 5),
    ('Aditivos', 'lubrificantes-aditivos', 'Aditivos para combustível e óleo', cat_lubrificantes, 6),
    ('Spray e Limpeza Técnica', 'lubrificantes-spray-limpeza', 'WD-40, desengripante e limpa contato', cat_lubrificantes, 7)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- COMBUSTÍVEL E ALIMENTAÇÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Carburador e Peças', 'combustivel-carburador', 'Carburadores, agulhas e reparos', cat_combustivel, 1),
    ('Bico Injetor', 'combustivel-bico-injetor', 'Bicos injetores e limpeza', cat_combustivel, 2),
    ('Bomba de Combustível', 'combustivel-bomba', 'Bombas de combustível elétricas e mecânicas', cat_combustivel, 3),
    ('Tanque e Tampa', 'combustivel-tanque', 'Tanques, tampas e boia', cat_combustivel, 4),
    ('Mangueira de Combustível', 'combustivel-mangueira', 'Mangueiras e conexões de combustível', cat_combustivel, 5),
    ('Corpo de Borboleta', 'combustivel-corpo-borboleta', 'TBI e corpo de borboleta', cat_combustivel, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ESCAPAMENTO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Coletor de Escape', 'escapamento-coletor', 'Coletores de admissão e escape', cat_escapamento, 1),
    ('Silencioso', 'escapamento-silencioso', 'Silenciosos e abafadores', cat_escapamento, 2),
    ('Ponteira Esportiva', 'escapamento-ponteira', 'Pontas e ponteiras esportivas', cat_escapamento, 3),
    ('Junta de Escape', 'escapamento-junta', 'Juntas e abraçadeiras de escape', cat_escapamento, 4),
    ('Catalisador', 'escapamento-catalisador', 'Catalisadores e sondas lambda', cat_escapamento, 5),
    ('Escape Completo', 'escapamento-completo', 'Escapamentos completos e esportivos', cat_escapamento, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- PNEUS, RODAS E CUBOS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Pneu', 'pneus-pneu', 'Pneus para motos street, trail e esportivas', cat_pneus, 1),
    ('Câmara de Ar', 'pneus-camara', 'Câmaras de ar e válvulas', cat_pneus, 2),
    ('Roda e Raio', 'pneus-roda-raio', 'Rodas, raios e nipples', cat_pneus, 3),
    ('Cubo e Rolamento', 'pneus-cubo-rolamento', 'Cubos, rolamentos e retentores', cat_pneus, 4),
    ('Calota e Parafuso', 'pneus-calota-parafuso', 'Calotas, porcas e parafusos de roda', cat_pneus, 5),
    ('Balanceamento e Válvula', 'pneus-valvula', 'Válvulas, pesos e acessórios de montagem', cat_pneus, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- CARENAGEM E PLÁSTICOS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Paralama', 'carenagem-paralama', 'Paralamas dianteiro e traseiro', cat_carenagem, 1),
    ('Carenagem Lateral', 'carenagem-lateral', 'Carenagens laterais e frontais', cat_carenagem, 2),
    ('Rabeta', 'carenagem-rabeta', 'Rabetas e suportes plásticos', cat_carenagem, 3),
    ('Protetor de Motor', 'carenagem-protetor-motor', 'Protetores de carter e motor', cat_carenagem, 4),
    ('Adesivos e Emblemas', 'carenagem-adesivos', 'Adesivos, decalques e emblemas', cat_carenagem, 5),
    ('Para-brisa', 'carenagem-parabrisa', 'Para-brisas e defletores', cat_carenagem, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ASSENTO E CONFORTO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Banco', 'assento-banco', 'Bancos e assentos', cat_assento, 1),
    ('Capa de Banco', 'assento-capa-banco', 'Capas impermeáveis e estofadas', cat_assento, 2),
    ('Apoio de Pé', 'assento-apoio-pe', 'Pedaleiras e apoios de pé', cat_assento, 3),
    ('Almofada e Espuma', 'assento-almofada', 'Espumas e almofadas de conforto', cat_assento, 4)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ACESSÓRIOS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Retrovisor', 'acessorios-retrovisor', 'Retrovisores e lentes', cat_acessorios, 1),
    ('Suporte de Celular', 'acessorios-suporte-celular', 'Suportes para celular e GPS', cat_acessorios, 2),
    ('Alforje e Baú', 'acessorios-alforje-bau', 'Alforjes, baús e bagageiros', cat_acessorios, 3),
    ('Capa de Chuva', 'acessorios-capa-chuva', 'Capas de chuva e impermeáveis', cat_acessorios, 4),
    ('Bagageiro e Suporte', 'acessorios-bagageiro', 'Bagageiros e suportes traseiros', cat_acessorios, 5),
    ('Protetor de Tanque', 'acessorios-protetor-tanque', 'Protetores de tanque e adesivos', cat_acessorios, 6),
    ('Slider e Protetor de Queda', 'acessorios-slider', 'Sliders e protetores de queda', cat_acessorios, 7),
    ('Intercomunicador', 'acessorios-intercom', 'Intercomunicadores e fones', cat_acessorios, 8),
    ('Suporte de Placa', 'acessorios-suporte-placa', 'Suportes e molduras de placa', cat_acessorios, 9)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- SEGURANÇA E PROTEÇÃO
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Capacete', 'seguranca-capacete', 'Capacetes fechados, abertos e modulares', cat_seguranca, 1),
    ('Luva', 'seguranca-luva', 'Luvas de motociclista', cat_seguranca, 2),
    ('Jaqueta e Roupa', 'seguranca-jaqueta', 'Jaquetas, calças e roupas de proteção', cat_seguranca, 3),
    ('Joelheira e Protetor', 'seguranca-joelheira', 'Joelheiras, cotoveleiras e coletes', cat_seguranca, 4),
    ('Trava e Cadeado', 'seguranca-trava', 'Travas de disco e cadeados', cat_seguranca, 5),
    ('Alarme', 'seguranca-alarme', 'Alarmes e rastreadores', cat_seguranca, 6),
    ('Refletivo', 'seguranca-refletivo', 'Faixas e coletes refletivos', cat_seguranca, 7)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- PERFORMANCE E TUNING
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Escape Esportivo', 'performance-escape', 'Escapamentos esportivos e racing', cat_performance, 1),
    ('Filtro de Ar Esportivo', 'performance-filtro-ar', 'Filtros de alto fluxo', cat_performance, 2),
    ('Coroa e Pinhão Racing', 'performance-coroa-pinha', 'Relações reforçadas para performance', cat_performance, 3),
    ('Velas Iridium', 'performance-velas-iridium', 'Velas de irídio e performance', cat_performance, 4),
    ('Mangueira Racing', 'performance-mangueira', 'Mangueiras de combustível e vácuo racing', cat_performance, 5),
    ('Ponteira e Coletor Racing', 'performance-ponteira-coletor', 'Coletores e ponteiras de competição', cat_performance, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- MANUTENÇÃO E FERRAMENTAS
  INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Kit de Ferramentas', 'manutencao-kit-ferramentas', 'Kits de ferramentas para moto', cat_manutencao, 1),
    ('Chave e Torquímetro', 'manutencao-chave-torquimetro', 'Chaves, torquímetros e alicates', cat_manutencao, 2),
    ('Cavalete', 'manutencao-cavalete', 'Cavaletes central e lateral', cat_manutencao, 3),
    ('Produtos de Limpeza', 'manutencao-limpeza', 'Shampoo, desengraxante e polidor', cat_manutencao, 4),
    ('Panos e Flanelas', 'manutencao-panos', 'Panos de microfibra e limpeza', cat_manutencao, 5),
    ('Medidor e Manômetro', 'manutencao-manometro', 'Manômetros de pneu e medidores', cat_manutencao, 6)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

END $$;

-- ------------------------------------------------------------
-- VERIFICAÇÃO (opcional — comente se não quiser no deploy)
-- ------------------------------------------------------------
-- SELECT
--   p.name AS categoria_principal,
--   COUNT(c.id) AS subcategorias
-- FROM categories p
-- LEFT JOIN categories c ON c.parent_id = p.id
-- WHERE p.parent_id IS NULL
-- GROUP BY p.id, p.name, p.sort_order
-- ORDER BY p.sort_order;
