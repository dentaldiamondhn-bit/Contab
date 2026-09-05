'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Minus
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  vacationDays: number;
  usedVacationDays: number;
  status: 'active' | 'inactive';
}

export default function VacationsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const empKey = `employees_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
  }, [companyId]);

  const saveEmployees = (data: Employee[]) => {
    localStorage.setItem(`employees_${companyId}`, JSON.stringify(data));
    setEmployees(data);
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  const calculateVacationDays = (startDate: string): number => {
    if (!startDate) return 15;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    const totalYears = yearsDiff + (monthsDiff < 0 ? -1 : 0);
    
    if (totalYears < 1) return 0;
    if (totalYears === 1) return 10;
    if (totalYears === 2) return 12;
    if (totalYears === 3) return 14;
    return Math.min(20, 14 + (totalYears - 3));
  };

  const useVacation = (empId: string, days: number) => {
    saveEmployees(employees.map(e => {
      if (e.id === empId) {
        const totalDays = calculateVacationDays(e.startDate);
        const available = totalDays - e.usedVacationDays;
        const newUsed = Math.max(0, Math.min(totalDays, e.usedVacationDays + days));
        return { ...e, usedVacationDays: newUsed };
      }
      return e;
    }));
  };

  const totalAvailable = activeEmployees.reduce((sum, e) => sum + (calculateVacationDays(e.startDate) - e.usedVacationDays), 0);
  const totalUsed = activeEmployees.reduce((sum, e) => sum + e.usedVacationDays, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Control de Vacaciones</h1>
          <p className="text-gray-500">{totalAvailable} días disponibles en total</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
              <div className="text-sm text-gray-500">Días Disponibles</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{totalUsed}</div>
              <div className="text-sm text-gray-500">Días Usados</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Vacations */}
      <Card>
        <CardHeader>
          <CardTitle>Vacaciones por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeEmployees.map((emp) => {
              const totalDays = calculateVacationDays(emp.startDate);
              const available = totalDays - emp.usedVacationDays;
              const percentage = totalDays > 0 ? (emp.usedVacationDays / totalDays) * 100 : 0;
              const years = Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              return (
                <div key={emp.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-500">{emp.position} • {emp.department}</div>
                      <div className="text-xs text-gray-400">Antigüedad: {years} año{years !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{available} días disponibles</div>
                        <div className="text-sm text-gray-500">de {totalDays} días totales</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => useVacation(emp.id, -1)}
                          disabled={emp.usedVacationDays <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => useVacation(emp.id, 1)}
                          disabled={available <= 0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>Usados: {emp.usedVacationDays} días</span>
                    <span>{Math.round(percentage)}% utilizado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
