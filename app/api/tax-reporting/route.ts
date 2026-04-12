import { NextResponse } from 'next/server';
import { TaxReportingService } from '@/lib/services/tax-reporting';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      // Return available periods
      const periods = await TaxReportingService.getAvailablePeriods();
      return NextResponse.json({ periods });
    }

    // Generate report for specific period
    const report = await TaxReportingService.generateMonthlyReport(period);
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating tax report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tax report' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { period, format } = body;

    if (!period) {
      return NextResponse.json(
        { error: 'Period is required' },
        { status: 400 }
      );
    }

    const report = await TaxReportingService.generateMonthlyReport(period);

    if (format === 'csv') {
      const csv = await TaxReportingService.exportToCSV(report);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tax-report-${period}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error exporting tax report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export tax report' },
      { status: 500 }
    );
  }
}
