import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { InvoiceGenerator } from '@/lib/billing/invoice-generator';

export async function POST(req: NextRequest) {
  try {
    // Verify that the user is authenticated and is SUPER_ADMIN
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;

    // Get email from Clerk user
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

    if (!userId || (!['SUPER_ADMIN'].includes(userRole as string) && !isSuperAdminEmail)) {
      return NextResponse.json(
        { error: 'No autorizado. Solo los super administradores pueden generar facturas.' },
        { status: 403 }
      );
    }

    // Generate monthly invoices
    const results = await InvoiceGenerator.generateMonthlyInvoices();

    return NextResponse.json({
      success: true,
      message: `Facturas generadas exitosamente`,
      results: {
        success: results.success,
        errors: results.errors.length,
        errorDetails: results.errors
      }
    });

  } catch (error: any) {
    console.error('Error generando facturas mensuales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar facturas' },
      { status: 500 }
    );
  }
}
