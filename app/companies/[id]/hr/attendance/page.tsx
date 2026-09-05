'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  status: 'active' | 'inactive';
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'vacation' | 'sick';
}

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    const empKey = `employees_${companyId}`;
    const attKey = `attendance_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    const savedAtt = localStorage.getItem(attKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
    if (savedAtt) setAttendance(JSON.parse(savedAtt));
  };

  const recordAttendance = (employeeId: string, status: Attendance['status']) => {
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === selectedDate);
    const newAttendance: Attendance = {
      id: existing?.id || `att-${Date.now()}`,
      employeeId,
      date: selectedDate,
      checkIn: new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
      checkOut: '',
      status
    };
    const updated = existing 
      ? attendance.map(a => a.id === existing.id ? newAttendance : a)
      : [...attendance, newAttendance];
    localStorage.setItem(`attendance_${companyId}`, JSON.stringify(updated));
    setAttendance(updated);
  };

  const getAttendance = (employeeId: string) => {
    return attendance.find(a => a.employeeId === employeeId && a.date === selectedDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Presente';
      case 'absent': return 'Ausente';
      case 'late': return 'Tardanza';
      case 'vacation': return 'Vacaciones';
      case 'sick': return 'Enfermedad';
      default: return 'Sin registro';
    }
  };

  const todayStats = {
    present: attendance.filter(a => a.date === selectedDate && a.status === 'present').length,
    absent: attendance.filter(a => a.date === selectedDate && a.status === 'absent').length,
    late: attendance.filter(a => a.date === selectedDate && a.status === 'late').length,
    vacation: attendance.filter(a => a.date === selectedDate && a.status === 'vacation').length,
    sick: attendance.filter(a => a.date === selectedDate && a.status === 'sick').length
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Control de Asistencia</h1>
          <p className="text-gray-500">Registro diario de asistencia</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-medium">Fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{todayStats.present}</div>
            <div className="text-sm text-gray-500">Presentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{todayStats.absent}</div>
            <div className="text-sm text-gray-500">Ausentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">{todayStats.late}</div>
            <div className="text-sm text-gray-500">Tardanzas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{todayStats.vacation}</div>
            <div className="text-sm text-gray-500">Vacaciones</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{todayStats.sick}</div>
            <div className="text-sm text-gray-500">Enfermedad</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados - {new Date(selectedDate).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeEmployees.map((emp) => {
              const att = getAttendance(emp.id);
              return (
                <div key={emp.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-sm text-gray-500">{emp.position} • {emp.department}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {att && (
                      <Badge className={getStatusColor(att.status)}>
                        {getStatusLabel(att.status)}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={att?.status === 'present' ? 'default' : 'outline'}
                        onClick={() => recordAttendance(emp.id, 'present')}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={att?.status === 'absent' ? 'destructive' : 'outline'}
                        onClick={() => recordAttendance(emp.id, 'absent')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={att?.status === 'late' ? 'default' : 'outline'}
                        onClick={() => recordAttendance(emp.id, 'late')}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={att?.status === 'vacation' ? 'default' : 'outline'}
                        onClick={() => recordAttendance(emp.id, 'vacation')}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={att?.status === 'sick' ? 'default' : 'outline'}
                        onClick={() => recordAttendance(emp.id, 'sick')}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
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
