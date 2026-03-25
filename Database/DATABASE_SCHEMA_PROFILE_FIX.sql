-- ============================================
-- FIX PARA PERFIL PROPIO Y VER AMIGOS
-- ============================================

-- EL PROBLEMA: La política anterior no permitía ver tu propio perfil
-- SOLUCIÓN: Permitir ver tu propio perfil + perfiles de otros

-- 1. Eliminar política anterior
DROP POLICY IF EXISTS "Users can view profiles for friend search" ON profiles;

-- 2. Crear política corregida que permite:
--    - Ver tu propio perfil
--    - Ver perfiles de otros usuarios (para buscar amigos)
CREATE POLICY "Users can view own and others profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR auth.uid() != id
  );

-- Esto es equivalente a permitir ver TODOS los perfiles cuando estás logueado
-- Pero mantiene la seguridad de que solo usuarios logueados pueden ver perfiles

-- ============================================
-- POLÍTICA PARA FAVORITOS (ver favoritos de amigos)
-- ============================================

-- Permitir ver favoritos de amigos aceptados
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;

CREATE POLICY "Users can view own and friends favorites" ON favorites
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = user_id) OR
        (addressee_id = auth.uid() AND requester_id = user_id)
      )
    )
  );

-- Mantener políticas de insert/delete solo para el propio usuario
DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;
CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);