import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || PAYPAL_CLIENT_ID === 'sb') {
    // Modo demo sin credenciales reales
    return null;
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = body.amount || '10.00';
    const currency = body.currency || 'USD';

    // Si no hay credenciales reales, devolver mock para demo
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({
        id: `MOCK-${Date.now()}`,
        status: 'CREATED',
        mock: true,
        message: 'PayPal sandbox no configurado - usando modo demo. Configura PAYPAL_CLIENT_ID/SECRET en .env',
      });
    }

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: String(amount) } }],
      }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PayPal create-order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
