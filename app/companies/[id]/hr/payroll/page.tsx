'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Download,
  DollarSign
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  status: 'active' | 'inactive';
}

export default function PayrollPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const empKey = `employees_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
  }, [companyId]);

  const activeEmployees = employees.filter(e => e.status === 'active');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculatePayroll = (salary: number) => {
    const igssEmployee = salary * 0.01;
    const ihss = salary * 0.025;
    const rap = salary * 0.005;
    const totalDeductions = igssEmployee + ihss + rap;
    const netPay = salary - totalDeductions;
    return { igssEmployee, ihss, rap, totalDeductions, netPay };
  };

  const totalBase = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const totalIgssEmployee = totalBase * 0.01;
  const totalIgssEmployer = totalBase * 0.024;
  const totalIhss = totalBase * 0.025;
  const totalRap = totalBase * 0.005;
  const totalDeductions = totalIgssEmployee + totalIhss + totalRap;
  const totalNetPay = totalBase - totalDeductions;

  const downloadCSV = () => {
    let csv = 'Nombre,Cargo,Departamento,Salario Base,IGSS Empleado,IHSS,RAP,Total Deducciones,Neto\n';
    activeEmployees.forEach(emp => {
      const calc = calculatePayroll(emp.salary);
      csv += `"${emp.name}","${emp.position}","${emp.department}",${emp.salary},${calc.igssEmployee.toFixed(2)},${calc.ihss.toFixed(2)},${calc.rap.toFixed(2)},${calc.totalDeductions.toFixed(2)},${calc.netPay.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,,${totalIgssEmployee.toFixed(2)},${totalIhss.toFixed(2)},${totalRap.toFixed(2)},${totalDeductions.toFixed(2)},${totalNetPay.toFixed(2)}\n`;
    csv += `\nIGSS Patronal (2.4%),,,,${totalIgssEmployer.toFixed(2)}\n`;
    csv += `Costo Total Empresa,,,,,${(totalBase + totalIgssEmployer).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nómina Mensual</h1>
          <p className="text-gray-500">Cálculo de nómina y deducciones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Descargar CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBase)}</div>
              <div className="text-sm text-gray-500">Salarios Brutos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
              <div className="text-sm text-gray-500">Total Deducciones</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalIgssEmployer)}</div>
              <div className="text-sm text-gray-500">IGSS Patronal</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalNetPay)}</div>
              <div className="text-sm text-gray-500">Total Neto a Pagar</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Empleado</th>
                  <th className="text-left py-2">Cargo</th>
                  <th className="text-right py-2">Salario Base</th>
                  <th className="text-right py-2">IGSS (1%)</th>
                  <th className="text-right py-2">IHSS (2.5%)</th>
                  <th className="text-right py-2">RAP (0.5%)</th>
                  <th className="text-right py-2">Deducciones</th>
                  <th className="text-right py-2">Neto</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map(emp => {
                  const calc = calculatePayroll(emp.salary);
                  return (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{emp.name}</td>
                      <td className="py-2 text-gray-500">{emp.position}</td>
                      <td className="py-2 text-right">{formatCurrency(emp.salary)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.igssEmployee)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.ihss)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.rap)}</td>
                      <td className="py-2 text-right text-red-600 font-medium">-{formatCurrency(calc.totalDeductions)}</td>
                      <td className="py-2 text-right text-green-600 font-bold">{formatCurrency(calc.netPay)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">TOTAL</td>
                  <td></td>
                  <td className="py-2 text-right">{formatCurrency(totalBase)}</td>
                  <td className="py-2 text-right text-red-600">-{formatCurrency(totalIgssEmployee)}</td>
                  <td className="py-2 text-right text-red-600">-{formatCurrency(totalIhss)}</td>
                  <td className="py-2 text-right text-red-600">-{formatCurrency(totalRap)}</td>
                  <td className="py-2 text-right text-red-600">-{formatCurrency(totalDeductions)}</td>
                  <td className="py-2 text-right text-green-600">{formatCurrency(totalNetPay)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
