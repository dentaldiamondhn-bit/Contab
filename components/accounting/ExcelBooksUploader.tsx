"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import { createSupabaseClient, insertWithTenant } from "@/lib/supabase/client";
import { createClient } from '@supabase/supabase-js';
import * as XLSX from "xlsx";

interface ExcelUploaderProps {
  tenantId: string;
  onSuccess?: () => void;
}

interface UploadStatus {
  type: "success" | "error" | "info";
  message: string;
}

// Template de columnas esperadas para cada tipo de libro
const TEMPLATES = {
  libro_diario: [
    "fecha", "tipo_comprobante", "numero_comprobante", "descripcion",
    "codigo_cuenta", "nombre_cuenta", "debe", "haber"
  ],
  libro_mayor: [
    "codigo_cuenta", "nombre_cuenta", "tipo_cuenta", "total_debe", "total_haber", "saldo"
  ],
  libro_compras: [
    "fecha", "numero_factura", "rtn_proveedor", "descripcion_compra", 
    "monto_compra", "credito_fiscal"
  ],
  libro_ventas: [
    "fecha", "numero_factura", "rtn_cliente", "descripcion_venta",
    "monto_venta", "debito_fiscal"
  ],
  // Nuevo formato: Egresos personalizado
  egresos_personalizado: [
    "fecha", "cheque / transf.", "proveedor / beneficiario", "rtn proveedor", 
    "concepto", "monto neto", "isv pagado", "total egreso"
  ],
  // Nuevo formato: Ingresos personalizado
  ingresos_personalizado: [
    "fecha", "documento (recibo/factura)", "cliente / concepto", "rtn cliente", 
    "monto exento", "monto gravado (15%)", "isv (15%)", "total ingreso"
  ]
};

// Función para asegurar que las cuentas existan en la base de datos
async function ensureAccountsExist(tenantId: string, supabase: any) {
  // CRÍTICO: Establecer tenant para RLS antes de cualquier consulta
  console.log("🔍 Setting tenant context:", tenantId);
  await supabase.rpc("set_tenant", { tenant_id: tenantId });
  
  // PRE-FETCH: Obtener todas las cuentas existentes primero
  console.log("🔍 Pre-fetching all existing accounts...");
  const { data: allAccounts, error: fetchError } = await supabase
    .from("Account")
    .select("id, code");
  
  if (fetchError) {
    console.error("❌ Error fetching accounts:", fetchError);
  } else {
    console.log(`✅ Found ${allAccounts?.length || 0} accounts in database`);
    // Build code -> id mapping
    const codeToIdMap = new Map();
    allAccounts?.forEach((acc: any) => {
      codeToIdMap.set(acc.code, acc.id);
      console.log(`   Code ${acc.code} -> ID ${acc.id}`);
    });
    
    // Update ACCOUNT_IDS with real database IDs
    Object.keys(ACCOUNT_IDS).forEach(key => {
      const hardcodedId = ACCOUNT_IDS[key];
      const code = hardcodedId.replace('acct-', '');
      const realId = codeToIdMap.get(code);
      if (realId && realId !== hardcodedId) {
        console.log(`🔄 Updating ACCOUNT_IDS.${key}: ${hardcodedId} -> ${realId}`);
        ACCOUNT_IDS[key] = realId;
      }
    });
  }
  
  const accountsToCreate = [
    // 1. ACTIVO
    { id: ACCOUNT_IDS.CAJA, code: "1101", name: "Caja Principal", type: "ASSET" },
    { id: ACCOUNT_IDS.CAJA_CHICA, code: "1102", name: "Caja Chica", type: "ASSET" },
    { id: ACCOUNT_IDS.BANCOS, code: "1110", name: "Bancos", type: "ASSET" },
    { id: ACCOUNT_IDS.BANCO_FICOHSA, code: "1111", name: "Banco Ficohsa", type: "ASSET" },
    { id: ACCOUNT_IDS.BANCO_ATLANTIDA, code: "1112", name: "Banco Atlántida", type: "ASSET" },
    { id: ACCOUNT_IDS.CLIENTES, code: "1120", name: "Clientes Nacionales", type: "ASSET" },
    { id: ACCOUNT_IDS.CUENTAS_POR_COBRAR, code: "1130", name: "Cuentas por Cobrar", type: "ASSET" },
    { id: ACCOUNT_IDS.INVENTARIOS, code: "1140", name: "Inventarios", type: "ASSET" },
    
    // 2. PASIVO
    { id: ACCOUNT_IDS.PROVEEDORES, code: "2101", name: "Proveedores Nacionales", type: "LIABILITY" },
    { id: ACCOUNT_IDS.ACREEDORES, code: "2110", name: "Acreedores", type: "LIABILITY" },
    { id: ACCOUNT_IDS.IMPUESTOS_POR_PAGAR, code: "2120", name: "Impuestos por Pagar", type: "LIABILITY" },
    { id: ACCOUNT_IDS.PRESTAMOS_CORTO_PLAZO, code: "2140", name: "Préstamos Corto Plazo", type: "LIABILITY" },
    
    // 3. CAPITAL
    { id: ACCOUNT_IDS.CAPITAL_SOCIAL, code: "3101", name: "Capital Social", type: "EQUITY" },
    { id: ACCOUNT_IDS.UTILIDADES_RETENIDAS, code: "3201", name: "Utilidades Retenidas", type: "EQUITY" },
    
    // 4. INGRESOS
    { id: ACCOUNT_IDS.VENTAS_SERVICIOS, code: "4101", name: "Ventas de Servicios", type: "REVENUE" },
    { id: ACCOUNT_IDS.VENTAS_PRODUCTOS, code: "4102", name: "Ventas de Productos", type: "REVENUE" },
    { id: ACCOUNT_IDS.INGRESOS_SERVICIOS, code: "4110", name: "Ingresos por Servicios", type: "REVENUE" },
    { id: ACCOUNT_IDS.INTERESES_GANADOS, code: "4120", name: "Intereses Ganados", type: "REVENUE" },
    
    // 5. COSTOS
    { id: ACCOUNT_IDS.COSTO_VENTAS, code: "5101", name: "Costo de Ventas", type: "EXPENSE" },
    { id: ACCOUNT_IDS.COMPRAS, code: "5110", name: "Compras", type: "EXPENSE" },
    
    // 6. GASTOS
    { id: ACCOUNT_IDS.GASTOS_OPERATIVOS, code: "6103", name: "Gastos Operativos - Servicios Básicos", type: "EXPENSE" },
    { id: ACCOUNT_IDS.GASTOS_ADMINISTRATIVOS, code: "6201", name: "Gastos Administrativos", type: "EXPENSE" },
    { id: ACCOUNT_IDS.GASTOS_VENTAS, code: "6301", name: "Gastos de Ventas", type: "EXPENSE" },
    { id: ACCOUNT_IDS.GASTOS_FINANCIEROS, code: "6401", name: "Gastos Financieros", type: "EXPENSE" },
  ];

  for (const account of accountsToCreate) {
    try {
      // Verificar si la cuenta ya existe - intentar con diferentes nombres de columna
      let existingAccount = null;
      let columnName = "tenantId"; // Default
      
      // Intentar con diferentes variaciones de nombres de columna
      const columnVariations = ["tenantId", "tenantid", "tenant_id"];
      
      for (const colName of columnVariations) {
        try {
          const result = await supabase
            .from("Account")
            .select("id")
            .eq(colName, tenantId)
            .eq("code", account.code)
            .maybeSingle();
          
          if (!result.error) {
            existingAccount = result.data;
            columnName = colName;
            console.log(`🔍 Columna encontrada: ${colName} para cuenta ${account.code}`);
            break;
          }
        } catch (err: any) {
          console.log(`⚠️ Error con columna ${colName}:`, err.message);
          continue;
        }
      }

      if (!existingAccount) {
        // Crear la cuenta con el nombre de columna correcto - INCLUYENDO updatedAt requerido
        const accountData: any = {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          updatedAt: new Date().toISOString(), // Requerido por la base de datos
        };
        
        // Agregar el tenantId con el nombre correcto de columna
        accountData[columnName] = tenantId;

        const { error: createError } = await supabase
          .from("Account")
          .insert(accountData);

        if (createError) {
          console.log(`🔍 Error creating account ${account.code}:`, createError.code, createError.message, createError.details);
          // Si es error de duplicado, buscar la cuenta para obtener su ID real
          if (createError.code === '23505') {
            console.log(`🔍 Cuenta duplicada detectada: ${account.code}, buscando ID real con column=${columnName}, tenant=${tenantId}...`);
            try {
              // Intentar buscar por ID primero
              const { data: byId, error: idError } = await supabase
                .from("Account")
                .select("id, code")
                .eq("id", account.id)
                .maybeSingle();
              
              if (byId) {
                console.log(`✅ Encontrada por ID: ${byId.id} (code: ${byId.code})`);
                const oldId = account.id;
                const keyToUpdate = Object.keys(ACCOUNT_IDS).find(key => ACCOUNT_IDS[key] === oldId);
                if (keyToUpdate) {
                  ACCOUNT_IDS[keyToUpdate] = byId.id;
                  console.log(`✅ Mapeado: ${keyToUpdate}: ${oldId} -> ${byId.id}`);
                }
              } else {
                // Buscar por tenant y código
                const { data: byCode, error: codeError } = await supabase
                  .from("Account")
                  .select("id, code")
                  .eq(columnName, tenantId)
                  .eq("code", account.code)
                  .maybeSingle();
                
                if (byCode) {
                  console.log(`✅ Encontrada por code: ${byCode.id} (code: ${byCode.code})`);
                  const oldId = account.id;
                  const keyToUpdate = Object.keys(ACCOUNT_IDS).find(key => ACCOUNT_IDS[key] === oldId);
                  if (keyToUpdate) {
                    ACCOUNT_IDS[keyToUpdate] = byCode.id;
                    console.log(`✅ Mapeado: ${keyToUpdate}: ${oldId} -> ${byCode.id}`);
                  }
                } else {
                  console.warn(`⚠️ No se encontró cuenta ${account.code} por ID ni por código`);
                  console.warn(`   ID query error:`, idError);
                  console.warn(`   Code query error:`, codeError);
                }
              }
            } catch (err: any) {
              console.error(`❌ Excepción al mapear cuenta ${account.code}:`, err.message);
            }
          } else {
            console.warn(`⚠️ Error creando cuenta ${account.code}:`, createError);
          }
        } else {
          console.log(`✅ Cuenta creada: ${account.code} - ${account.name} (usando columna: ${columnName})`);
        }
      } else {
        // ACTUALIZAR EL ID en ACCOUNT_IDS para usar el ID real de la base de datos
        const realId = existingAccount.id;
        const oldId = account.id;
        // Actualizar el mapeo para que las funciones de procesamiento usen el ID correcto
        (ACCOUNT_IDS as any)[Object.keys(ACCOUNT_IDS).find(key => (ACCOUNT_IDS as any)[key] === oldId) || ''] = realId;
        console.log(`✅ Cuenta existente: ${account.code} - ${account.name} (ID mapeado: ${oldId} -> ${realId})`);
      }
    } catch (error) {
      console.warn(`⚠️ Error verificando cuenta ${account.code}:`, error);
    }
  }
}

// IDs predefinidos de cuentas según catálogo contable estándar
// NOTA: Estos IDs serán actualizados dinámicamente desde la base de datos en ensureAccountsExist
const ACCOUNT_IDS: Record<string, string> = {
  // 1. ACTIVO
  CAJA: "acct-1101",           // 1101 Caja y Efectivo - Caja Principal
  CAJA_CHICA: "acct-1102",     // 1102 Caja y Efectivo - Caja Chica
  BANCOS: "acct-1110",         // 1110 Bancos - Banco Principal
  BANCO_FICOHSA: "acct-1111",  // 1111 Bancos - Banco Ficohsa
  BANCO_ATLANTIDA: "acct-1112", // 1112 Bancos - Banco Atlántida
  CLIENTES: "acct-1120",       // 1120 Clientes - Clientes Nacionales
  CUENTAS_POR_COBRAR: "acct-1130", // 1130 Cuentas por Cobrar
  INVENTARIOS: "acct-1140",    // 1140 Inventarios
  
  // 2. PASIVO
  PROVEEDORES: "acct-2101",    // 2101 Proveedores - Proveedores Nacionales
  ACREEDORES: "acct-2110",     // 2110 Acreedores
  IMPUESTOS_POR_PAGAR: "acct-2120", // 2120 Impuestos por Pagar
  PRESTAMOS_CORTO_PLAZO: "acct-2140", // 2140 Préstamos Bancarios
  
  // 3. CAPITAL
  CAPITAL_SOCIAL: "acct-3101", // 3101 Capital Social
  UTILIDADES_RETENIDAS: "acct-3201", // 3201 Utilidades Retenidas
  
  // 4. INGRESOS
  VENTAS_SERVICIOS: "acct-4101", // 4101 Ventas - Ventas de Servicios
  VENTAS_PRODUCTOS: "acct-4102", // 4102 Ventas - Ventas de Productos
  INGRESOS_SERVICIOS: "acct-4110", // 4110 Ingresos por Servicios
  INTERESES_GANADOS: "acct-4120", // 4120 Intereses Ganados
  
  // 5. COSTOS
  COSTO_VENTAS: "acct-5101",   // 5101 Costo de Ventas
  COMPRAS: "acct-5110",        // 5110 Compras
  
  // 6. GASTOS
  GASTOS_OPERATIVOS: "acct-6103", // 6103 Gastos Operativos - Servicios Básicos
  GASTOS_ADMINISTRATIVOS: "acct-6201", // 6201 Gastos Administrativos
  GASTOS_VENTAS: "acct-6301",  // 6301 Gastos de Ventas
  GASTOS_FINANCIEROS: "acct-6401", // 6401 Gastos Financieros
  
  // Alias para compatibilidad con código existente
  VENTAS: "acct-4101",          // Alias para VENTAS_SERVICIOS
  COMPRAS_EXP: "acct-6101"     // Alias para GASTOS_OPERATIVOS (compras)
};

console.log("🚀 ExcelBooksUploader iniciado - versión sin acceso a Account table");

// Funciones de procesamiento
async function processEgresosPersonalizadoRow(
  headers: string[], 
  row: any[], 
  tenantId: string, 
  supabase: any
) {
  console.log("🔍 processEgresosPersonalizadoRow called");
  // Establecer tenant para RLS
  await supabase.rpc("set_tenant", { tenant_id: tenantId });
  
  // Función mejorada para encontrar valor por columna
  const getValue = (col: string) => {
    const normalizedCol = col.toLowerCase().trim();
    const normalizedHeaders = headers.map(h => h?.toString().toLowerCase().trim() || "");
    
    const index = normalizedHeaders.findIndex(header => 
      header === normalizedCol || 
      header.includes(normalizedCol) || 
      normalizedCol.includes(header) ||
      header.replace(/[()]/g, '').includes(normalizedCol.replace(/[()]/g, '')) ||
      normalizedCol.replace(/[()]/g, '').includes(header.replace(/[()]/g, '')) ||
      header.replace(/[\s\/\.\-]/g, '').includes(normalizedCol.replace(/[\s\/\.\-]/g, '')) ||
      normalizedCol.replace(/[\s\/\.\-]/g, '').includes(header.replace(/[\s\/\.\-]/g, ''))
    );
    
    const rawValue = index >= 0 ? row[index] : "";
    
    // Manejar diferentes tipos de datos - preserve numbers for date handling
    if (rawValue === null || rawValue === undefined) return "";
    if (typeof rawValue === 'number') return rawValue; // Return number as-is for date detection
    return rawValue.toString().trim();
  };

  // Extraer datos
  const fechaRaw = getValue("fecha");
  
  // Check if this is an empty row - skip if fecha is empty
  if (!fechaRaw || (typeof fechaRaw === 'string' && fechaRaw.trim() === '')) {
    console.log(`🔍 Fila vacía detectada en egresos, saltando...`);
    return; // Skip empty rows silently
  }
  
  // Check if original value was a number (Excel serial date) before converting to string
  const isExcelSerialDate = typeof fechaRaw === 'number';
  const fecha = isExcelSerialDate ? fechaRaw : String(fechaRaw || "");
  
  console.log(`🔍 DATE DEBUG - fechaRaw: ${fechaRaw}, type: ${typeof fechaRaw}, isExcelSerialDate: ${isExcelSerialDate}, fecha: ${fecha}, typeof fecha: ${typeof fecha}`);
  
  const chequeTransf = String(getValue("cheque / transf.") || "");
  const proveedorBeneficiario = String(getValue("proveedor / beneficiario") || "");
  const rtnProveedor = String(getValue("rtn proveedor") || "");
  const concepto = String(getValue("concepto") || "");
  
  // Función para parsear montos en formato hondureño
  const parseMonto = (valor: string) => {
    if (!valor) return 0;
    // Remover "L " y convertir coma a punto
    const limpio = valor.replace(/L\s*/g, '').replace(/,/g, '');
    const parsed = parseFloat(limpio);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  const montoNeto = parseMonto(getValue("monto neto"));
  const isvPagado = parseMonto(getValue("isv pagado"));
  const totalEgreso = parseMonto(getValue("total egreso"));

  // Validar datos obligatorios
  const fechaVacio = !fecha || (typeof fecha === 'string' && fecha.trim() === '');
  if (fechaVacio || !proveedorBeneficiario || !concepto || totalEgreso <= 0) {
    console.error("❌ Faltan datos obligatorios:", {
      fechaVacio,
      proveedorVacio: !proveedorBeneficiario,
      conceptoVacio: !concepto,
      totalEgresoInvalido: totalEgreso <= 0
    });
    throw new Error("Faltan datos obligatorios (fecha, proveedor/beneficiario, concepto, total egreso)");
  }

  // Convertir la fecha a formato válido para Supabase
  let fechaFormateada = fecha;
  
  // Manejar diferentes tipos de datos de fecha
  if (typeof fecha === 'number') {
    // Es un número de serie de Excel (ej: 46101)
    console.log(`🔍 Fecha como número Excel: ${fecha}`);
    
    // Convertir número de serie de Excel a fecha
    // Excel cuenta desde 01/01/1900, pero JavaScript desde 01/01/1970
    const excelEpoch = new Date(1900, 0, 1); // 01/01/1900
    const daysSinceEpoch = fecha - 1; // Excel empieza en día 1
    const jsDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
    
    if (!isNaN(jsDate.getTime())) {
      fechaFormateada = jsDate.toISOString();
      console.log(`🔍 Fecha convertida: ${fechaFormateada}`);
    } else {
      throw new Error(`Número de fecha Excel inválido: ${fecha}`);
    }
  } else if (typeof fecha === 'string') {
    // Parsear la fecha y convertirla a formato ISO
    // Manejar diferentes formatos de fecha: DD/MM/YYYY, MM/DD/YYYY, etc.
    const partesFecha = fecha.split('/');
    let dia, mes, anio;
    
    if (partesFecha.length === 3) {
      // Asumir formato DD/MM/YYYY (formato latinoamericano)
      dia = parseInt(partesFecha[0]);
      mes = parseInt(partesFecha[1]) - 1; // Los meses en JS son 0-11
      anio = parseInt(partesFecha[2]);
      
      // Validar que el año sea razonable
      if (anio < 1900 || anio > 2100) {
        throw new Error(`Año inválido: ${anio}`);
      }
      
      const fechaObj = new Date(anio, mes, dia);
      
      if (!isNaN(fechaObj.getTime())) {
        fechaFormateada = fechaObj.toISOString();
      } else {
        throw new Error(`Formato de fecha inválido: ${fecha}`);
      }
    } else {
      throw new Error(`Formato de fecha no reconocido: ${fecha}`);
    }
  } else {
    throw new Error(`Tipo de fecha no soportado: ${typeof fecha} - valor: ${fecha}`);
  }

  console.log("🔍 Insertando Transaction con fecha:", fechaFormateada);
  
  // Generar ID manualmente para evitar problemas con PostgreSQL
  const transactionId = crypto.randomUUID();
  
  // Insert directo con ID generado manualmente - Schema real de Supabase
  const { data: transaction, error: transError } = await supabase
    .from("Transaction")
    .insert({
      id: transactionId,
      tenantId,
      date: fechaFormateada.split('T')[0], // DATE format
      description: `${proveedorBeneficiario} - ${concepto}`,
      voucherType: "EGRESO",
      voucherNumber: await getNextVoucherNumber(tenantId, "EGRESO", supabase),
      currency: "HNL",
      exchangeRate: 24.70,
      totalAmount: Math.round(totalEgreso * 100),
      functionalAmount: Math.round(totalEgreso * 100), // Campo requerido por la DB real
      originalTotal: Math.round(totalEgreso * 100), // Campo requerido por la DB real
      reference: chequeTransf || null,
      proveedorRTN: rtnProveedor || null,
      createdAt: new Date().toISOString(), // Campo requerido por la DB real
      updatedAt: new Date().toISOString(), // Campo requerido por la DB real
      // clienteRTN no se incluye en egresos
    })
    .select()
    .single();

  if (transError) throw transError;

  // Usar IDs de cuentas predefinidos para evitar errores 406
  const gastosAccountId = ACCOUNT_IDS.GASTOS_OPERATIVOS; // Gastos Operativos
  const bancosAccountId = ACCOUNT_IDS.CAJA;              // Caja

  // Crear asientos contables manualmente con IDs generados
  console.log("🔍 Creando JournalEntry 1 (Gastos):", {
    transactionId: transaction.id,
    accountId: gastosAccountId,
    amount: Math.round(totalEgreso * 100)
  });
  
  const { error: je1Error } = await supabase.from("JournalEntry").insert({
    id: crypto.randomUUID(),
    transactionId: transaction.id,
    accountId: gastosAccountId,
    tenantId,
    amount: Math.round(totalEgreso * 100),
    originalAmount: Math.round(totalEgreso * 100),
    currency: "HNL",
    exchangeRate: 24.70,
    description: concepto,
  });

  if (je1Error) {
    console.error("❌ Error en JournalEntry 1:", je1Error);
    throw je1Error;
  }

  console.log("🔍 Creando JournalEntry 2 (Bancos):", {
    transactionId: transaction.id,
    accountId: bancosAccountId,
    amount: -Math.round(totalEgreso * 100)
  });

  const { error: je2Error } = await supabase.from("JournalEntry").insert({
    id: crypto.randomUUID(),
    transactionId: transaction.id,
    accountId: bancosAccountId,
    tenantId,
    amount: -Math.round(totalEgreso * 100),
    originalAmount: Math.round(totalEgreso * 100),
    currency: "HNL",
    exchangeRate: 24.70,
    description: chequeTransf || "Egreso de caja",
  });

  if (je2Error) {
    console.error("❌ Error en JournalEntry 2:", je2Error);
    throw je2Error;
  }

  console.log("✅ Transacción creada exitosamente:", transaction);
}

async function processIngresosPersonalizadoRow(
  headers: string[], 
  row: any[], 
  tenantId: string, 
  supabase: any
) {
  console.log("🔍 processIngresosPersonalizadoRow called");
  // Establecer tenant para RLS
  await supabase.rpc("set_tenant", { tenant_id: tenantId });
  
  // Función mejorada para encontrar valor por columna
  const getValue = (col: string) => {
    const normalizedCol = col.toLowerCase().trim();
    const normalizedHeaders = headers.map(h => h?.toString().toLowerCase().trim() || "");
    
    const index = normalizedHeaders.findIndex(header => 
      header === normalizedCol || 
      header.includes(normalizedCol) || 
      normalizedCol.includes(header) ||
      header.replace(/[()]/g, '').includes(normalizedCol.replace(/[()]/g, '')) ||
      normalizedCol.replace(/[()]/g, '').includes(header.replace(/[()]/g, '')) ||
      header.replace(/[\s\/\.\-]/g, '').includes(normalizedCol.replace(/[\s\/\.\-]/g, '')) ||
      normalizedCol.replace(/[\s\/\.\-]/g, '').includes(header.replace(/[\s\/\.\-]/g, ''))
    );
    
    const rawValue = index >= 0 ? row[index] : "";
    
    // Manejar diferentes tipos de datos - preserve numbers for date handling
    if (rawValue === null || rawValue === undefined) return "";
    if (typeof rawValue === 'number') return rawValue; // Return number as-is for date detection
    return rawValue.toString().trim();
  };

  // Función para parsear montos en formato hondureño (L 11,500.00 -> 11500.00)
  const parseMonto = (valor: any): number => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const str = String(valor);
    // Remove currency symbol, spaces, and convert to number
    // Handle formats like: L 11,500.00, L11,500.00, 11,500.00, 11500.00
    const limpio = str.replace(/^L\s?/i, '').replace(/,/g, '').trim();
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
  };

  // Extraer datos
  const fechaRaw = getValue("fecha");
  
  // Check if this is an empty row - skip if fecha is empty
  if (!fechaRaw || (typeof fechaRaw === 'string' && fechaRaw.trim() === '')) {
    console.log(`🔍 Fila vacía detectada en ingresos, saltando...`);
    return; // Skip empty rows silently
  }
  
  // Check if original value was a number (Excel serial date) before converting to string
  const isExcelSerialDate = typeof fechaRaw === 'number';
  const fecha = isExcelSerialDate ? fechaRaw : String(fechaRaw || "");
  
  console.log(`🔍 DATE DEBUG (ingresos) - fechaRaw: ${fechaRaw}, type: ${typeof fechaRaw}, isExcelSerialDate: ${isExcelSerialDate}, fecha: ${fecha}, typeof fecha: ${typeof fecha}`);
  
  const documento = String(getValue("documento (recibo/factura)") || "");
  const clienteConcepto = String(getValue("cliente / concepto") || "");
  const rtnCliente = String(getValue("rtn cliente") || "");
  const montoExento = parseMonto(getValue("monto exento"));
  const montoGravado = parseMonto(getValue("monto gravado (15%)"));
  const isv = parseMonto(getValue("isv (15%)"));
  const totalIngreso = parseMonto(getValue("total ingreso"));

  console.log(`🔍 Valores parseados: montoExento=${montoExento}, montoGravado=${montoGravado}, isv=${isv}, totalIngreso=${totalIngreso}`);

  // Validar datos obligatorios
  const fechaVacio = !fecha || (typeof fecha === 'string' && fecha.trim() === '');
  if (fechaVacio || !clienteConcepto || totalIngreso <= 0) {
    throw new Error("Faltan datos obligatorios (fecha, cliente/concepto, total ingreso)");
  }

  // Convertir la fecha a formato válido para Supabase
  let fechaFormateada = fecha;
  
  // Manejar diferentes tipos de datos de fecha
  if (typeof fecha === 'number') {
    // Es un número de serie de Excel (ej: 46101)
    console.log(`🔍 Fecha como número Excel (ingresos): ${fecha}`);
    
    // Convertir número de serie de Excel a fecha
    // Excel cuenta desde 01/01/1900, pero JavaScript desde 01/01/1970
    const excelEpoch = new Date(1900, 0, 1); // 01/01/1900
    const daysSinceEpoch = fecha - 1; // Excel empieza en día 1
    const jsDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
    
    if (!isNaN(jsDate.getTime())) {
      fechaFormateada = jsDate.toISOString();
      console.log(`🔍 Fecha convertida (ingresos): ${fechaFormateada}`);
    } else {
      throw new Error(`Número de fecha Excel inválido: ${fecha}`);
    }
  } else if (typeof fecha === 'string') {
    // Parsear la fecha y convertirla a formato ISO
    // Manejar diferentes formatos de fecha: DD/MM/YYYY, MM/DD/YYYY, etc.
    const partesFecha = fecha.split('/');
    let dia, mes, anio;
    
    if (partesFecha.length === 3) {
      // Asumir formato DD/MM/YYYY (formato latinoamericano)
      dia = parseInt(partesFecha[0]);
      mes = parseInt(partesFecha[1]) - 1; // Los meses en JS son 0-11
      anio = parseInt(partesFecha[2]);
      
      // Validar que el año sea razonable
      if (anio < 1900 || anio > 2100) {
        throw new Error(`Año inválido: ${anio}`);
      }
      
      const fechaObj = new Date(anio, mes, dia);
      
      if (!isNaN(fechaObj.getTime())) {
        fechaFormateada = fechaObj.toISOString();
      } else {
        throw new Error(`Formato de fecha inválido: ${fecha}`);
      }
    } else {
      throw new Error(`Formato de fecha no reconocido: ${fecha}`);
    }
  } else {
    throw new Error(`Tipo de fecha no soportado: ${typeof fecha} - valor: ${fecha}`);
  }

  console.log("🔍 Insertando Transaction (ingreso) con fecha:", fechaFormateada);
  
  // Generar ID manualmente para evitar problemas con PostgreSQL
  const transactionId = crypto.randomUUID();
  
  // Insert directo con ID generado manualmente - Schema real de Supabase
  const { data: transaction, error: transError } = await supabase
    .from("Transaction")
    .insert({
      id: transactionId,
      tenantId,
      date: fechaFormateada.split('T')[0], // DATE format
      description: `${clienteConcepto} - ${documento}`,
      voucherType: "INGRESO",
      voucherNumber: await getNextVoucherNumber(tenantId, "INGRESO", supabase),
      currency: "HNL",
      exchangeRate: 24.70,
      totalAmount: Math.round(totalIngreso * 100),
      functionalAmount: Math.round(totalIngreso * 100), // Campo requerido por la DB real
      originalTotal: Math.round(totalIngreso * 100), // Campo requerido por la DB real
      reference: documento || null,
      clienteRTN: rtnCliente || null,
      createdAt: new Date().toISOString(), // Campo requerido por la DB real
      updatedAt: new Date().toISOString(), // Campo requerido por la DB real
      // proveedorRTN no se incluye en ingresos
    })
    .select()
    .single();

  if (transError) throw transError;

  // Usar IDs de cuentas predefinidos para evitar errores 406
  const cajaAccountId = ACCOUNT_IDS.CAJA;    // Caja
  const ingresosAccountId = ACCOUNT_IDS.VENTAS; // Ventas

  // Crear asientos contables manualmente con IDs generados
  await supabase.from("JournalEntry").insert({
    id: crypto.randomUUID(),
    transactionId: transaction.id,
    accountId: cajaAccountId,
    tenantId,
    amount: Math.round(totalIngreso * 100),
    originalAmount: Math.round(totalIngreso * 100),
    currency: "HNL",
    exchangeRate: 24.70,
    description: documento || "Ingreso de caja",
  });

  await supabase.from("JournalEntry").insert({
    id: crypto.randomUUID(),
    transactionId: transaction.id,
    accountId: ingresosAccountId,
    tenantId,
    amount: -Math.round(totalIngreso * 100),
    originalAmount: Math.round(totalIngreso * 100),
    currency: "HNL",
    exchangeRate: 24.70,
    description: clienteConcepto,
  });

  console.log("✅ Transacción de ingreso creada exitosamente:", transaction);
}

// Función helper para obtener el siguiente número de comprobante
async function getNextVoucherNumber(tenantId: string, voucherType: string, supabase: any): Promise<number> {
  try {
    const { data: lastVoucher } = await supabase
      .from("Transaction")
      .select("voucherNumber")
      .eq("tenantId", tenantId)
      .eq("voucherType", voucherType)
      .order("voucherNumber", { ascending: false })
      .limit(1)
      .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores

    return (lastVoucher?.voucherNumber || 0) + 1;
  } catch (error) {
    console.warn("Error obteniendo voucher number, usando 1 como default:", error);
    return 1; // Valor por defecto si hay error
  }
}

export function ExcelBooksUploader({ tenantId, onSuccess }: ExcelUploaderProps) {
  const supabase = createSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generar template de Excel
  const downloadTemplate = (tipo: keyof typeof TEMPLATES) => {
    const columns = TEMPLATES[tipo];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([columns]);
    XLSX.utils.book_append_sheet(wb, ws, tipo);
    XLSX.writeFile(wb, `template_${tipo}.xlsx`);
  };

  // Detectar tipo de libro según columnas
  const detectBookType = (headers: string[]): keyof typeof TEMPLATES | null => {
    // Normalizar headers (quitar espacios, caracteres especiales, convertir a minúsculas)
    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[()\/\-\.\s]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
    );
    
    console.log("Headers originales:", headers);
    console.log("Headers normalizados:", normalizedHeaders);
    
    for (const [type, columns] of Object.entries(TEMPLATES)) {
      // Normalizar columnas del template de la misma forma
      const normalizedColumns = columns.map(col => 
        col.toLowerCase()
          .trim()
          .replace(/[()\/\-\.\s]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_|_$/g, '')
      );
      
      console.log(`Template ${type}:`, normalizedColumns);
      
      // Contar coincidencias
      const matchCount = normalizedColumns.filter(col => 
        normalizedHeaders.some(header => 
          header === col || 
          header.includes(col) || 
          col.includes(header) ||
          header.includes(col.replace(/_/g, '')) ||
          col.includes(header.replace(/_/g, ''))
        )
      ).length;
      
      const matchPercentage = matchCount / columns.length;
      
      console.log(`Tipo ${type}: ${matchCount}/${columns.length} coincidencias (${Math.round(matchPercentage * 100)}%)`);
      
      // Para formatos personalizados, reducir umbral a 40% por las variaciones en nombres
      const threshold = (type.includes('personalizado')) ? 0.4 : 0.5;
      
      if (matchPercentage >= threshold) {
        console.log(`Detectado: ${type} con ${Math.round(matchPercentage * 100)}% coincidencia`);
        return type as keyof typeof TEMPLATES;
      }
    }
    
    console.log("No se detectó ningún formato");
    return null;
  };

  // Procesar archivo Excel
  const processExcel = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setStatus({ type: "info", message: "Leyendo archivo Excel..." });

    try {
      // Establecer tenant para RLS
      await supabase.rpc("set_tenant", { tenant_id: tenantId });
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      
      let totalRows = 0;
      let processedRows = 0;
      let errors: string[] = [];

      // Procesar cada hoja
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: "", // Valor por defecto para celdas vacías
          raw: true   // Obtener valores crudos para manejar fechas Excel correctamente
        }) as any[][];
        
        if (jsonData.length < 2) {
          errors.push(`Hoja "${sheetName}": está vacía`);
          continue;
        }

        const headers = jsonData[0].map((h: any) => (h != null ? h.toString().toLowerCase().trim() : ""));
        const rows = jsonData.slice(1);

        // Debug: Mostrar primeras 3 filas para identificar problema de fechas
        console.log(`🔍 Headers encontrados:`, headers);
        console.log(`🔍 Primeras 3 filas de datos:`, rows.slice(0, 3));
        
        // Debug detallado de la primera fila
        if (rows.length > 0) {
          console.log(`🔍 Fila 0 completa:`, rows[0]);
          console.log(`🔍 Tipo de dato en columna fecha (índice 0):`, typeof rows[0][0], `valor:`, rows[0][0]);
          console.log(`🔍 ¿Es número?:`, typeof rows[0][0] === 'number');
          console.log(`🔍 ¿Es string?:`, typeof rows[0][0] === 'string');
        }

        totalRows += rows.length;

        // Determinar tipo de libro según columnas
        const detectedType = detectBookType(headers);
        console.log(`🔍 Tipo detectado para hoja "${sheetName}":`, detectedType);
        
        if (!detectedType) {
          errors.push(`Hoja "${sheetName}": formato no reconocido. Columnas encontradas: ${headers.join(", ")}`);
          continue;
        }

        setStatus({ type: "info", message: `Procesando ${detectedType} (${rows.length} filas)...` });

        // Asegurar que las cuentas existan antes de procesar filas
        await ensureAccountsExist(tenantId, supabase);

        // Procesar filas según tipo
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            console.log(`🔍 Procesando fila ${i + 2} con tipo: ${detectedType}`);
            
            if (detectedType === "egresos_personalizado") {
              console.log(`🔍 Llamando a processEgresosPersonalizadoRow`);
              await processEgresosPersonalizadoRow(headers, row, tenantId, supabase);
            } else if (detectedType === "ingresos_personalizado") {
              console.log(`🔍 Llamando a processIngresosPersonalizadoRow`);
              await processIngresosPersonalizadoRow(headers, row, tenantId, supabase);
            } else {
              console.log(`❌ Tipo no manejado: ${detectedType}`);
              errors.push(`Fila ${i + 2} en "${sheetName}": tipo de libro no soportado (${detectedType})`);
            }
          } catch (error: any) {
            console.error(`❌ Error procesando fila ${i + 2}:`, error);
            errors.push(`Fila ${i + 2} en "${sheetName}": ${error.message}`);
          }
          
          processedRows++;
          if (processedRows % 10 === 0) {
            setProgress(Math.round((processedRows / totalRows) * 90));
          }
        }
      }

      if (errors.length > 0) {
        setStatus({ 
          type: "error", 
          message: `Proceso completado con ${errors.length} errores:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? "\n... y más" : ""}` 
        });
      } else {
        setStatus({ type: "success", message: `¡Proceso completado! ${processedRows} filas importadas.` });
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      setStatus({ type: "error", message: `Error: ${error.message}` });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [tenantId, supabase, setStatus, setUploading, setProgress, onSuccess]);

  // Drag and drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      processExcel(file);
    } else {
      setStatus({ type: "error", message: "Por favor suba un archivo .xlsx" });
    }
  }, [processExcel]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcel(file);
    }
  }, [processExcel]);

  const handleButtonClick = useCallback(() => {
    console.log("🔍 BUTTON CLICKED - Original Component");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error("🔍 fileInputRef.current is null");
    }
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Libros Contables
        </CardTitle>
        <CardDescription>
          Sube archivos Excel con los libros contables de tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            uploading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600" />
              <div>
                <p className="text-lg font-medium">Procesando archivo...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{progress}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <p className="text-lg font-medium">Arrastra tu archivo Excel aquí</p>
                <p className="text-sm text-gray-600">o haz clic para seleccionarlo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={onFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <Button 
                className="cursor-pointer"
                onClick={handleButtonClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>
          )}
        </div>

        {status && (
          <div className={`mt-4 p-4 rounded-lg ${
            status.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            status.type === "error" ? "bg-red-50 text-red-800 border border-red-200" :
            "bg-blue-50 text-blue-800 border border-blue-200"
          }`}>
            <div className="flex items-center gap-2">
              {status.type === "success" && <CheckCircle className="h-5 w-5" />}
              {status.type === "error" && <AlertCircle className="h-5 w-5" />}
              <p className="text-sm whitespace-pre-line">{status.message}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Formatos soportados:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>• Egresos Personalizado</div>
              <div>• Ingresos Personalizado</div>
              <div>• Libro Diario</div>
              <div>• Libro Mayor</div>
              <div>• Libro de Compras</div>
              <div>• Libro de Ventas</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadTemplate("egresos_personalizado")}>
              <Download className="h-4 w-4 mr-2" />
              Template Egresos Personalizado
            </Button>
            <Button variant="outline" onClick={() => downloadTemplate("ingresos_personalizado")}>
              <Download className="h-4 w-4 mr-2" />
              Template Ingresos Personalizado
            </Button>
            <Button variant="outline" onClick={() => downloadTemplate("libro_diario")}>
              <Download className="h-4 w-4 mr-2" />
              Template Libro Diario
            </Button>
          </div>
          
          <div className="mt-2">
            <Badge variant="outline">Tip</Badge>{" "}
            Descargue los templates para ver el formato exacto requerido.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
