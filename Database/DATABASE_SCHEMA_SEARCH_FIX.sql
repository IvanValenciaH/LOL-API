-- ============================================
-- FIX PARA PERMITIR BUSCAR USUARIOS
-- ============================================

-- EL PROBLEMA: La política actual solo permite ver tu propio perfil
-- o perfiles de amigos aceptados. Pero para enviar solicitudes de amistad,
-- necesitas poder ver perfiles de usuarios que NO son tus amigos.

-- SOLUCIÓN: Modificar la política para permitir ver todos los perfiles
-- excepto el tuyo propio (para poder buscar y agregar amigos)

-- 1. Eliminar política anterior restrictiva
DROP POLICY IF EXISTS "Users can view own and friends profiles" ON profiles;

-- 2. Crear nueva política más permisiva para búsqueda de amigos
-- Permite ver todos los perfiles excepto el propio
CREATE POLICY "Users can view profiles for friend search" ON profiles
  FOR SELECT USING (
    auth.uid() != id  -- Ver todos EXCEPTO el propio
  );

-- NOTA: Esto permite que cualquier usuario logueado vea los perfiles
-- de otros usuarios. Si quieres más privacidad, podemos hacer que solo
-- muestre nickname y avatar, pero oculte nombre real, email, etc.

-- ============================================
-- ALTERNATIVA: Si quieres más privacidad
-- ============================================

-- Opción B: Crear una función RPC que solo devuelva datos mínimos
-- y no exponga información privada

CREATE OR REPLACE FUNCTION search_users_public(search_query TEXT)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  avatar_url TEXT,
  role TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER  -- Ejecuta con privilegios del owner, bypass RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nickname,
    p.avatar_url,
    p.role
  FROM profiles p
  WHERE 
    p.nickname ILIKE '%' || search_query || '%'
    AND p.id != auth.uid()
    AND p.nickname IS NOT NULL
    AND p.nickname != ''
  LIMIT 10;
END;
$$;

-- ============================================
-- INSTRUCCIONES
-- ============================================

-- Ejecuta este SQL en Supabase SQL Editor para permitir la búsqueda.
-- Después de ejecutarlo, recarga la página de "Buscar Amigos" y prueba.