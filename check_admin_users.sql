-- Check for existing admin users
SELECT email, role, first_name, last_name, is_active, created_at 
FROM users 
WHERE role IN ('ADMIN', 'MANAGER', 'SUPER_ADMIN') 
   OR email = 'sucachi.123@gmail.com'
ORDER BY created_at DESC;
