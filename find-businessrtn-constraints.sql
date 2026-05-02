-- Find all constraints related to businessrtn across all tables
SELECT 
    t.relname AS table_name,
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
WHERE con.conname LIKE '%businessrtn%'
   OR con.conname LIKE '%rtn%'
ORDER BY t.relname, con.conname;
