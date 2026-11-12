// Script de verificación para el setup de inventario
const fs = require('fs');

console.log('='.repeat(80));
console.log('VERIFICACIÓN DEL SETUP DE INVENTARIO');
console.log('='.repeat(80));
console.log('');
console.log('Para verificar que todo funcionó correctamente, ejecuta las siguientes');
console.log('consultas SQL en el SQL Editor de Supabase:');
console.log('');

const verificationQueries = [
  {
    name: '1. Verificar tablas creadas',
    sql: `SELECT table_name, table_schema 
           FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('Product', 'InventoryMovement')
           ORDER BY table_name;`
  },
  {
    name: '2. Verificar triggers creados',
    sql: `SELECT trigger_name, event_manipulation, action_timing, event_object_table
           FROM information_schema.triggers
           WHERE trigger_schema = 'public'
           AND trigger_name IN ('product_update_timestamp', 'movement_update_stock')
           ORDER BY trigger_name;`
  },
  {
    name: '3. Verificar índices creados',
    sql: `SELECT indexname, tablename 
           FROM pg_indexes 
           WHERE schemaname = 'public'
           AND tablename IN ('Product', 'InventoryMovement')
           ORDER BY tablename, indexname;`
  },
  {
    name: '4. Verificar RLS habilitado',
    sql: `SELECT tablename, rowsecurity 
           FROM pg_tables 
           WHERE schemaname = 'public'
           AND tablename IN ('Product', 'InventoryMovement')
           ORDER BY tablename;`
  },
  {
    name: '5. Verificar políticas RLS',
    sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
           FROM pg_policies 
           WHERE schemaname = 'public'
           AND tablename IN ('Product', 'InventoryMovement')
           ORDER BY tablename, policyname;`
  },
  {
    name: '6. Verificar productos de ejemplo',
    sql: `SELECT id, tenantid, sku, name, category, unit, cost, price, stock, minStock, maxStock, isActive, createdat
           FROM "Product"
           ORDER BY createdat;`
  },
  {
    name: '7. Verificar movimientos de ejemplo',
    sql: `SELECT id, tenantid, productid, type, quantity, reason, reference, createdat, createdby
           FROM "InventoryMovement"
           ORDER BY createdat;`
  },
  {
    name: '8. Verificar integridad referencial',
    sql: `SELECT p.name as product_name, p.stock as current_stock, 
           COUNT(m.id) as movement_count,
           SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE -m.quantity END) as net_movement
           FROM "Product" p
           LEFT JOIN "InventoryMovement" m ON p.id = m.productid
           GROUP BY p.id, p.name, p.stock
           ORDER BY p.name;`
  },
  {
    name: '9. Verificar estadísticas de inventario',
    sql: `SELECT 
           COUNT(*) as total_products,
           COUNT(*) FILTER (WHERE isActive = true) as active_products,
           SUM(stock) as total_stock,
           SUM(stock * cost) as total_inventory_value,
           AVG(stock) as avg_stock_per_product
           FROM "Product";`
  },
  {
    name: '10. Verificar productos con stock bajo',
    sql: `SELECT name, sku, stock, minStock, maxStock,
           CASE 
             WHEN stock = 0 THEN 'Agotado'
             WHEN stock <= minStock THEN 'Stock Bajo'
             WHEN stock >= maxStock THEN 'Stock Alto'
             ELSE 'Normal'
           END as stock_status
           FROM "Product"
           WHERE stock <= minStock OR stock = 0 OR stock >= maxStock
           ORDER BY stock;`
  }
];

verificationQueries.forEach((query, index) => {
  console.log(`${query.name}`);
  console.log('-'.repeat(60));
  console.log(query.sql);
  console.log('');
});

console.log('='.repeat(80));
console.log('VERIFICACIÓN DE FUNCIONALIDADES');
console.log('='.repeat(80));
console.log('');
console.log('Para probar las funcionalidades, puedes ejecutar estas consultas de prueba:');
console.log('');

const testQueries = [
  {
    name: 'Test 1: Insertar nuevo producto',
    sql: `INSERT INTO "Product" (tenantid, sku, name, description, category, unit, cost, price, stock, minStock, maxStock)
           VALUES ('1', 'TEST-001', 'Producto de Prueba', 'Descripción de prueba', 'Test', 'Unidades', 10.50, 15.00, 25, 5, 100)
           RETURNING *;`
  },
  {
    name: 'Test 2: Registrar movimiento de entrada',
    sql: `INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
           SELECT '1', p.id, 'IN', 10, 'Entrada de prueba', 'TEST-001', 'system'
           FROM "Product" p WHERE p.sku = 'TEST-001'
           RETURNING *;`
  },
  {
    name: 'Test 3: Verificar stock actualizado',
    sql: `SELECT name, sku, stock, cost, price 
           FROM "Product" 
           WHERE sku = 'TEST-001';`
  },
  {
    name: 'Test 4: Registrar movimiento de salida',
    sql: `INSERT INTO "InventoryMovement" (tenantid, productid, type, quantity, reason, reference, createdby)
           SELECT '1', p.id, 'OUT', 5, 'Salida de prueba', 'TEST-002', 'system'
           FROM "Product" p WHERE p.sku = 'TEST-001'
           RETURNING *;`
  },
  {
    name: 'Test 5: Verificar stock final',
    sql: `SELECT name, sku, stock, cost, price,
           (SELECT COUNT(*) FROM "InventoryMovement" WHERE productid = p.id) as movement_count
           FROM "Product" p 
           WHERE sku = 'TEST-001';`
  },
  {
    name: 'Test 6: Limpiar datos de prueba',
    sql: `DELETE FROM "InventoryMovement" WHERE reference LIKE 'TEST-%';
           DELETE FROM "Product" WHERE sku LIKE 'TEST-%';`
  }
];

testQueries.forEach((query, index) => {
  console.log(`${query.name}`);
  console.log('-'.repeat(60));
  console.log(query.sql);
  console.log('');
});

console.log('='.repeat(80));
console.log('VERIFICACIÓN EN LA APLICACIÓN');
console.log('='.repeat(80));
console.log('');
console.log('Para verificar que la aplicación funciona correctamente:');
console.log('');
console.log('1. Inicia la aplicación: npm run dev');
console.log('2. Ve a: http://localhost:3000/inventory');
console.log('3. Deberías ver:');
console.log('   - Los 3 productos de ejemplo');
console.log('   - Estadísticas del inventario');
console.log('   - Vista de tarjetas y tabla funcionando');
console.log('4. Prueba crear un nuevo producto:');
console.log('   - Completa todos los campos');
console.log('   - Verifica que el costo unitario se calcule automáticamente');
console.log('   - Verifica que el stock total se muestre');
console.log('5. Prueba registrar movimientos:');
console.log('   - Haz clic en el botón "-" en una tarjeta de producto');
console.log('   - Registra una entrada o salida');
console.log('   - Verifica que el stock se actualice');
console.log('6. Prueba la validación:');
console.log('   - Intenta guardar con datos inválidos');
console.log('   - Verifica que aparezcan los mensajes de error');
console.log('');
console.log('='.repeat(80));
console.log('SOLUCIÓN DE PROBLEMAS COMUNES');
console.log('='.repeat(80));
console.log('');
console.log('Si algo no funciona, revisa:');
console.log('');
console.log('1. Error de conexión a Supabase:');
console.log('   - Verifica que las variables de entorno estén configuradas');
console.log('   - NEXT_PUBLIC_SUPABASE_URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('');
console.log('2. Error de RLS (Row Level Security):');
console.log('   - Ejecuta: ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;');
console.log('   - Ejecuta: ALTER TABLE "InventoryMovement" DISABLE ROW LEVEL SECURITY;');
console.log('   - Luego vuelve a habilitar si es necesario');
console.log('');
console.log('3. Error de triggers:');
console.log('   - Los triggers se crean automáticamente');
console.log('   - Si fallan, ejecuta el SQL manualmente');
console.log('');
console.log('4. Error de datos no visibles:');
console.log('   - Verifica que el tenantid sea correcto');
console.log('   - Los datos de ejemplo usan tenantid = "1"');
console.log('');
console.log('5. Error de validación en la aplicación:');
console.log('   - Revisa la consola del navegador');
console.log('   - Verifica los errores de red en las herramientas de desarrollador');
console.log('');
console.log('¡Listo! El inventario debería estar funcionando correctamente.');
