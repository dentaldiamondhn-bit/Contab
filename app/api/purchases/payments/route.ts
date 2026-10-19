import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa, recomputePurchase, crearAsientoPago, eliminarAsiento } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

function transformPayment(p: any): any {
  return {
    id: p.id,
    purchase_id: p.purchase_id,
    supplier_id: p.supplier_id,
    amount: p.amount === null || p.amount === undefined ? 0 : Number(p.amount),
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    reference: p.reference_number || null,
    reference_number: p.reference_number || null,
    notes: p.notes || null,
    journal_entry_id: p.journal_entry_id || null,
    created_at: p.created_at,
  };
}

/**
 * Los cuatro handlersickleaban el `tenant_id` a un `'1'` fijo, y ademas los tres
 * ultimos hacian `.eq('id', id)` sin filtro de empresa. El POST era el peor: la
 * compra salia del CUERPO (`purchase_id`), sin comprobar de que empresa era, asi
 * que un pago se podia colgar de una compra de cualquier empresa y recalcular su
 * saldo.
 *
 * Ahora los cuatroorman por la empresa del contexto, y la compra o el pago se
 * validan contra ella antes de tocar nada. Un id de otra empresa da 404, no 403:
 * no se le confirma que el objeto existe.
 */
export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchaseId');

    let query = getSupabaseServer()
      .from('SupplierPayment')
      .select('*')
      .eq('company_id', empresa.companyId)
      .order('created_at', { ascending: true });

    if (purchaseId) {
      query = query.eq('purchase_id', purchaseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data || []).map(transformPayment));
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();
    const { purchase_id, amount, payment_method, reference, notes, payment_date } = body;

    if (!purchase_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // La compra tiene que ser DE ESTA empresa. Sin esto, el `purchase_id` del
    // cuerpo daba para colgar un pago de la compra de otra empresa.
    const { data: purchase, error: purchaseError } = await supabase
      .from('Purchase')
      .select('id, supplier_id, invoice_number, company_id')
      .eq('id', purchase_id)
      .eq('company_id', empresa.companyId)
      .maybeSingle();

    if (purchaseError) {
      return NextResponse.json({ error: purchaseError.message }, { status: 500 });
    }
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (!purchase.supplier_id) {
      return NextResponse.json({ error: 'La compra no tiene proveedor asignado' }, { status: 400 });
    }

    const paymentInsert: any = {
      supplier_id: purchase.supplier_id,
      purchase_id: purchase.id,
      company_id: empresa.companyId,
      amount: Math.round(Number(amount)),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method,
      reference_number: reference || null,
      notes: notes || null,
      is_reconciled: false,
      tenant_id: empresa.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: payment, error: paymentError } = await supabase
      .from('SupplierPayment')
      .insert(paymentInsert)
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // El asiento del pago (debe CxP / haber Banco) es OBLIGATORIO: si falta la
    // cuenta o falla el INSERT, se borra el pago recien creado para no dejar una
    // fila sin contabilizar y se propaga el 409.
    let asiento: any;
    try {
      asiento = await crearAsientoPago(supabase, empresa, payment, purchase);
    } catch (asientoError) {
      await supabase
        .from('SupplierPayment')
        .delete()
        .eq('id', payment.id)
        .eq('company_id', empresa.companyId);
      throw asientoError;
    }

    const { data: enlazado } = await supabase
      .from('SupplierPayment')
      .update({ journal_entry_id: asiento.id, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('company_id', empresa.companyId)
      .select()
      .single();

    const updatedPurchase = await recomputePurchase(supabase, empresa, purchase_id);

    return NextResponse.json(
      { payment: transformPayment(enlazado || { ...payment, journal_entry_id: asiento.id }), updatedPurchase },
      { status: 201 }
    );
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const body = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: existing } = await supabase
      .from('SupplierPayment')
      .select('id, purchase_id, supplier_id, amount, payment_date, payment_method, reference_number, journal_entry_id')
      .eq('id', paymentId)
      .eq('company_id', empresa.companyId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const merged: any = { ...existing };
    if (body.amount !== undefined) merged.amount = Math.round(Number(body.amount));
    if (body.payment_method !== undefined) merged.payment_method = body.payment_method;
    if (body.reference !== undefined) merged.reference_number = body.reference;
    if (body.payment_date !== undefined) merged.payment_date = body.payment_date;

    const { data: purchase } = await supabase
      .from('Purchase')
      .select('id, invoice_number')
      .eq('id', existing.purchase_id)
      .eq('company_id', empresa.companyId)
      .maybeSingle();

    // Asiento NUEVO antes de tocar la fila (fail-closed): si falta la cuenta o
    // falla, el pago queda como estaba. Recien despues de enlazarlo se borra el
    // asiento viejo, para no dejar un pago sin contabilizar en ningun momento.
    const asiento = await crearAsientoPago(supabase, empresa, merged, purchase);

    const updates: any = {
      amount: merged.amount,
      payment_method: merged.payment_method,
      reference_number: merged.reference_number,
      payment_date: merged.payment_date,
      journal_entry_id: asiento.id,
      updated_at: new Date().toISOString(),
    };

    const { data: payment, error } = await supabase
      .from('SupplierPayment')
      .update(updates)
      .eq('id', paymentId)
      .eq('company_id', empresa.companyId)
      .select()
      .single();

    if (error) {
      // La fila no cambio: se descarta el asiento nuevo y se conserva el viejo.
      await eliminarAsiento(supabase, (asiento as { id: string }).id);
      console.error('Error updating payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.journal_entry_id && existing.journal_entry_id !== asiento.id) {
      await eliminarAsiento(supabase, existing.journal_entry_id);
    }

    await recomputePurchase(supabase, empresa, payment.purchase_id);

    return NextResponse.json(transformPayment(payment));
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: existing } = await supabase
      .from('SupplierPayment')
      .select('purchase_id, journal_entry_id')
      .eq('id', paymentId)
      .eq('company_id', empresa.companyId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('SupplierPayment')
      .delete()
      .eq('id', paymentId)
      .eq('company_id', empresa.companyId);

    if (error) {
      console.error('Error deleting payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Borrar el asiento del pago (best-effort: el pago ya no existe).
    await eliminarAsiento(supabase, existing.journal_entry_id);

    await recomputePurchase(supabase, empresa, existing.purchase_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}