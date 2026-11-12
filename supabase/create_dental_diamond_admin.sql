-- Verificar si existe algún registro con el email dentaldiamondhn@gmail.com
SELECT 'Tenant' as tabla, id::text, business_name, business_email FROM "Tenant" WHERE business_email = 'dentaldiamondhn@gmail.com'
UNION ALL
SELECT 'Tenant (camelCase)' as tabla, id::text, businessname, businessemail FROM "Tenant" WHERE businessemail = 'dentaldiamondhn@gmail.com'
UNION ALL
SELECT 'users' as tabla, id::text, email, first_name FROM users WHERE email = 'dentaldiamondhn@gmail.com';
