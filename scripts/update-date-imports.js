// Script para actualizar imports de date-utils en archivos que usan toLocaleDateString

const fs = require('fs');
const path = require('path');

// Función para buscar archivos TypeScript/JavaScript
function findFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Función para verificar si un archivo usa toLocaleDateString
function usesDateFormatting(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('toLocaleDateString');
  } catch (error) {
    return false;
  }
}

// Función para agregar import de date-utils si no existe
function addDateUtilsImport(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar si ya tiene el import
    if (content.includes('from \'@/lib/date-utils\'') || content.includes('from "@/lib/date-utils"')) {
      return false; // Ya tiene el import
    }
    
    // Buscar la sección de imports
    const importRegex = /import\s+.*\s+from\s+['"][^'"]+['"];?\s*\n/g;
    const imports = content.match(importRegex);
    
    if (!imports || imports.length === 0) {
      return false; // No hay imports para modificar
    }
    
    // Encontrar el último import
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    
    // Determinar qué funciones importar basado en el uso
    let functionsToImport = [];
    if (content.includes('toLocaleDateString')) {
      functionsToImport.push('formatDateForDisplay');
    }
    if (content.includes('formatDateRange') || content.includes('-')) {
      functionsToImport.push('formatDateRange');
    }
    if (content.includes('new Date') && content.includes('<')) {
      functionsToImport.push('isDateExpired');
    }
    if (content.includes('type="date"')) {
      functionsToImport.push('formatDateForInput');
    }
    
    if (functionsToImport.length === 0) {
      return false; // No se determinaron funciones necesarias
    }
    
    // Crear el nuevo import
    const newImport = `import { ${functionsToImport.join(', ')} } from '@/lib/date-utils';\n`;
    
    // Insertar después del último import
    const beforeImport = content.substring(0, lastImportIndex + lastImport.length);
    const afterImport = content.substring(lastImportIndex + lastImport.length);
    
    content = beforeImport + newImport + afterImport;
    
    // Guardar el archivo
    fs.writeFileSync(filePath, content);
    return true;
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Función principal
function main() {
  const appDir = path.join(__dirname, '..', 'app');
  const componentsDir = path.join(__dirname, '..', 'components');
  
  // Buscar archivos en app y components
  const files = [
    ...findFiles(appDir),
    ...findFiles(componentsDir)
  ];
  
  console.log(`Buscando en ${files.length} archivos...`);
  
  // Filtrar archivos que usan formateo de fechas
  const filesWithDates = files.filter(usesDateFormatting);
  console.log(`Se encontraron ${filesWithDates.length} archivos que usan formateo de fechas:`);
  
  let updatedCount = 0;
  
  // Actualizar cada archivo
  for (const file of filesWithDates) {
    const wasUpdated = addDateUtilsImport(file);
    if (wasUpdated) {
      console.log(`  + Actualizado: ${path.relative(process.cwd(), file)}`);
      updatedCount++;
    } else {
      console.log(`  - Ya actualizado o sin cambios: ${path.relative(process.cwd(), file)}`);
    }
  }
  
  console.log(`\nResumen:`);
  console.log(`- Archivos con formateo de fechas: ${filesWithDates.length}`);
  console.log(`- Archivos actualizados: ${updatedCount}`);
  console.log(`\nPara completar la migración, reemplaza manualmente las llamadas a toLocaleDateString con las funciones apropiadas:`);
  console.log(`- toLocaleDateString('es-HN') -> formatDateForDisplay()`);  
  console.log(`- new Date() < new Date() -> isDateExpired()`);
  console.log(`- type="date" value={...} -> formatDateForInput()`);
}

if (require.main === module) {
  main();
}

module.exports = { findFiles, usesDateFormatting, addDateUtilsImport };
