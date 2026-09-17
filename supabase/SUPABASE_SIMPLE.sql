-- EJECUTAR EN SUPABASE SQL EDITOR - Query 1: Verificar columnas existentes
SELECT 
    table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name IN ('Invoice', 'InvoiceItem')
ORDER BY table_name, ordinal_position;
