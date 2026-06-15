-- ============================================================
-- MARCAS DE PRODUTOS — MOTOPEÇAS E ACESSÓRIOS
-- Principais marcas do mercado brasileiro (reposição e acessórios)
-- Idempotente: ON CONFLICT (slug) atualiza nome e descrição
-- Execute após 001_initial_schema.sql
-- ============================================================

INSERT INTO brands (name, slug, description, sort_order) VALUES

  -- Elétrica, ignição e iluminação
  ('NGK', 'ngk', 'Velas de ignição e componentes elétricos', 10),
  ('Denso', 'denso', 'Velas, injeção e ar-condicionado automotivo', 11),
  ('Bosch', 'bosch', 'Sistemas de injeção, ignição, freios e elétrica', 12),
  ('Magnetron', 'magnetron', 'Iluminação, elétrica e ignição para motos', 13),
  ('Gauss', 'gauss', 'Bobinas, CDI, sensores e componentes elétricos', 14),
  ('Marelli', 'marelli', 'Injeção eletrônica, ignição e elétrica', 15),
  ('Valeo', 'valeo', 'Sistemas elétricos e motores de partida', 16),
  ('Mitsuba', 'mitsuba', 'Motores de partida e alternadores', 17),
  ('Hella', 'hella', 'Iluminação e sinalização automotiva', 18),
  ('Philips', 'philips', 'Lâmpadas halógenas e LED', 19),
  ('Osram', 'osram', 'Lâmpadas e iluminação automotiva', 20),
  ('Riffel', 'riffel', 'Iluminação, elétrica e acessórios para motos', 21),
  ('STLO', 'stlo', 'Faróis, lanternas e iluminação', 22),
  ('Acerbis', 'acerbis', 'Iluminação LED e plásticos off-road', 23),

  -- Freios e embreagem
  ('COBREQ', 'cobreq', 'Pastilhas, lonas e discos de freio', 30),
  ('Fras-le', 'fras-le', 'Pastilhas e lonas de freio', 31),
  ('Fischer', 'fischer', 'Pastilhas, discos e kit de embreagem', 32),
  ('TRW', 'trw', 'Freios, direção e suspensão', 33),
  ('Nakata', 'nakata', 'Freios, suspensão e direção', 34),
  ('Ferodo', 'ferodo', 'Pastilhas e materiais de fricção', 35),
  ('Jurid', 'jurid', 'Pastilhas e lonas de freio', 36),
  ('Diant', 'diant', 'Pastilhas e discos de freio', 37),
  ('IMA', 'ima', 'Pastilhas e componentes de freio', 38),
  ('Sinter', 'sinter', 'Pastilhas e lonas de freio', 39),
  ('São José', 'sao-jose', 'Discos de embreagem e kits', 40),
  ('Luiz Kard', 'luiz-kard', 'Kits de embreagem e discos', 41),

  -- Motor, transmissão e retentores
  ('Riosulense', 'riosulense', 'Kits cilindro, pistão e juntas', 50),
  ('Cromoduro', 'cromoduro', 'Kits cilindro e pistão', 51),
  ('Sabo', 'sabo', 'Retentores e vedações', 52),
  ('Corteco', 'corteco', 'Retentores, juntas e buchas', 53),
  ('Sabó', 'sabo-automotive', 'Retentores e anéis de vedação', 54),
  ('MTE Thomson', 'mte-thomson', 'Válvulas, buchas e kit motor', 55),
  ('Scherer', 'scherer', 'Válvulas de admissão e escape', 56),
  ('FVP', 'fvp', 'Válvulas e componentes de motor', 57),
  ('IRB', 'irb', 'Bielas, pistões e bronzinas', 58),
  ('WAW', 'waw', 'Pistões, anéis e kits de motor', 59),
  ('RK', 'rk', 'Correntes e kits de transmissão', 60),
  ('DID', 'did', 'Correntes de transmissão premium', 61),
  ('Regina', 'regina', 'Correntes e correias', 62),
  ('Afam', 'afam', 'Correntes, pinhões e coroas', 63),
  ('Sifam', 'sifam', 'Correntes, filtros e lubrificantes', 64),
  ('Gates', 'gates', 'Correias e mangueiras', 65),
  ('Dayco', 'dayco', 'Correias de transmissão', 66),
  ('SKF', 'skf', 'Rolamentos e vedações', 67),
  ('NSK', 'nsk', 'Rolamentos', 68),
  ('FAG', 'fag', 'Rolamentos e cubos', 69),
  ('Koyo', 'koyo', 'Rolamentos e cubos de roda', 70),
  ('Keihin', 'keihin', 'Carburadores e corpo de borboleta', 71),
  ('Mikuni', 'mikuni', 'Carburadores e peças de carburação', 72),
  ('Walbro', 'walbro', 'Bombas de combustível', 73),

  -- Suspensão
  ('Cofap', 'cofap', 'Amortecedores e molas', 80),
  ('KYB', 'kyb', 'Amortecedores e kits de suspensão', 81),
  ('Monroe', 'monroe', 'Amortecedores e componentes', 82),
  ('Showa', 'showa', 'Amortecedores OEM e reposição', 83),
  ('Pro Link', 'pro-link', 'Amortecedores traseiros e componentes', 84),

  -- Filtros
  ('TECFIL', 'tecfil', 'Filtros de ar, óleo e combustível', 90),
  ('Mann Filter', 'mann-filter', 'Filtros de ar, óleo e combustível', 91),
  ('K&N', 'kn', 'Filtros de ar de alto fluxo', 92),
  ('Mahle', 'mahle', 'Filtros e componentes de motor', 93),
  ('Fram', 'fram', 'Filtros de ar, óleo e combustível', 94),
  ('Wega', 'wega', 'Filtros automotivos', 95),
  ('Winder', 'winder', 'Filtros de ar esportivos', 96),
  ('Wirklich', 'wirklich', 'Filtros de ar, óleo e combustível', 97),

  -- Lubrificantes e fluidos
  ('Castrol', 'castrol', 'Óleos lubrificantes para motor', 100),
  ('Motul', 'motul', 'Óleos sintéticos e fluidos de performance', 101),
  ('Mobil', 'mobil', 'Óleos e lubrificantes', 102),
  ('Yamalube', 'yamalube', 'Óleos e lubrificantes Yamaha', 103),
  ('Lubrax', 'lubrax', 'Óleos lubrificantes Petrobras', 104),
  ('Ipiranga', 'ipiranga', 'Óleos e lubrificantes', 105),
  ('Bardahl', 'bardahl', 'Óleos, aditivos e fluidos', 106),
  ('Liqui Moly', 'liqui-moly', 'Óleos, aditivos e produtos químicos', 107),
  ('Motorex', 'motorex', 'Óleos 2T e 4T para motos', 108),
  ('Petronas', 'petronas', 'Óleos sintéticos e lubrificantes', 109),
  ('Repsol', 'repsol', 'Óleos e lubrificantes', 110),
  ('Tigre', 'tigre', 'Óleos e graxas', 111),
  ('3M', '3m', 'Produtos de limpeza e manutenção', 112),

  -- Baterias
  ('Yuasa', 'yuasa', 'Baterias seladas para motos', 120),
  ('Moura', 'moura', 'Baterias automotivas e motos', 121),
  ('Heliar', 'heliar', 'Baterias Bosch/Moura', 122),
  ('Tudor', 'tudor', 'Baterias automotivas', 123),
  ('Freedom', 'freedom', 'Baterias para motocicletas', 124),

  -- Pneus
  ('Pirelli', 'pirelli', 'Pneus para street, sport e trail', 130),
  ('Michelin', 'michelin', 'Pneus premium para motocicletas', 131),
  ('Metzeler', 'metzeler', 'Pneus esportivos e touring', 132),
  ('Bridgestone', 'bridgestone', 'Pneus para todos os segmentos', 133),
  ('Levorin', 'levorin', 'Pneus nacionais para motos', 134),
  ('Rinaldi', 'rinaldi', 'Pneus para motos e bicicletas', 135),
  ('Maggion', 'maggion', 'Pneus e câmaras de ar', 136),
  ('IRC', 'irc', 'Pneus trail e on-off road', 137),
  ('Technic', 'technic', 'Pneus para motocicletas', 138),
  ('Maxxis', 'maxxis', 'Pneus trail e esportivos', 139),
  ('CST', 'cst', 'Pneus Cheng Shin', 140),
  ('Vipal', 'vipal', 'Pneus para motos', 141),
  ('Dunlop', 'dunlop', 'Pneus esportivos e touring', 142),

  -- Escapamento e performance
  ('Pro Tork', 'pro-tork', 'Escapamentos, capacetes e acessórios', 150),
  ('Arrow', 'arrow', 'Escapamentos esportivos', 151),
  ('Scorpion', 'scorpion', 'Escapamentos e ponteiras', 152),
  ('WCo', 'wco', 'Escapamentos esportivos', 153),
  ('Kappes', 'kappes', 'Escapamentos e coletores', 154),
  ('Red Dragon', 'red-dragon', 'Peças de performance e racing', 155),
  ('Racing Point', 'racing-point', 'Peças esportivas para motos', 156),

  -- Plásticos, carenagem e proteção
  ('Vaz', 'vaz', 'Paralamas, carenagens e plásticos', 160),
  ('Rodoplast', 'rodoplast', 'Paralamas e peças plásticas', 161),
  ('Polisport', 'polisport', 'Plásticos e proteções off-road', 162),
  ('Renoplast', 'renoplast', 'Peças plásticas para motos', 163),

  -- Acessórios, bagagem e segurança
  ('GIVI', 'givi', 'Baús, bagageiros e para-brisas', 170),
  ('Shad', 'shad', 'Baús e suportes laterais', 171),
  ('Baglux', 'baglux', 'Baús e bagageiros', 172),
  ('X11', 'x11', 'Capacetes e acessórios', 173),
  ('LS2', 'ls2', 'Capacetes e vestuário', 174),
  ('Norisk', 'norisk', 'Capacetes e luvas', 175),
  ('Peels', 'peels', 'Capacetes', 176),
  ('HJC', 'hjc', 'Capacetes', 177),
  ('Bell', 'bell', 'Capacetes premium', 178),
  ('Axxis', 'axxis', 'Capacetes e vestuário', 179),
  ('Texx', 'texx', 'Capacetes e jaquetas', 180),
  ('FW3', 'fw3', 'Capacetes e acessórios', 181),
  ('Multilaser', 'multilaser', 'Acessórios e eletrônicos', 182),

  -- Marcas OEM (peças originais de fábrica)
  ('Honda', 'honda', 'Peças originais e reposição Honda', 200),
  ('Yamaha', 'yamaha', 'Peças originais Yamaha', 201),
  ('Suzuki', 'suzuki', 'Peças originais Suzuki', 202),
  ('Kawasaki', 'kawasaki', 'Peças originais Kawasaki', 203),
  ('BMW Motorrad', 'bmw-motorrad', 'Peças originais BMW', 204),
  ('Harley-Davidson', 'harley-davidson', 'Peças originais Harley-Davidson', 205),
  ('KTM', 'ktm', 'Peças originais KTM', 206),
  ('Ducati', 'ducati', 'Peças originais Ducati', 207),
  ('Royal Enfield', 'royal-enfield', 'Peças originais Royal Enfield', 208),
  ('Triumph', 'triumph', 'Peças originais Triumph', 209),
  ('Aprilia', 'aprilia', 'Peças originais Aprilia', 210),
  ('MV Agusta', 'mv-agusta', 'Peças originais MV Agusta', 211),
  ('Benelli', 'benelli', 'Peças originais Benelli', 212),
  ('CFMoto', 'cfmoto', 'Peças originais CFMoto', 213),
  ('Shineray', 'shineray', 'Peças originais Shineray', 214),
  ('Dafra', 'dafra', 'Peças originais Dafra', 215),
  ('Kasinski', 'kasinski', 'Peças originais Kasinski', 216),
  ('Haojue', 'haojue', 'Peças originais Haojue', 217),
  ('Bajaj', 'bajaj', 'Peças originais Bajaj', 218),
  ('Hero', 'hero', 'Peças originais Hero', 219)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ------------------------------------------------------------
-- VERIFICAÇÃO (opcional)
-- ------------------------------------------------------------
-- SELECT COUNT(*) AS total_marcas FROM brands;
-- SELECT name, slug, sort_order FROM brands ORDER BY sort_order, name;
