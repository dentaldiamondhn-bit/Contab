// Mapeo entre el esquema canónico de inventario (snake_case: product,
// inventory_movement) y los nombres "legacy" que usan algunas pantallas
// antiguas (PascalCase/camelCase). Centraliza la traducción en la frontera
// con la base de datos para no duplicar tablas.

export function dbToLegacyProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    tenantid: p.tenant_id,
    tenantId: p.tenant_id,
    sku: p.code,
    code: p.code,
    cost: p.current_cost,
    unitCost: p.current_cost,
    price: p.unit_price,
    unitPrice: p.unit_price,
    stock: p.current_stock,
    currentStock: p.current_stock,
    minstock: p.min_stock,
    minStock: p.min_stock,
    maxstock: p.max_stock,
    maxStock: p.max_stock,
    isActive: p.is_active,
    createdat: p.created_at,
    updatedat: p.updated_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    discountPrice: p.discount_price,
    isDiscount: p.is_discount,
    expirationDate: p.expiration_date,
    promotionStartDate: p.promotion_start_date,
    promotionEndDate: p.promotion_end_date,
  };
}

export function dbToLegacyProducts(rows: any[] | null | undefined) {
  return (rows || []).map(dbToLegacyProduct);
}

export function legacyProductToDb(input: any) {
  const out: any = {};
  const set = (k: string, v: any) => {
    if (v !== undefined) out[k] = v;
  };

  set('tenant_id', input.tenant_id ?? input.tenantid ?? input.tenantId);
  set('code', input.code ?? input.sku);
  set('name', input.name);
  set('description', input.description);
  set('category', input.category);
  set('unit', input.unit);

  set('unit_price', input.unit_price ?? input.unitPrice ?? input.price);
  set('current_cost', input.current_cost ?? input.unitCost ?? input.cost);

  const stock = input.current_stock ?? input.currentStock ?? input.stock;
  if (stock !== undefined) {
    out.current_stock = stock;
    out.stock_quantity = stock;
  }

  set('min_stock', input.min_stock ?? input.minStock ?? input.minstock);
  set('max_stock', input.max_stock ?? input.maxStock ?? input.maxstock);
  set('is_active', input.is_active ?? input.isActive);
  set('is_service', input.is_service ?? input.isService);
  set('tax_rate', input.tax_rate ?? input.taxRate);
  set('product_type', input.product_type ?? input.productType);
  set('valuation_method', input.valuation_method ?? input.valuationMethod);
  set('warehouse_id', input.warehouse_id ?? input.warehouseId);
  set('lot_number', input.lot_number ?? input.lotNumber);
  set('discount_price', input.discount_price ?? input.discountPrice);
  set('is_discount', input.is_discount ?? input.isDiscount);
  set('expiration_date', input.expiration_date ?? input.expirationDate);
  set('promotion_start_date', input.promotion_start_date ?? input.promotionStartDate);
  set('promotion_end_date', input.promotion_end_date ?? input.promotionEndDate);
  set('tags', input.tags);
  set('supplier_id', input.supplier_id ?? input.supplierId);
  return out;
}

export function dbToLegacyMovement(m: any) {
  if (!m) return m;
  return {
    ...m,
    tenantid: m.tenant_id,
    tenantId: m.tenant_id,
    productid: m.product_id,
    productId: m.product_id,
    type: m.movement_type,
    transactionType: m.movement_type,
    reason: m.movement_reason,
    movementReason: m.movement_reason,
    reference: m.reference_number,
    createdat: m.created_at,
    createdAt: m.created_at,
    createdby: m.created_by,
    unitCost: m.unit_cost,
    totalCost: m.total_cost,
  };
}

export function dbToLegacyMovements(rows: any[] | null | undefined) {
  return (rows || []).map(dbToLegacyMovement);
}

export function legacyMovementToDb(input: any) {
  const out: any = {};
  const set = (k: string, v: any) => {
    if (v !== undefined) out[k] = v;
  };

  set('tenant_id', input.tenant_id ?? input.tenantid ?? input.tenantId);
  set('product_id', input.product_id ?? input.productid ?? input.productId);
  set('warehouse_id', input.warehouse_id ?? input.warehouseId);
  set('movement_type', input.movement_type ?? input.transactionType ?? input.type);
  set('movement_reason', input.movement_reason ?? input.reason);
  set('quantity', input.quantity);
  set('unit_cost', input.unit_cost ?? input.unitCost);
  set('total_cost', input.total_cost ?? input.totalCost);
  set('stock_before', input.stock_before);
  set('stock_after', input.stock_after);
  set('reference_id', input.reference_id);
  set('reference_type', input.reference_type);
  set('reference_number', input.reference_number ?? input.reference);
  set('lot_number', input.lot_number);
  set('expiration_date', input.expiration_date);
  set('notes', input.notes);
  set('created_by', input.created_by ?? input.createdby);
  return out;
}

export function dbToLegacySupplier(s: any) {
  if (!s) return s;
  return {
    ...s,
    tenantId: s.tenant_id,
    isActive: s.is_active,
    commercialName: s.commercial_name,
    creditLimit: s.credit_limit,
    currentBalance: s.current_balance,
    supplierType: s.supplier_type,
  };
}

export function dbToLegacySuppliers(rows: any[] | null | undefined) {
  return (rows || []).map(dbToLegacySupplier);
}

export function legacySupplierToDb(input: any) {
  const out: any = {};
  const set = (k: string, v: any) => {
    if (v !== undefined) out[k] = v;
  };

  set('tenant_id', input.tenant_id ?? input.tenantId);
  set('rtn', input.rtn);
  set('name', input.name);
  set('commercial_name', input.commercial_name ?? input.commercialName);
  set('email', input.email);
  set('phone', input.phone);
  set('mobile', input.mobile);
  set('address', input.address);
  set('city', input.city);
  set('country', input.country);
  set('supplier_type', input.supplier_type ?? input.supplierType);
  set('category', input.category);
  set('payment_terms', input.payment_terms ?? input.paymentTerms);
  set('payment_method', input.payment_method ?? input.paymentMethod);
  set('bank_name', input.bank_name ?? input.bankName);
  set('bank_account', input.bank_account ?? input.bankAccount);
  set('account_type', input.account_type ?? input.accountType);
  set('credit_limit', input.credit_limit ?? input.creditLimit);
  set('current_balance', input.current_balance ?? input.currentBalance);
  set('is_active', input.is_active ?? input.isActive);
  set('is_preferred', input.is_preferred ?? input.isPreferred);
  return out;
}
