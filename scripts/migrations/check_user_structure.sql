-- Verificar estructura exacta de la tabla User
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si la tabla User existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'User';

-- Mostrar todas las tablas que empiezan con 'U'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'U%'
ORDER BY table_name;
