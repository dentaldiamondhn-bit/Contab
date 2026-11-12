-- ========================================
-- ACTUALIZAR POLÍTICAS RLS PARA PAQUETES
-- ========================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view packages from their tenant" ON "Packages";
DROP POLICY IF EXISTS "Users can insert packages for their tenant" ON "Packages";
DROP POLICY IF EXISTS "Users can update packages from their tenant" ON "Packages";
DROP POLICY IF EXISTS "Users can delete packages from their tenant" ON "Packages";
DROP POLICY IF EXISTS "Users can view package products from their tenant" ON "PackageProducts";
DROP POLICY IF EXISTS "Users can insert package products for their tenant" ON "PackageProducts";
DROP POLICY IF EXISTS "Users can update package products from their tenant" ON "PackageProducts";
DROP POLICY IF EXISTS "Users can delete package products from their tenant" ON "PackageProducts";
DROP POLICY IF EXISTS "Enable packages operations without tenant context" ON "Packages";
DROP POLICY IF EXISTS "Enable package products operations without tenant context" ON "PackageProducts";

-- Crear nuevas políticas más permisivas
CREATE POLICY "Users can view packages from their tenant" ON "Packages"
    FOR SELECT USING ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can insert packages for their tenant" ON "Packages"
    FOR INSERT WITH CHECK ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can update packages from their tenant" ON "Packages"
    FOR UPDATE USING ("tenantid" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can delete packages from their tenant" ON "Packages"
    FOR DELETE USING ("id" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can view package products from their tenant" ON "PackageProducts"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can insert package products for their tenant" ON "PackageProducts"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can update package products from their tenant" ON "PackageProducts"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY "Users can delete package products from their tenant" ON "PackageProducts"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Packages" 
            WHERE "Packages"."id" = "PackageProducts"."packageid" 
            AND "Packages"."tenantid" = current_setting('app.current_tenant_id', true)
        )
    );

-- Política de respaldo para permitir operaciones sin contexto de tenant (para pruebas)
CREATE POLICY "Enable packages operations without tenant context" ON "Packages"
    FOR ALL USING (true)
    WITH CHECK ("tenantid" = '1');

CREATE POLICY "Enable package products operations without tenant context" ON "PackageProducts"
    FOR ALL USING (true);
