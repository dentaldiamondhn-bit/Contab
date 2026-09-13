import { NextRequest, NextResponse } from "next/server";
import { supabase as supabaseService } from "@/lib/supabase-db";

interface ValidationIssue {
  severity: "error" | "warning";
  type: string;
  message: string;
  accounts: { id: string; code: string; name: string }[];
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ||
                     new URL(request.url).searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const { data: accounts, error } = await supabaseService
      .from("Account")
      .select("id, code, name, parentId, type, is_active, tenantId")
      .eq("tenantId", tenantId)
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ issues: [], summary: { total: 0, errors: 0, warnings: 0 } });
    }

    const issues: ValidationIssue[] = [];

    // 1. Duplicate codes
    const codeMap = new Map<string, typeof accounts>();
    for (const acc of accounts) {
      if (!acc.code) continue;
      const existing = codeMap.get(acc.code);
      if (existing) existing.push(acc);
      else codeMap.set(acc.code, [acc]);
    }
    for (const [code, dupes] of codeMap) {
      if (dupes.length > 1) {
        issues.push({
          severity: "error",
          type: "DUPLICATE_CODE",
          message: `Código "${code}" está duplicado en ${dupes.length} cuentas`,
          accounts: dupes.map(a => ({ id: a.id, code: a.code, name: a.name })),
        });
      }
    }

    // 2. Orphan accounts (parentId references non-existent account)
    const idSet = new Set(accounts.map(a => a.id));
    const orphans = accounts.filter(a => a.parentId && !idSet.has(a.parentId));
    if (orphans.length > 0) {
      issues.push({
        severity: "error",
        type: "ORPHAN_PARENT",
        message: `${orphans.length} cuentas tienen un padre que no existe`,
        accounts: orphans.map(a => ({ id: a.id, code: a.code, name: a.name })),
      });
    }

    // 3. Missing code
    const noCode = accounts.filter(a => !a.code || a.code.trim() === "");
    if (noCode.length > 0) {
      issues.push({
        severity: "error",
        type: "MISSING_CODE",
        message: `${noCode.length} cuentas no tienen código`,
        accounts: noCode.map(a => ({ id: a.id, code: a.code || "(vacío)", name: a.name })),
      });
    }

    // 4. Missing name
    const noName = accounts.filter(a => !a.name || a.name.trim() === "" || a.name === a.code);
    if (noName.length > 0) {
      issues.push({
        severity: "warning",
        type: "MISSING_NAME",
        message: `${noName.length} cuentas no tienen nombre descriptivo`,
        accounts: noName.map(a => ({ id: a.id, code: a.code, name: a.name || "(vacío)" })),
      });
    }

    // 5. Inconsistent code separators (some use . some use -)
    const dotCodes = accounts.filter(a => a.code && a.code.includes("."));
    const dashCodes = accounts.filter(a => a.code && a.code.includes("-") && !a.code.includes("."));
    if (dotCodes.length > 0 && dashCodes.length > 0) {
      issues.push({
        severity: "warning",
        type: "INCONSISTENT_SEPARATORS",
        message: `Códigos mezclan separadores: ${dotCodes.length} usan "." y ${dashCodes.length} usan "-"`,
        accounts: [
          ...dotCodes.slice(0, 3).map(a => ({ id: a.id, code: a.code, name: a.name })),
          ...dashCodes.slice(0, 3).map(a => ({ id: a.id, code: a.code, name: a.name })),
        ],
      });
    }

    // 6. Inactive accounts
    const inactive = accounts.filter(a => a.is_active === false);
    if (inactive.length > 0) {
      issues.push({
        severity: "warning",
        type: "INACTIVE_ACCOUNTS",
        message: `${inactive.length} cuentas están desactivadas`,
        accounts: inactive.map(a => ({ id: a.id, code: a.code, name: a.name })),
      });
    }

    // 7. Root accounts (no parent) with no type or invalid type structure
    const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
    const badType = accounts.filter(a => a.type && !validTypes.includes(a.type));
    if (badType.length > 0) {
      issues.push({
        severity: "warning",
        type: "INVALID_TYPE",
        message: `${badType.length} cuentas tienen tipo no estándar`,
        accounts: badType.map(a => ({ id: a.id, code: a.code, name: a.name })),
      });
    }

    // 8. Self-referencing parent
    const selfRef = accounts.filter(a => a.parentId && a.parentId === a.id);
    if (selfRef.length > 0) {
      issues.push({
        severity: "error",
        type: "SELF_REFERENCE",
        message: `${selfRef.length} cuentas se referencian a sí mismas como padre`,
        accounts: selfRef.map(a => ({ id: a.id, code: a.code, name: a.name })),
      });
    }

    // 9. Accounts with name = code (likely auto-generated, not descriptive)
    const codeAsName = accounts.filter(a => a.name && a.code && a.name === a.code);
    if (codeAsName.length > 0) {
      issues.push({
        severity: "warning",
        type: "CODE_AS_NAME",
        message: `${codeAsName.length} cuentas usan el código como nombre (sin nombre descriptivo)`,
        accounts: codeAsName.map(a => ({ id: a.id, code: a.code, name: a.name })),
      });
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;

    return NextResponse.json({
      issues,
      accounts: accounts.length,
      summary: {
        total: accounts.length,
        errors,
        warnings,
        valid: errors === 0,
      },
    });
  } catch (error) {
    console.error("Error validating catalog:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
