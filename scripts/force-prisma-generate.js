const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('🔄 Forzando regeneración de Prisma client...');
  
  // Eliminar el cliente Prisma existente
  const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma');
  if (fs.existsSync(prismaClientPath)) {
    console.log('🗑️ Eliminando cliente Prisma existente...');
    fs.rmSync(prismaClientPath, { recursive: true, force: true });
  }
  
  // Generar nuevo cliente Prisma
  console.log('📦 Generando nuevo cliente Prisma...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Cliente Prisma regenerado exitosamente');
  console.log('🔄 Por favor recarga la página para ver los cambios');
  
} catch (error) {
  console.error('❌ Error al regenerar Prisma client:', error.message);
  console.log('💡 Por favor detén el servidor y ejecuta manualmente:');
  console.log('   1. Ctrl+C (detener servidor)');
  console.log('   2. npx prisma generate');
  console.log('   3. npm run dev');
}
