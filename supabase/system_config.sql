-- system_config: configuracion por tenant (impresion/impuestos de factura)
--
-- La app ya lee/escribe esta tabla desde
-- app/api/companies/[id]/billing/config/route.ts, pero nunca se creo en esta
-- instancia de Supabase. Sin ella, guardar los ajustes de factura devolvia
-- error y la pantalla volvia a los valores por defecto.
--
-- Notas de diseno:
--   * `tenant_id` es TEXT porque el resto de la app identifica al tenant por
--     `Company.tenantId` (codigos legacy: TEST1DS, TST20HM, ANGELOH7...), no
--     por el UUID de `tenants.id`.
--   * La unicidad es (tenant_id, key), NO `key` solo: con `key UNIQUE` el
--     primer tenant que guardara `invoice_settings` impedia guardarlo a los
--     demas.
--   * tenant_id NOT NULL DEFAULT '' permite configuracion global sin tenant.

CREATE TABLE IF NOT EXISTS public.system_config (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_config_tenant_key_uidx
  ON public.system_config (tenant_id, key);

CREATE INDEX IF NOT EXISTS system_config_key_idx
  ON public.system_config (key);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on system_config" ON public.system_config;
CREATE POLICY "Allow all for service_role on system_config"
  ON public.system_config FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read system_config" ON public.system_config;
CREATE POLICY "Authenticated users can read system_config"
  ON public.system_config FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON public.system_config TO service_role;
GRANT SELECT ON public.system_config TO authenticated;
