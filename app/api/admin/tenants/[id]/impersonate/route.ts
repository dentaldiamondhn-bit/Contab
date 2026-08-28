import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let isSuperAdmin = false;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress || '';
      const role = (user.publicMetadata as any)?.role || (user.unsafeMetadata as any)?.role;
      isSuperAdmin = role === 'SUPER_ADMIN' || email === 'sucachi.123@gmail.com';
    } catch {}

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Solo SUPER_ADMIN puede suplantar' }, { status: 403 });
    }

    const { id: tenantId } = await params;

    const response = NextResponse.json({
      success: true,
      redirectUrl: `/dashboard?tenant=${tenantId}`,
    });

    response.cookies.set('impersonated_tenant_id', tenantId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('impersonated_tenant_id', '', {
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
