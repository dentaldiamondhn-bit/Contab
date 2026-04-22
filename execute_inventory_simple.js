// Script para mostrar las sentencias SQL que deben ejecutarse manualmente
const fs = require('fs');

try {
  const sql = fs.readFileSync('CREATE_INVENTORY_TABLES.sql', 'utf8');
  
  console.log('='.repeat(80));
  console.log('SCRIPT SQL PARA CREAR TABLAS DE INVENTARIO');
  console.log('='.repeat(80));
  console.log('');
  console.log('Para ejecutar estas sentencias SQL:');
  console.log('');
  console.log('1. Ve al panel de Supabase: https://supabase.com/dashboard');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Ve a "SQL Editor" en el menú izquierdo');
  console.log('4. Copia y pega el siguiente contenido:');
  console.log('');
  console.log('='.repeat(80));
  console.log('CONTENIDO SQL:');
  console.log('='.repeat(80));
  console.log('');
  console.log(sql);
  console.log('');
  console.log('='.repeat(80));
  console.log('FIN DEL SCRIPT SQL');
  console.log('='.repeat(80));
  console.log('');
  console.log('Después de ejecutar el SQL, la página de inventario');
  console.log('debería conectarse automáticamente a la base de datos.');
  console.log('');
  console.log('Tablas que se crearán:');
  console.log('- Product: Productos del inventario');
  console.log('- InventoryMovement: Movimientos de stock');
  console.log('');
  console.log('Características incluidas:');
  console.log('- Triggers para actualizar stock automáticamente');
  console.log('- Row Level Security (RLS)');
  console.log('- Índices para mejor rendimiento');
  console.log('- Datos de ejemplo para pruebas');
  
} catch (error) {
  console.error('Error al leer el archivo SQL:', error);
  console.log('Asegúrate de que el archivo CREATE_INVENTORY_TABLES.sql exista en el mismo directorio.');
}
