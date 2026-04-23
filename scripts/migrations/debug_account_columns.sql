-- Verificar exactamente qué columnas tiene la tabla Account
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Account' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- También verificar si hay alguna columna similar a 'isActive'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Account' 
AND table_schema = 'public'
AND (column_name ILIKE '%active%' OR column_name ILIKE '%Active%')
ORDER BY column_name;

-- Mostrar algunas filas de Account para ver la estructura real
SELECT * FROM "Account" LIMIT 3;
