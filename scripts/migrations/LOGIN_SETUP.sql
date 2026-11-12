-- =====================================================
-- SQL PARA SISTEMA DE AUTENTICACIÓN Y LOGIN
-- =====================================================

-- =====================================================
-- 1. TABLA: users (Información adicional de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Relación con auth de Supabase (opcional)
    auth_id UUID UNIQUE,
    
    -- Información básica
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    
    -- Rol del usuario
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'accountant', 'user', 'business_owner')),
    
    -- Estado de la cuenta
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Seguridad
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Preferencias
    preferred_language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'America/Tegucigalpa',
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Información extendida de usuarios del sistema';
COMMENT ON COLUMN users.auth_id IS 'ID de autenticación de Supabase Auth (si se usa)';
COMMENT ON COLUMN users.role IS 'Rol: admin, accountant, user, business_owner';
COMMENT ON COLUMN users.locked_until IS 'Fecha hasta la cual la cuenta está bloqueada por seguridad';

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- 2. TABLA: login_attempts (Rate limiting persistente)
-- =====================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificador (email o IP)
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(20) NOT NULL CHECK (identifier_type IN ('email', 'ip', 'email_ip')),
    
    -- Contadores
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Bloqueo
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP WITH TIME ZONE,
    block_reason VARCHAR(255),
    
    -- Información adicional
    ip_address INET,
    user_agent TEXT,
    was_successful BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE login_attempts IS 'Registro de intentos de login para rate limiting y seguridad';

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked ON login_attempts(is_blocked, blocked_until);

-- =====================================================
-- 3. TABLA: user_sessions (Sesiones de usuario)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token y expiración
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Información del dispositivo
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_remembered BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE user_sessions IS 'Sesiones activas de usuarios';

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);

-- =====================================================
-- 4. TABLA: password_resets (Recuperación de contraseña)
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token de reset
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Estado
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Información de seguridad
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE password_resets IS 'Tokens para recuperación de contraseña';

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- =====================================================
-- 5. TABLA: user_activities (Log de actividades)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Información de la actividad
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_activities IS 'Log de actividades de usuarios para auditoría';

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);

-- =====================================================
-- 6. FUNCIONES AUXILIARES
-- =====================================================

-- Función: Limpiar intentos de login antiguos
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '24 hours'
      AND is_blocked = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función: Registrar intento de login
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_identifier VARCHAR(255),
    p_identifier_type VARCHAR(20),
    p_ip_address INET,
    p_user_agent TEXT,
    p_success BOOLEAN
)
RETURNS TABLE (attempts INTEGER, is_blocked BOOLEAN, blocked_until TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_record login_attempts%ROWTYPE;
    v_max_attempts INTEGER := 5;
    v_block_duration INTERVAL := '30 minutes';
BEGIN
    -- Buscar registro existente del último día
    SELECT * INTO v_record
    FROM login_attempts
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND first_attempt_at > NOW() - INTERVAL '15 minutes'
    ORDER BY last_attempt_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Crear nuevo registro
        INSERT INTO login_attempts (
            identifier, identifier_type, attempt_count, ip_address, 
            user_agent, was_successful
        ) VALUES (
            p_identifier, p_identifier_type, 1, p_ip_address, 
            p_user_agent, p_success
        )
        RETURNING * INTO v_record;
    ELSE
        -- Actualizar registro existente
        UPDATE login_attempts
        SET attempt_count = CASE 
                WHEN p_success THEN 0 
                ELSE attempt_count + 1 
            END,
            last_attempt_at = NOW(),
            was_successful = p_success,
            is_blocked = CASE 
                WHEN NOT p_success AND attempt_count + 1 >= v_max_attempts THEN TRUE 
                ELSE FALSE 
            END,
            blocked_until = CASE 
                WHEN NOT p_success AND attempt_count + 1 >= v_max_attempts 
                THEN NOW() + v_block_duration 
                ELSE blocked_until 
            END,
            block_reason = CASE 
                WHEN NOT p_success AND attempt_count + 1 >= v_max_attempts 
                THEN 'Demasiados intentos fallidos' 
                ELSE block_reason 
            END
        WHERE id = v_record.id
        RETURNING * INTO v_record;
    END IF;
    
    RETURN QUERY SELECT v_record.attempt_count, v_record.is_blocked, v_record.blocked_until;
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar si usuario está bloqueado
CREATE OR REPLACE FUNCTION is_user_blocked(p_identifier VARCHAR(255))
RETURNS TABLE (blocked BOOLEAN, blocked_until TIMESTAMP WITH TIME ZONE, attempts_remaining INTEGER) AS $$
DECLARE
    v_max_attempts INTEGER := 5;
    v_record login_attempts%ROWTYPE;
BEGIN
    SELECT * INTO v_record
    FROM login_attempts
    WHERE identifier = p_identifier
      AND first_attempt_at > NOW() - INTERVAL '15 minutes'
    ORDER BY last_attempt_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, v_max_attempts;
        RETURN;
    END IF;
    
    -- Verificar si el bloqueo expiró
    IF v_record.is_blocked AND v_record.blocked_until < NOW() THEN
        -- Desbloquear automáticamente
        UPDATE login_attempts
        SET is_blocked = FALSE, 
            blocked_until = NULL,
            attempt_count = 0
        WHERE id = v_record.id;
        
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, v_max_attempts;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        v_record.is_blocked, 
        v_record.blocked_until,
        GREATEST(0, v_max_attempts - v_record.attempt_count);
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar timestamp de última actividad
CREATE OR REPLACE FUNCTION update_user_last_active(p_session_token VARCHAR(255))
RETURNS void AS $$
BEGIN
    UPDATE user_sessions
    SET last_active_at = NOW()
    WHERE session_token = p_session_token
      AND is_active = TRUE
      AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger: Actualizar updated_at de users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- =====================================================
-- 8. DATOS INICIALES (Opcional)
-- =====================================================

-- Usuario administrador de ejemplo (solo para desarrollo)
-- La contraseña debe hashearse con bcrypt antes de insertar
-- INSERT INTO users (email, first_name, last_name, role, is_verified, email_verified_at)
-- VALUES ('admin@contab.com', 'Administrador', 'Sistema', 'admin', TRUE, NOW());

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
COMMENT ON TABLE users IS 'Usuarios del sistema con información extendida';
COMMENT ON TABLE login_attempts IS 'Intentos de login para rate limiting y seguridad';
COMMENT ON TABLE user_sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE password_resets IS 'Tokens para recuperación de contraseña';
COMMENT ON TABLE user_activities IS 'Log de actividades de usuarios para auditoría';
