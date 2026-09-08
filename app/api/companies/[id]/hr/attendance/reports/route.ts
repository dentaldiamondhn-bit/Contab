import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
  }

  try {
    const [attendanceRes, employeesRes, holidaysRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('tenant_id', companyId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true }),
      supabase
        .from('employees')
        .select('employee_id, first_name, last_name, position, department, base_salary, status')
        .eq('tenant_id', companyId)
        .eq('status', 'active'),
      supabase
        .from('attendance_holidays')
        .select('*')
        .eq('tenant_id', companyId)
        .gte('date', start)
        .lte('date', end),
    ]);

    const records = attendanceRes.data || [];
    const employees = employeesRes.data || [];
    const holidays = holidaysRes.data || [];

    const totalActiveEmployees = employees.length;

    // Status counts
    const statusCounts: Record<string, number> = {};
    records.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    // Daily trend
    const dailyMap: Record<string, { present: number; absent: number; late: number; vacation: number; overtime: number; total: number }> = {};
    records.forEach(r => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { present: 0, absent: 0, late: 0, vacation: 0, overtime: 0, total: 0 };
      dailyMap[r.date].total++;
      if (r.status === 'present') dailyMap[r.date].present++;
      else if (r.status === 'absent') dailyMap[r.date].absent++;
      else if (r.status === 'late') dailyMap[r.date].late++;
      else if (r.status === 'vacation') dailyMap[r.date].vacation++;
      if (r.overtime_hours > 0) dailyMap[r.date].overtime += r.overtime_hours;
    });

    const dailyTrend = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      present: d.present,
      absent: d.absent,
      late: d.late,
      vacation: d.vacation,
      attendanceRate: d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0,
      overtimeHours: Math.round(d.overtime * 100) / 100,
    }));

    // Employee ranking (most absences)
    const empAbsences: Record<string, { name: string; department: string; absences: number; tardies: number; vacations: number; overtimeHours: number; totalDeductions: number }> = {};
    employees.forEach(e => {
      empAbsences[e.employee_id] = {
        name: `${e.first_name} ${e.last_name}`,
        department: e.department || '',
        absences: 0,
        tardies: 0,
        vacations: 0,
        overtimeHours: 0,
        totalDeductions: 0,
      };
    });
    records.forEach(r => {
      if (empAbsences[r.employee_id]) {
        if (r.status === 'absent') empAbsences[r.employee_id].absences++;
        if (r.status === 'late') empAbsences[r.employee_id].tardies++;
        if (r.status === 'vacation') empAbsences[r.employee_id].vacations++;
        empAbsences[r.employee_id].overtimeHours += r.overtime_hours || 0;
        empAbsences[r.employee_id].totalDeductions += r.amount || 0;
      }
    });

    const employeeRanking = Object.entries(empAbsences)
      .map(([id, data]) => ({ employeeId: id, ...data }))
      .sort((a, b) => b.absences - a.absences);

    // Overtime summary
    const overtimeRecords = records.filter(r => r.overtime_hours > 0);
    const totalOvertimeHours = overtimeRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
    const totalOvertimePay = overtimeRecords.reduce((sum, r) => sum + (r.overtime_amount || 0), 0);

    // Disability summary
    const disabilityCounts: Record<string, number> = {};
    records.filter(r => r.disability_type).forEach(r => {
      disabilityCounts[r.disability_type] = (disabilityCounts[r.disability_type] || 0) + 1;
    });

    // Totals
    const totalDeductions = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalOvertimeIncome = records.reduce((sum, r) => sum + (r.overtime_amount || 0), 0);

    // Overall attendance rate
    const totalRecords = records.length;
    const presentLike = (statusCounts['present'] || 0) + (statusCounts['late'] || 0);
    const overallRate = totalRecords > 0 ? Math.round((presentLike / totalRecords) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalActiveEmployees,
        totalRecords,
        overallAttendanceRate: overallRate,
        presentCount: statusCounts['present'] || 0,
        absentCount: statusCounts['absent'] || 0,
        lateCount: statusCounts['late'] || 0,
        vacationCount: statusCounts['vacation'] || 0,
        overtimeCount: overtimeRecords.length,
        disabilityCount: Object.values(disabilityCounts).reduce((a, b) => a + b, 0),
        totalDeductions,
        totalOvertimeIncome,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        holidayCount: holidays.length,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      dailyTrend,
      employeeRanking,
      disabilityDistribution: Object.entries(disabilityCounts).map(([type, count]) => ({ type, count })),
      holidays: holidays.map(h => ({ date: h.date, name: h.name, type: h.type })),
      dateRange: { start, end },
    });
  } catch (error: any) {
    console.error('Attendance report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
