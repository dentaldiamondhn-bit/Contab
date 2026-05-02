-- Configurar privilegios para contab_prod
-- Ejecutar este script en la base de datos contab_prod

-- Otorgar privilegios en esquema public
GRANT ALL ON SCHEMA public TO contab_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO contab_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO contab_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO contab_user;

-- Configurar privilegios por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO contab_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO contab_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO contab_user;
