-- ============================================
-- HACER NICKNAME ÚNICO EN PROFILES
-- ============================================

-- 1. Primero, limpiar nicknames vacíos o null para evitar conflictos
-- (opcional, solo si tienes datos existentes)
-- UPDATE profiles SET nickname = NULL WHERE nickname = '';

-- 2. Crear índice único para nickname
-- Nota: Esto permitirá múltiples NULLs pero nicknames con valor deben ser únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_unique 
ON profiles (nickname) 
WHERE nickname IS NOT NULL AND nickname != '';

-- ============================================
-- INSTRUCCIONES
-- ============================================

-- Ejecuta esto en el SQL Editor de Supabase después de haber ejecutado
-- el schema anterior (DATABASE_SCHEMA_FRIENDS.sql)

-- Si tienes usuarios existentes con nicknames duplicados, primero debes
-- resolver esos conflictos antes de crear el índice único.