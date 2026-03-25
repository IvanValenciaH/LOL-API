-- ============================================
-- SCHEMA PARA SISTEMA DE AMIGOS (SUPABASE)
-- ============================================

-- 1. TABLA FRIENDSHIPS (Solicitudes de amistad)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- 2. ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status ON friendships(addressee_id, status);

-- 3. HABILITAR RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA FRIENDSHIPS

-- Política: Ver solicitudes donde soy el remitente o destinatario
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- Política: Insertar solicitudes (solo como remitente)
CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id AND
    auth.uid() != addressee_id
  );

-- Política: Actualizar solicitudes (solo si eres parte de la amistad)
CREATE POLICY "Users can update their friendships" ON friendships
  FOR UPDATE USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- Política: Eliminar solicitudes (solo si eres parte de la amistad)
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- 5. MODIFICAR POLÍTICAS DE PROFILES PARA PERMITIR VER AMIGOS

-- Eliminar política anterior de solo ver propio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Nueva política: Ver tu propio perfil O perfiles de amigos aceptados
CREATE POLICY "Users can view own and friends profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = profiles.id) OR
        (addressee_id = auth.uid() AND requester_id = profiles.id)
      )
    )
  );

-- 6. FUNCIÓN PARA BUSCAR USUARIOS POR NICKNAME (Segura)
CREATE OR REPLACE FUNCTION search_users_by_nickname(search_query TEXT)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nickname,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.role
  FROM profiles p
  WHERE 
    p.nickname ILIKE '%' || search_query || '%'
    AND p.id != auth.uid()
    AND NOT EXISTS (
      -- Excluir usuarios que ya son amigos o tienen solicitudes pendientes
      SELECT 1 FROM friendships f
      WHERE f.status IN ('pending', 'accepted')
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = p.id) OR
        (f.addressee_id = auth.uid() AND f.requester_id = p.id)
      )
    )
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PARA ACTUALIZAR updated_at EN FRIENDSHIPS
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_friendships_timestamp ON friendships;
CREATE TRIGGER update_friendships_timestamp
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================

-- Para ejecutar en Supabase:
-- 1. Ve al SQL Editor en tu dashboard de Supabase
-- 2. Crea una "New query"
-- 3. Pega todo este código
-- 4. Ejecuta (Run)

-- Nota: Asegúrate de que la tabla 'profiles' ya exista
-- (debería estar creada por el schema anterior)