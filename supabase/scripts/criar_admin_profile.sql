-- ============================================================
-- CRIAR PERFIL DE ADMINISTRADOR
-- Rode no SQL Editor do Supabase (projeto MULTILINE_DATABASE)
-- ============================================================

-- PASSO 1: Veja qual e-mail está cadastrado no Auth
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- PASSO 2: Troque o e-mail abaixo pelo SEU e-mail do passo 1
-- (ex.: admin@multilinemotopecas.com.br)

INSERT INTO admin_profiles (id, email, full_name, role)
SELECT id, email, 'Diego', 'admin'
FROM auth.users
WHERE email = 'admin@multilinemotopecas.com.br'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- PASSO 3: Confirme que foi criado
SELECT * FROM admin_profiles;
