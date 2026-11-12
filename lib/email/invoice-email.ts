export interface InvoiceEmailData {
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerRTN?: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const CURRENCY_SYMBOLS: Record<string, string> = { HNL: 'L', USD: '$', EUR: '€' };

function symbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency || 'L';
}

function formatMoney(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `${symbol(currency)} ${amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Cuerpo HTML del correo de factura (tabla inline, sin CSS externo). */
export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.unitPrice, data.currency)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.total, data.currency)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es-HN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura ${escapeHtml(data.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0e7490;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;color:#ffffff;">${escapeHtml(data.companyName)}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#cffafe;">Adjunto encontrar&aacute; su factura</p>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Estimado(a) <strong>${escapeHtml(data.customerName)}</strong>,
        le enviamos la factura <strong>${escapeHtml(data.invoiceNumber)}</strong> emitida el ${formatDate(data.issueDate)}.
        El documento en PDF va adjunto a este correo.
      </p>

      <!--CUSTOM_MESSAGE-->

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb;">Descripci&oacute;n</th>
            <th style="padding:8px 10px;text-align:center;border-bottom:2px solid #e5e7eb;">Cant.</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e5e7eb;">P. Unitario</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <tr>
          <td style="padding:4px 10px;color:#6b7280;">Subtotal</td>
          <td style="padding:4px 10px;text-align:right;">${formatMoney(data.subtotal, data.currency)}</td>
        </tr>
        <tr>
          <td style="padding:4px 10px;color:#6b7280;">ISV (${data.taxRate}%)</td>
          <td style="padding:4px 10px;text-align:right;">${formatMoney(data.tax, data.currency)}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;border-top:2px solid #e5e7eb;font-weight:bold;font-size:15px;">Total</td>
          <td style="padding:8px 10px;border-top:2px solid #e5e7eb;text-align:right;font-weight:bold;font-size:15px;color:#0e7490;">${formatMoney(data.total, data.currency)}</td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
        Si tiene alguna consulta sobre esta factura, responda a este correo o comun&iacute;quese con nosotros${data.companyPhone ? ` al ${escapeHtml(data.companyPhone)}` : ''}.
      </p>
    </div>

    <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        ${escapeHtml(data.companyName)}${data.companyEmail ? ` &middot; ${escapeHtml(data.companyEmail)}` : ''}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** Version en texto plano (fallback para clientes que no renderizan HTML). */
export function buildInvoiceEmailText(data: InvoiceEmailData): string {
  const lines = [
    `Factura ${data.invoiceNumber}`,
    `${data.companyName}`,
    '',
    `Cliente: ${data.customerName}`,
    `Fecha: ${formatDate(data.issueDate)}`,
    '',
    ...data.items.map(
      (item) =>
        `- ${item.description} x${item.quantity} = ${formatMoney(item.total, data.currency)}`,
    ),
    '',
    `Subtotal: ${formatMoney(data.subtotal, data.currency)}`,
    `ISV (${data.taxRate}%): ${formatMoney(data.tax, data.currency)}`,
    `TOTAL: ${formatMoney(data.total, data.currency)}`,
    '',
    'El documento en PDF va adjunto a este correo.',
  ];
  return lines.join('\n');
}
