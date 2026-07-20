# Fix Syntax Error in route.ts

## Problema
Hay un error de sintaxis en la línea 194 del archivo `app/api/billing/logo/route.ts`:
```
Expected a semicolon
```

## Solución
Eliminar la llave extra `}` en la línea 194.

## Pasos para corregir:
1. Abre el archivo: `app/api/billing/logo/route.ts`
2. Ve a la línea 194
3. Elimina la llave extra `}` 

## Código problemático:
```typescript
    }, { status: 500 });
  }
  }  // ← ESTA LLAVE ESTÁ DE MÁS
}
```

## Código corregido:
```typescript
    }, { status: 500 });
  }
}
```

## Verificación
Después de corregir, el endpoint debería funcionar sin errores de sintaxis.
