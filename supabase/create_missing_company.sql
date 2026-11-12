-- Script para crear la company faltante para el tenant DENTALWD
-- Esto completa los datos de onboarding que faltan

INSERT INTO companies (
  id,
  tenant_id,
  name,
  rtn,
  email,
  address,
  phone,
  contact_phone,
  industry,
  total_units,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- ID único para la company
  'DENTALWD', -- tenant_id que coincide con el tenant existente
  'Dental Diamond', -- Nombre del negocio (coincide con tenant.name)
  '0801-1998-12345', -- RTN de ejemplo (puedes actualizarlo después)
  'info@dentaldiamond.com', -- Email de ejemplo
  'San Pedro Sula, Cortés, Honduras', -- Dirección de ejemplo
  '504-2555-1234', -- Teléfono principal
  '504-2555-1234', -- Teléfono de contacto
  'Servicios de Salud', -- Industria
  5, -- Número de unidades/usuarios
  NOW(), -- created_at
  NOW()  -- updated_at
);

-- Verificación
SELECT * FROM companies WHERE tenant_id = 'DENTALWD';

-- También verificar el tenant existente
SELECT * FROM tenants WHERE id = 'DENTALWD';
