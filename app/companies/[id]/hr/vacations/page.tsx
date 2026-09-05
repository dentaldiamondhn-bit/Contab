'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Minus,
  Loader2,
  User,
  Briefcase
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  startDate: string;
  salary: number;
  status: string;
}

interface UsedDays {
  [empId: string]: number;
}

export default function VacationsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedDays, setUsedDays] = useState<UsedDays>({});

  useEffect(() => {
    fetchEmployees();
    const saved = localStorage.getItem(`vacation_used_${companyId}`);
    if (saved) setUsedDays(JSON.parse(saved));
  }, [companyId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/employees`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveUsedDays = (updated: UsedDays) => {
    setUsedDays(updated);
    localStorage.setItem(`vacation_used_${companyId}`, JSON.stringify(updated));
  };

  const calculateVacationDays = (startDate: string): number => {
    if (!startDate) return 0;
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

  const getYearsOfService = (startDate: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    return yearsDiff + (monthsDiff < 0 ? -1 : 0);
  };

  const useVacation = (empId: string, days: number) => {
    const currentUsed = usedDays[empId] || 0;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const totalDays = calculateVacationDays(emp.startDate);
    const newUsed = Math.max(0, Math.min(totalDays, currentUsed + days));
    saveUsedDays({ ...usedDays, [empId]: newUsed });
  };

  const allEmployees = employees;
  const activeEmployees = employees.filter(e => e.status === 'active');

  const totalAvailable = activeEmployees.reduce((sum, e) => {
    const total = calculateVacationDays(e.startDate);
    const used = usedDays[e.id] || 0;
    return sum + (total - used);
  }, 0);
  const totalUsed = activeEmployees.reduce((sum, e) => sum + (usedDays[e.id] || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Control de Vacaciones</h1>
          <p className="text-gray-500">{activeEmployees.length} empleados activos • {totalAvailable} días disponibles en total</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{allEmployees.length}</div>
              <div className="text-sm text-gray-500">Total Empleados</div>
            </div>
          </CardContent>
        </Card>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Cargando empleados...</span>
            </div>
          ) : allEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay empleados registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allEmployees.map((emp) => {
                const totalDays = calculateVacationDays(emp.startDate);
                const used = usedDays[emp.id] || 0;
                const available = totalDays - used;
                const percentage = totalDays > 0 ? (used / totalDays) * 100 : 0;
                const years = getYearsOfService(emp.startDate);
                const isActive = emp.status === 'active';

                return (
                  <div key={emp.id} className={`p-4 border rounded-lg ${!isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="font-medium">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{emp.position} • {emp.department}</div>
                        <div className="text-xs text-gray-400">
                          Antigüedad: {years} año{years !== 1 ? 's' : ''} • Ingreso: {emp.startDate || 'N/A'}
                          {!isActive && <span className="ml-2 text-orange-500 font-medium">({emp.status})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold ${available > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {available} días disponibles
                          </div>
                          <div className="text-sm text-gray-500">de {totalDays} días totales</div>
                        </div>
                        {isActive && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => useVacation(emp.id, -1)}
                              disabled={used <= 0}
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
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-gray-500">
                      <span>Usados: {used} días</span>
                      <span>{Math.round(percentage)}% utilizado</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
