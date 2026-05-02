-- Crear base de datos de desarrollo
CREATE DATABASE contab_dev;

-- Crear base de datos de producción
CREATE DATABASE contab_prod;

-- Crear usuario para la aplicación
CREATE USER contab_user WITH PASSWORD 'ContabSecure2024!';

-- Otorgar privilegios a nivel de base de datos
GRANT ALL PRIVILEGES ON DATABASE contab_dev TO contab_user;
GRANT ALL PRIVILEGES ON DATABASE contab_prod TO contab_user;
