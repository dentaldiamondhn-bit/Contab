const fs = require('fs');
let content = fs.readFileSync('app/companies/[id]/purchases/page.tsx', 'utf8');

const oldFunction = `  const handleAddItem = () => {
    if (!newItem.product_name || !newItem.unit_price || !newItem.quantity) {
      alert('Complete todos los campos obligatorios del artículo');
      return;
    }

    const exonerated = !!newItem.exonerated;
    const item: PurchaseItem = {
      product_name: newItem.product_name!,
      description: newItem.description || '',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'Unidad',
      units_per_package: newItem.units_per_package || 1,
      unit_price: newItem.unit_price || 0,
      discount_percentage: newItem.discount_percentage || 0,
      discount_amount: 0,
      subtotal: (newItem.quantity || 1) * (newItem.unit_price || 0),
      tax_rate: exonerated ? 0 : taxRate,
      tax_amount: 0,
      total: 0,
      total_cost: (newItem as any).total_cost || 0,
      exonerated,
    };

    // Calculate discount amount
    item.discount_amount = item.subtotal * (item.discount_percentage / 100);
    item.subtotal = item.subtotal - item.discount_amount;
    
    // Calculate tax and total
    item.tax_amount = item.subtotal * (item.tax_rate / 100);
    item.total = item.subtotal + item.tax_amount;

    setItems([...items, item]);
    setNewItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit: 'Unidad',
      units_per_package: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 15,
      exonerated: false,
    });
  };`;

const newFunction = `  const handleAddItem = () => {
    if (!newItem.product_name || !newItem.unit_price || !newItem.quantity) {
      alert('Complete todos los campos obligatorios del artículo');
      return;
    }

    const exonerated = !!newItem.exonerated;
    const itemTaxRate = exonerated ? 0 : (newItem.tax_rate ?? taxRate);
    
    // Calculate subtotal: quantity × unit_price (using the measure's unit_price)
    // If price_includes_tax is true, the unit_price already includes ISV, so we need to net it
    let baseUnitPrice = newItem.unit_price || 0;
    if (newItem.price_includes_tax) {
      // Neto = precio / (1 + taxRate/100)
      baseUnitPrice = baseUnitPrice / (1 + (itemTaxRate / 100));
    }
    
    const subtotalValue = Math.round(newItem.quantity * baseUnitPrice);
    const discountAmount = Math.round(subtotalValue * (newItem.discount_percentage || 0) / 100);
    const subtotalAfterDiscount = subtotalValue - discountAmount;
    const taxAmountValue = Math.round(subtotalAfterDiscount * (itemTaxRate / 100));
    const totalValue = subtotalAfterDiscount + taxAmountValue;

    const item: PurchaseItem = {
      product_name: newItem.product_name!,
      description: newItem.description || '',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'Unidad',
      unit_factor: newItem.unit_factor || 1,
      unit_price: Math.round(baseUnitPrice),
      discount_percentage: newItem.discount_percentage || 0,
      discount_amount: discountAmount,
      subtotal: subtotalAfterDiscount,
      tax_rate: itemTaxRate,
      tax_amount: taxAmountValue,
      total: totalValue,
      total_cost: (newItem as any).total_cost || 0,
      exonerated,
      price_includes_tax: !!newItem.price_includes_tax,
    };

    setItems([...items, item]);
    setNewItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit: 'Unidad',
      unit_factor: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 15,
      exonerated: false,
      price_includes_tax: false,
    });
  };`;`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync('app/companies/[id]/purchases/page.tsx', content, 'utf8');
  console.log('Function replaced successfully');
} else {
  console.log('Old function not found - pattern mismatch');
  // Debug: show lines around 631
  const lines = content.split('\n');
  for (let i = 628; i < 635; i++) {
    if (lines[i]) console.log((i+1) + ': ' + lines[i]);
  }
}