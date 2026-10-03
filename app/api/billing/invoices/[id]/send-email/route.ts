import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { fetchInvoiceData } from '@/lib/services/pdf-data';
import { buildPdfDocument } from '@/lib/services/pdf-document-builder';
import { renderPdfDocument, pdfFilename, num, str } from '@/lib/services/pdf-documents';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { buildInvoiceEmailHtml, buildInvoiceEmailText } from '@/lib/email/invoice-email';

// force-dynamic: depende del PDF renderizado en runtime y de las variables de
// entorno del proveedor de correo.
// nodejs: @react-pdf/renderer y el adjunto Buffers requieren el runtime de Node.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

// La moneda y el correo del cliente viven en la fila de la factura pero no los
// expone fetchInvoiceData.
async function readInvoiceMeta(invoiceId: string): Promise<{ currency: string; customerEmail: string }> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('Invoice')
      .select('currency, customerEmail, customer_email')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error || !data) return { currency: 'HNL', customerEmail: '' };
    const row = (data as Record<string, unknown>) || {};
    return {
      currency: str(row.currency) || 'HNL',
      customerEmail: str(row.customerEmail) || str(row.customer_email),
    };
  } catch {
    return { currency: 'HNL', customerEmail: '' };
  }
}

// POST /api/billing/invoices/[id]/send-email
// Body: { email?, companyId, customerName?, subject?, message? }
// `email` es opcional: si falta, se usa el correo guardado en la factura.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: invoiceId } = await params;
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Falta el id de la factura' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const companyId = str(body.companyId) || tenantHint(request) || '';

    // Fallan rapido las condiciones que no dependen de la base de datos.
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error:
            'El envio de correo no esta configurado. Agrega RESEND_API_KEY y EMAIL_FROM a .env.local y reinicia el servidor.',
        },
        { status: 503 },
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Falta el companyId de la empresa' },
        { status: 400 },
      );
    }

    // fetchInvoiceData valida que la factura pertenezca al tenant (evita fuga
    // cruzada entre empresas).
    const data = await fetchInvoiceData(companyId, invoiceId, tenantHint(request));
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada para esta empresa' },
        { status: 404 },
      );
    }

    const { invoice, company, items } = data;
    const meta = await readInvoiceMeta(invoiceId);

    // Destinatario: el del cuerpo o, si no viene, el que quedo en la factura.
    const to = str(body.email).trim() || meta.customerEmail.trim();

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Esta factura no tiene correo de cliente. Indica un correo en el cuerpo de la solicitud.',
        },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: `El correo "${to}" no es valido` },
        { status: 400 },
      );
    }

    // PDF real con el mismo motor que usa /api/documents/pdf.
    const pdfBuffer = await renderPdfDocument(buildPdfDocument('invoice', data));
    const filename = pdfFilename('invoice', [invoice.invoiceNumber]);

    const customMessage = str(body.message).trim();

    const emailData = {
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.phone,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      customerName: str(body.customerName) || invoice.customerName,
      customerRTN: invoice.customerRTN,
      subtotal: num(invoice.subtotal),
      tax: num(invoice.tax),
      taxRate: num(invoice.taxRate),
      total: num(invoice.total),
      currency: meta.currency,
      items: items.map((item) => ({
        description: str(item.description),
        quantity: num(item.quantity),
        unitPrice: num(item.unitPrice),
        total: num(item.total),
      })),
    };

    const subject =
      str(body.subject).trim() ||
      `Factura ${invoice.invoiceNumber} - ${company.name}`;

    const html = buildInvoiceEmailHtml(emailData);
    const text = buildInvoiceEmailText(emailData);
    // Nota personalizada del emisor, si se mando.
    const finalHtml = customMessage
      ? html.replace(
          '<!--CUSTOM_MESSAGE-->',
          `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;">${customMessage
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</p><!--CUSTOM_MESSAGE-->`,
        )
      : html.replace('<!--CUSTOM_MESSAGE-->', '');

    const result = await sendEmail({
      to,
      subject,
      html: finalHtml,
      text: customMessage ? `${customMessage}\n\n${text}` : text,
      replyTo: company.email || undefined,
      attachments: [{ filename, content: pdfBuffer }],
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, notConfigured: result.notConfigured, error: result.error },
        { status: result.notConfigured ? 503 : 502 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.id,
      sentTo: to,
      filename,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
