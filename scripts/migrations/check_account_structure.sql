-- Verificar estructura exacta de la tabla Account
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Account' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar también las tablas que existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Account', 'User', 'Tenant')
ORDER BY table_name;
