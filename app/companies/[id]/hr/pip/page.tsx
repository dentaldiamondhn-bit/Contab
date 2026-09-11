'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Plus, Pencil, Trash2, CheckCircle, XCircle, Clock,
  Target, FileText, Users, Calendar, TrendingUp, AlertTriangle,
  Eye, ChevronDown, ChevronUp, Save, X, BarChart3, Award
} from 'lucide-react'

interface PipGoal {
  id?: string
  title: string
  description: string
  metric: string
  targetValue: number
  currentValue: number
  unit: string
  dueDate: string
  status: string
  commitments?: string
}

interface PipEvaluation {
  id?: string
  pipPlanId: string
  goalId?: string
  evaluationDate: string
  score: number
  progressPct: number
  comments: string
  evaluator: string
}

interface PipPlan {
  id?: string
  tenantId: string
  employeeId: string
  title: string
  description: string
  status: string
  startDate: string
  endDate: string
  originalEndDate?: string
  createdBy: string
  reviewedBy?: string
  pip_goals?: any[]
  pip_evaluations?: any[]
  employees?: { first_name: string; last_name: string; employee_code: string }
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  employee_code: string
  department: string
  position: string
  status: string
  supervisor: string
  reportsTo: string
  salary: number
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-700', bg: 'bg-gray-100' },
  active: { label: 'Activo', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
  extended: { label: 'Extendido', color: 'text-yellow-700', bg: 'bg-yellow-100' },
}

const GOAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-gray-700', bg: 'bg-gray-100' },
  in_progress: { label: 'En Progreso', color: 'text-blue-700', bg: 'bg-blue-100' },
  met: { label: 'Cumplido', color: 'text-green-700', bg: 'bg-green-100' },
  not_met: { label: 'No Cumplido', color: 'text-red-700', bg: 'bg-red-100' },
  exceeded: { label: 'Superado', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const IMPROVEMENT_AREAS = [
  { id: 'puntualidad', title: 'Puntualidad y Asistencia', metric: 'asistencia', unit: 'porcentaje', description: 'Mejorar la puntualidad en las entradas y reducir ausencias injustificadas' },
  { id: 'calidad', title: 'Calidad del Trabajo', metric: 'calidad', unit: 'calificacion', description: 'Elevar la calidad y precisión de las tareas asignadas' },
  { id: 'comunicacion', title: 'Comunicación', metric: 'comunicacion', unit: 'calificacion', description: 'Mejorar la comunicación oral y escrita con el equipo y clientes' },
  { id: 'equipo', title: 'Trabajo en Equipo', metric: 'colaboracion', unit: 'calificacion', description: 'Fomentar la colaboración y el trabajo coordinado con compañeros' },
  { id: 'productividad', title: 'Productividad', metric: 'productividad', unit: 'porcentaje', description: 'Incrementar la cantidad y eficiencia de las tareas completadas' },
  { id: 'liderazgo', title: 'Liderazgo', metric: 'liderazgo', unit: 'calificacion', description: 'Desarrollar habilidades de guía, motivación y toma de decisiones' },
  { id: 'normas', title: 'Cumplimiento de Normas', metric: 'cumplimiento', unit: 'porcentaje', description: 'Respetar y aplicar las políticas y procedimientos de la empresa' },
  { id: 'tecnicas', title: 'Habilidades Técnicas', metric: 'habilidades', unit: 'calificacion', description: 'Fortalecer conocimientos y destrezas técnicas del puesto' },
  { id: 'clientes', title: 'Atención al Cliente', metric: 'servicio', unit: 'calificacion', description: 'Mejorar la experiencia y satisfacción del cliente' },
  { id: 'iniciativa', title: 'Iniciativa y Proactividad', metric: 'iniciativa', unit: 'calificacion', description: 'Tomar acción sin esperar instrucciones, proponer mejoras' },
  { id: 'organizacion', title: 'Organización y Orden', metric: 'organizacion', unit: 'calificacion', description: 'Mantener el área de trabajo y tareas debidamente organizadas' },
  { id: 'adaptabilidad', title: 'Adaptabilidad al Cambio', metric: 'adaptabilidad', unit: 'calificacion', description: 'Capacidad para ajustarse a nuevas situaciones, herramientas o procesos' },
]

export default function PipPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [plans, setPlans] = useState<PipPlan[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PipPlan | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail' | 'evaluate' | 'edit'>('list')
  const [activeTab, setActiveTab] = useState<'plans' | 'stats'>('plans')
  const [selectedAreaStats, setSelectedAreaStats] = useState<{ title: string; employees: { name: string; id: string }[]; plans: string[] } | null>(null)
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('all')
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' })
  const [checkedGoals, setCheckedGoals] = useState<Record<string, boolean>>({})
  const [goalComments, setGoalComments] = useState<Record<string, string>>({})
  const [goalCommentHistory, setGoalCommentHistory] = useState<Record<string, { text: string; date: string }[]>>({})
  const [showCustomArea, setShowCustomArea] = useState(false)
  const [customArea, setCustomArea] = useState({ title: '', description: '', metric: '', unit: 'calificacion' })
  const [selectedArea, setSelectedArea] = useState<{ title: string; description: string; metric: string; unit: string } | null>(null)
  const [areaObservations, setAreaObservations] = useState('')
  const [areaCommitments, setAreaCommitments] = useState('')

  const [form, setForm] = useState({
    employeeId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    observations: '',
    commitments: '',
    goals: [] as PipGoal[],
  })

  const [evalForm, setEvalForm] = useState({
    goalId: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    score: 50,
    progressPct: 0,
    comments: '',
    evaluator: '',
  })

  useEffect(() => {
    fetchData()
  }, [companyId])

  async function fetchData() {
    try {
      const [plansRes, empRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr/pip`, { headers: { 'x-tenant-id': companyId } }),
        fetch(`/api/companies/${companyId}/employees`, { headers: { 'x-tenant-id': companyId } }),
      ])
      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(Array.isArray(plansData) ? plansData : [])
      }
      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(Array.isArray(empData) ? empData.map((e: any) => ({
          id: e.id,
          first_name: e.first_name || e.firstName || '',
          last_name: e.last_name || e.lastName || '',
          employee_code: e.employee_code || e.employeeId || '',
          department: e.department || '',
          position: e.position || '',
          status: e.status || 'active',
          supervisor: e.supervisor || '',
          reportsTo: e.reportsTo || '',
          salary: e.salary || 0,
        })) : [])
      }
    } catch (e) {
      console.error('Error fetching PIP data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePlan() {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/pip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({
          employeeId: form.employeeId,
          title: form.title,
          description: form.description,
          startDate: form.startDate,
          endDate: form.endDate,
          observations: form.observations,
          commitments: form.commitments,
          status: 'active',
          goals: form.goals.map(g => ({
            title: g.title,
            description: g.description,
            metric: g.metric,
            targetValue: g.targetValue,
            currentValue: g.currentValue,
            unit: g.unit,
            dueDate: g.dueDate,
            commitments: g.commitments,
          })),
          createdBy: 'Sistema',
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setViewMode('list')
        setForm({ employeeId: '', title: '', description: '', startDate: '', endDate: '', goals: [] })
        fetchData()
      }
    } catch (e) {
      console.error('Error creating plan:', e)
    }
  }

  async function handleUpdatePlanStatus(planId: string, status: string) {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/pip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({ id: planId, status }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchData()
      } else {
        console.error('Error activating plan:', data)
        alert('Error: ' + (data.error || 'No se pudo actualizar'))
      }
    } catch (e) {
      console.error('Error updating plan:', e)
    }
  }

  async function handleUpdatePlan() {
    if (!selectedPlan) return
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/pip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({
          id: selectedPlan.id,
          title: form.title,
          description: form.description,
          startDate: form.startDate,
          endDate: form.endDate,
          observations: form.observations,
          commitments: form.commitments,
          goals: form.goals.map(g => ({
            id: g.id,
            title: g.title,
            description: g.description,
            metric: g.metric,
            targetValue: g.targetValue,
            currentValue: g.currentValue,
            unit: g.unit,
            dueDate: g.dueDate,
            status: g.status,
            commitments: g.commitments,
          })),
        }),
      })
      if (res.ok) {
        setViewMode('detail')
        fetchData()
      }
    } catch (e) {
      console.error('Error updating plan:', e)
    }
  }

  async function handleAddEvaluation() {
    if (!selectedPlan) return
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/pip/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({
          pipPlanId: selectedPlan.id,
          goalId: evalForm.goalId || null,
          evaluationDate: evalForm.evaluationDate,
          score: evalForm.score,
          progressPct: evalForm.progressPct,
          comments: evalForm.comments,
          evaluator: evalForm.evaluator,
        }),
      })
      if (res.ok) {
        setShowEvalForm(false)
        setEvalForm({ goalId: '', evaluationDate: new Date().toISOString().split('T')[0], score: 50, progressPct: 0, comments: '', evaluator: '' })
        fetchData()
      }
    } catch (e) {
      console.error('Error adding evaluation:', e)
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm('¿Eliminar este plan PIP?')) return
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/pip?planId=${planId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': companyId },
      })
      if (res.ok) {
        setSelectedPlan(null)
        setViewMode('list')
        fetchData()
      }
    } catch (e) {
      console.error('Error deleting plan:', e)
    }
  }

  function addGoal() {
    setForm(prev => ({
      ...prev,
      goals: [...prev.goals, { title: '', description: '', metric: '', targetValue: 100, currentValue: 0, unit: 'porcentaje', dueDate: prev.endDate, status: 'pending' }],
    }))
  }

  function updateGoal(index: number, field: string, value: any) {
    setForm(prev => ({
      ...prev,
      goals: prev.goals.map((g, i) => i === index ? { ...g, [field]: value } : g),
    }))
  }

  function removeGoal(index: number) {
    setForm(prev => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }))
  }

  function getEmployeeName(employeeId: string) {
    const emp = employees.find(e => e.id === employeeId)
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Sin empleado'
  }

  function getOverallProgress(plan: PipPlan) {
    if (!plan.pip_goals?.length) return 0
    const total = plan.pip_goals.reduce((sum, g: any) => sum + (g.targetValue || g.target_value || 1), 0)
    const current = plan.pip_goals.reduce((sum, g: any) => sum + (g.currentValue || g.current_value || 0), 0)
    return total > 0 ? Math.round((current / total) * 100) : 0
  }

  function getDaysRemaining(endDate: string) {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const activePlans = plans.filter(p => p.status === 'active')
  const draftPlans = plans.filter(p => p.status === 'draft')
  const completedPlans = plans.filter(p => p.status === 'completed')
  const displayedPlans = plans.filter(p => {
    if (filterEmployeeId && p.employeeId !== filterEmployeeId) return false
    if (timeFilter !== 'all') {
      const start = new Date(p.startDate)
      const now = new Date()
      if (timeFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        if (start < monthStart) return false
      } else if (timeFilter === 'quarter') {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        if (start < qStart) return false
      } else if (timeFilter === 'year') {
        const yStart = new Date(now.getFullYear(), 0, 1)
        if (start < yStart) return false
      } else if (timeFilter === 'custom' && customDateRange.from) {
        if (start < new Date(customDateRange.from)) return false
      }
    }
    return true
  })
  const filterEmployeeName = filterEmployeeId ? getEmployeeName(filterEmployeeId) : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando planes PIP...</div>
        </div>
      </div>
    )
  }

  if (viewMode === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => { setViewMode('list'); setShowForm(false) }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Nuevo Plan PIP</h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Empleado</label>
                  <select className="w-full border rounded-md px-3 py-2" value={form.employeeId}
                    onChange={e => setForm(prev => ({ ...prev, employeeId: e.target.value }))}>
                    <option value="">Seleccionar empleado...</option>
                    {employees.filter(e => e.status === 'active' || e.status === 'activo').map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.department || 'Sin depto'} ({emp.employee_code})</option>
                    ))}
                  </select>
                  {form.employeeId && (() => {
                    const emp = employees.find(e => e.id === form.employeeId)
                    if (!emp) return null
                    return (
                      <div className="mt-2 bg-gray-50 border rounded-md p-3 text-sm space-y-1">
                        <div className="font-medium text-gray-700">{emp.first_name} {emp.last_name}</div>
                        <div className="text-gray-500">Código: {emp.employee_code}</div>
                        <div className="text-gray-500">Departamento: {emp.department || 'N/A'}</div>
                        <div className="text-gray-500">Puesto: {emp.position || 'N/A'}</div>
                        {emp.supervisor && (
                          <div className="text-cyan-700 font-medium">Supervisor: {emp.supervisor}</div>
                        )}
                        {!emp.supervisor && emp.reportsTo && (
                          <div className="text-cyan-700 font-medium">Jefe Directo: {emp.reportsTo}</div>
                        )}
                        {!emp.supervisor && !emp.reportsTo && (
                          <div className="text-gray-400 italic">Sin supervisor asignado</div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Título del Plan</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2" value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Plan de Mejoramiento - Desempeño" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Objetivo general del plan de mejoramiento..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2" value={form.startDate}
                    onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2" value={form.endDate}
                    onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Observaciones Generales</label>
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={3}
                    placeholder="Observaciones sobre el desempeño del empleado..."
                    value={form.observations}
                    onChange={e => setForm(prev => ({ ...prev, observations: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Compromisos del Empleado</label>
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={3}
                    placeholder="Compromisos que asume el empleado..."
                    value={form.commitments}
                    onChange={e => setForm(prev => ({ ...prev, commitments: e.target.value }))} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" /> Áreas a Mejorar (clic para agregar como meta)
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {IMPROVEMENT_AREAS.map(area => {
                    const alreadyAdded = form.goals.some(g => g.metric === area.metric)
                    return (
                      <button key={area.id} type="button"
                        disabled={alreadyAdded}
                        onClick={() => { setSelectedArea(area) }}
                        className={`text-left border rounded-md p-2 text-sm transition-colors ${
                          alreadyAdded
                            ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                            : 'bg-white border-gray-200 hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer'
                        }`}>
                        <div className="font-medium flex items-center gap-1">
                          {alreadyAdded && <CheckCircle className="h-3 w-3" />}
                          {area.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{area.description}</div>
                      </button>
                    )
                  })}
                </div>

                {selectedArea && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-md p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-cyan-800">{selectedArea.title}</h4>
                      <button onClick={() => { setSelectedArea(null); setAreaObservations('') }} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{selectedArea.description}</p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del área</label>
                      <p className="text-sm text-gray-700">{selectedArea.description}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Las observaciones y compromisos se toman de los campos principales del formulario.</p>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedArea(null) }}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => {
                        const descParts = [form.observations || selectedArea.description]
                        if (form.commitments) descParts.push(`Compromisos: ${form.commitments}`)
                        setForm(prev => ({
                          ...prev,
                          goals: [...prev.goals, {
                            title: selectedArea.title,
                            description: descParts.join('. '),
                            metric: selectedArea.metric,
                            targetValue: 100,
                            currentValue: 0,
                            unit: selectedArea.unit,
                            dueDate: prev.endDate,
                            status: 'pending',
                            commitments: form.commitments,
                          }],
                        }))
                        setSelectedArea(null)
                      }}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {showCustomArea ? (
                  <div className="bg-gray-50 border rounded-md p-3 mb-2">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Nombre del área"
                        value={customArea.title} onChange={e => setCustomArea(p => ({ ...p, title: e.target.value }))} />
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Descripción"
                        value={customArea.description} onChange={e => setCustomArea(p => ({ ...p, description: e.target.value }))} />
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Métrica (ej: eficiencia)"
                        value={customArea.metric} onChange={e => setCustomArea(p => ({ ...p, metric: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="border rounded px-2 py-1 text-sm" value={customArea.unit}
                        onChange={e => setCustomArea(p => ({ ...p, unit: e.target.value }))}>
                        <option value="calificacion">Calificación (0-100)</option>
                        <option value="porcentaje">Porcentaje</option>
                        <option value="dias">Días</option>
                        <option value="horas">Horas</option>
                        <option value="unidades">Unidades</option>
                      </select>
                      <Button size="sm" onClick={() => {
                        if (!customArea.title || !customArea.metric) return
                        setForm(prev => ({
                          ...prev,
                          goals: [...prev.goals, {
                            title: customArea.title,
                            description: customArea.description,
                            metric: customArea.metric,
                            targetValue: 100,
                            currentValue: 0,
                            unit: customArea.unit,
                            dueDate: prev.endDate,
                            status: 'pending',
                          }],
                        }))
                        setCustomArea({ title: '', description: '', metric: '', unit: 'calificacion' })
                        setShowCustomArea(false)
                      }}>
                        <Save className="h-3 w-3 mr-1" /> Agregar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowCustomArea(false); setCustomArea({ title: '', description: '', metric: '', unit: 'calificacion' }) }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowCustomArea(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar Área Personalizada
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" /> Metas / Objetivos
                  </h3>
                  <Button size="sm" onClick={addGoal}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar Meta
                  </Button>
                </div>

                {form.goals.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No hay metas definidas. Haga clic en "Agregar Meta" para comenzar.</p>
                )}

                {form.goals.map((goal, idx) => (
                  <div key={idx} className="bg-gray-50 border rounded-md p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Meta {idx + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeGoal(idx)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Título</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.title}
                          onChange={e => updateGoal(idx, 'title', e.target.value)} placeholder="Título de la meta" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Métrica</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.metric}
                          onChange={e => updateGoal(idx, 'metric', e.target.value)} placeholder="Ej: asistencia, ventas, calidad" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor Objetivo</label>
                        <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={goal.targetValue}
                          onChange={e => updateGoal(idx, 'targetValue', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                        <select className="w-full border rounded px-2 py-1 text-sm" value={goal.unit}
                          onChange={e => updateGoal(idx, 'unit', e.target.value)}>
                          <option value="porcentaje">Porcentaje</option>
                          <option value="dias">Días</option>
                          <option value="horas">Horas</option>
                          <option value="unidades">Unidades</option>
                          <option value="calificacion">Calificación (0-100)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Fecha Límite</label>
                        <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={goal.dueDate}
                          onChange={e => updateGoal(idx, 'dueDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Descripción</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.description}
                          onChange={e => updateGoal(idx, 'description', e.target.value)} placeholder="Descripción de la meta" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setViewMode('list'); setShowForm(false) }}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleCreatePlan}
                  disabled={!form.employeeId || !form.title || !form.startDate || !form.endDate}>
                  <Save className="h-4 w-4 mr-1" /> Crear Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (viewMode === 'edit' && selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => { setViewMode('detail') }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Editar Plan PIP</h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Empleado</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2 bg-gray-100" disabled
                    value={getEmployeeName(form.employeeId)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Título del Plan</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2" value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2" value={form.startDate}
                    onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2" value={form.endDate}
                    onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Observaciones Generales</label>
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={3}
                    placeholder="Observaciones sobre el desempeño del empleado..."
                    value={form.observations}
                    onChange={e => setForm(prev => ({ ...prev, observations: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Compromisos del Empleado</label>
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={3}
                    placeholder="Compromisos que asume el empleado..."
                    value={form.commitments}
                    onChange={e => setForm(prev => ({ ...prev, commitments: e.target.value }))} />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" /> Metas / Objetivos ({form.goals.length})
                  </h3>
                  <Button size="sm" onClick={addGoal}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar Meta
                  </Button>
                </div>

                {form.goals.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No hay metas definidas.</p>
                )}

                {form.goals.map((goal, idx) => (
                  <div key={idx} className="bg-gray-50 border rounded-md p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Meta {idx + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeGoal(idx)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Título</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.title}
                          onChange={e => updateGoal(idx, 'title', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Métrica</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.metric}
                          onChange={e => updateGoal(idx, 'metric', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor Objetivo</label>
                        <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={goal.targetValue}
                          onChange={e => updateGoal(idx, 'targetValue', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Progreso Actual</label>
                        <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={goal.currentValue}
                          onChange={e => updateGoal(idx, 'currentValue', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                        <select className="w-full border rounded px-2 py-1 text-sm" value={goal.unit}
                          onChange={e => updateGoal(idx, 'unit', e.target.value)}>
                          <option value="porcentaje">Porcentaje</option>
                          <option value="dias">Días</option>
                          <option value="horas">Horas</option>
                          <option value="unidades">Unidades</option>
                          <option value="calificacion">Calificación (0-100)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Fecha Límite</label>
                        <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={goal.dueDate}
                          onChange={e => updateGoal(idx, 'dueDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Descripción</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.description}
                          onChange={e => updateGoal(idx, 'description', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Compromisos</label>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={goal.commitments || ''}
                          onChange={e => updateGoal(idx, 'commitments', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setViewMode('detail') }}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleUpdatePlan}
                  disabled={!form.title || !form.startDate || !form.endDate}>
                  <Save className="h-4 w-4 mr-1" /> Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (viewMode === 'detail' && selectedPlan) {
    const progress = getOverallProgress(selectedPlan)
    const daysLeft = getDaysRemaining(selectedPlan.endDate)
    const statusInfo = STATUS_MAP[selectedPlan.status] || STATUS_MAP.draft
    const evaluations = selectedPlan.pip_evaluations || []
    const goals = selectedPlan.pip_goals || []

    // Populate comment history from evaluations if not already done
    if (evaluations.length > 0 && Object.keys(goalCommentHistory).length === 0) {
      const history: Record<string, { text: string; date: string }[]> = {}
      evaluations.forEach((ev: any) => {
        if (ev.goalId || ev.goal_id) {
          const gid = ev.goalId || ev.goal_id
          if (!history[gid]) history[gid] = []
          history[gid].push({
            text: ev.comments || ev.comment || '',
            date: new Date(ev.evaluationDate || ev.evaluation_date).toLocaleString('es-HN'),
          })
        }
      })
      if (Object.keys(history).length > 0) {
        setTimeout(() => setGoalCommentHistory(history), 0)
      }
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setViewMode('list'); setSelectedPlan(null) }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedPlan.title}</h1>
                <p className="text-sm text-gray-500">
                  {getEmployeeName(selectedPlan.employeeId)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.label}</Badge>
              {(selectedPlan.status === 'draft' || selectedPlan.status === 'active') && (
                <Button size="sm" variant="outline" onClick={() => {
                  setForm({
                    employeeId: selectedPlan.employeeId,
                    title: selectedPlan.title,
                    description: selectedPlan.description,
                    startDate: selectedPlan.startDate,
                    endDate: selectedPlan.endDate,
                    observations: (selectedPlan as any).observations || '',
                    commitments: (selectedPlan as any).commitments || '',
                    goals: (selectedPlan.pip_goals || []).map((g: any) => ({
                      id: g.id,
                      title: g.title,
                      description: g.description || '',
                      metric: g.metric,
                      targetValue: g.targetValue || g.target_value || 100,
                      currentValue: g.currentValue || g.current_value || 0,
                      unit: g.unit || 'porcentaje',
                      dueDate: g.dueDate || g.due_date || '',
                      status: g.status || 'pending',
                      commitments: g.commitments || '',
                    })),
                  })
                  setViewMode('edit')
                }}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
              {selectedPlan.status === 'draft' && (
                <Button size="sm" onClick={() => handleUpdatePlanStatus(selectedPlan.id!, 'active')}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Activar
                </Button>
              )}
              {selectedPlan.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleUpdatePlanStatus(selectedPlan.id!, 'completed')}>
                    <Award className="h-3 w-3 mr-1" /> Completar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleUpdatePlanStatus(selectedPlan.id!, 'extended')}>
                    <Clock className="h-3 w-3 mr-1" /> Extender
                  </Button>
                </>
              )}
              <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(selectedPlan.id!)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                <div className="text-xs text-gray-500">Progreso General</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d vencido` : `${daysLeft}d restantes`}
                </div>
                <div className="text-xs text-gray-500">Tiempo</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{goals.length}</div>
                <div className="text-xs text-gray-500">Metas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{evaluations.length}</div>
                <div className="text-xs text-gray-500">Evaluaciones</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Descripción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{selectedPlan.description || 'Sin descripción'}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>Inicio: {new Date(selectedPlan.startDate).toLocaleDateString('es-HN')}</span>
                <span>Fin: {new Date(selectedPlan.endDate).toLocaleDateString('es-HN')}</span>
                <span>Creado por: {selectedPlan.createdBy}</span>
              </div>
              {(selectedPlan as any).observations && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <span className="text-xs font-medium text-yellow-700">Observaciones:</span>
                  <p className="text-sm text-yellow-800">{(selectedPlan as any).observations}</p>
                </div>
              )}
              {(selectedPlan as any).commitments && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <span className="text-xs font-medium text-blue-700">Compromisos del Empleado:</span>
                  <p className="text-sm text-blue-800">{(selectedPlan as any).commitments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Metas ({goals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-sm text-gray-500">No hay metas definidas.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g: any) => {
                    const goalId = g.id || g.title
                    const isChecked = checkedGoals[goalId] || g.status === 'met'
                    const comment = goalComments[goalId] || ''
                    return (
                      <div key={g.id} className={`border rounded-md p-4 transition-colors ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                            checked={isChecked}
                            onChange={e => setCheckedGoals(prev => ({ ...prev, [goalId]: e.target.checked }))} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isChecked ? 'line-through text-gray-500' : ''}`}>{g.title}</span>
                                <span className="text-xs text-gray-400">({g.metric})</span>
                              </div>
                              {isChecked && <Badge className="bg-green-100 text-green-700">Cumplido</Badge>}
                              {!isChecked && <Badge className={`${GOAL_STATUS[g.status]?.bg || 'bg-gray-100'} ${GOAL_STATUS[g.status]?.color || 'text-gray-700'}`}>{GOAL_STATUS[g.status]?.label || 'Pendiente'}</Badge>}
                            </div>
                            {g.description && <p className="text-sm text-gray-600 mt-1">{g.description}</p>}
                            {g.commitments && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                                <span className="text-xs font-medium text-blue-700">Compromisos:</span>
                                <p className="text-sm text-blue-800">{g.commitments}</p>
                              </div>
                            )}
                            {isChecked && (
                              <div className="mt-3 bg-white border border-green-200 rounded-md p-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Comentarios de cierre</label>
                                {goalCommentHistory[goalId]?.length > 0 && (
                                  <div className="space-y-1 mb-2">
                                    {goalCommentHistory[goalId].map((c, i) => (
                                      <div key={i} className="flex items-start gap-2 text-sm bg-gray-50 border rounded px-2 py-1">
                                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                        <div>
                                          <span className="text-gray-700">{c.text}</span>
                                          <span className="text-xs text-gray-400 ml-2">{c.date}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <textarea className="w-full border rounded px-2 py-1 text-sm" rows={2}
                                  placeholder="Agregar un comentario..."
                                  value={comment}
                                  onChange={e => setGoalComments(prev => ({ ...prev, [goalId]: e.target.value }))} />
                                <Button size="sm" className="mt-2" onClick={async () => {
                                  if (!comment.trim()) return
                                  try {
                                    const res = await fetch(`/api/companies/${companyId}/hr/pip/evaluations`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
                                      body: JSON.stringify({
                                        pipPlanId: selectedPlan.id,
                                        goalId: g.id,
                                        evaluationDate: new Date().toISOString().split('T')[0],
                                        score: 100,
                                        progressPct: 100,
                                        comments: comment,
                                        evaluator: 'Sistema',
                                      }),
                                    })
                                    const data = await res.json()
                                    if (res.ok) {
                                      const now = new Date().toLocaleString('es-HN')
                                      setGoalCommentHistory(prev => ({
                                        ...prev,
                                        [goalId]: [...(prev[goalId] || []), { text: comment, date: now }],
                                      }))
                                      setGoalComments(prev => ({ ...prev, [goalId]: '' }))
                                    } else {
                                      console.error('Error saving comment:', data)
                                      alert('Error: ' + (data.error || 'No se pudo guardar'))
                                    }
                                  } catch (e) {
                                    console.error('Error saving evaluation:', e)
                                  }
                                }}>
                                  <Save className="h-3 w-3 mr-1" /> Agregar Comentario
                                </Button>
                              </div>
                            )}
                            {!isChecked && (
                              <div className="flex items-center gap-4 text-sm mt-2">
                                <span className="text-gray-500">Progreso: {g.currentValue || g.current_value || 0} / {g.targetValue || g.target_value || 1} {g.unit}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(((g.currentValue || g.current_value || 0) / (g.targetValue || g.target_value || 1)) * 100, 100)}%` }} />
                                </div>
                                <span className="text-gray-500">Vence: {g.dueDate || g.due_date ? new Date(g.dueDate || g.due_date).toLocaleDateString('es-HN') : 'N/A'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Evaluaciones ({evaluations.length})
                </CardTitle>
                {selectedPlan.status === 'active' && (
                  <Button size="sm" onClick={() => setShowEvalForm(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Nueva Evaluación
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showEvalForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <h4 className="font-medium mb-3">Nueva Evaluación</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Meta (opcional)</label>
                      <select className="w-full border rounded px-2 py-1 text-sm" value={evalForm.goalId}
                        onChange={e => setEvalForm(prev => ({ ...prev, goalId: e.target.value }))}>
                        <option value="">Evaluación general</option>
                        {goals.map((g: any) => (
                          <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fecha</label>
                      <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={evalForm.evaluationDate}
                        onChange={e => setEvalForm(prev => ({ ...prev, evaluationDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Calificación (0-100)</label>
                      <input type="number" min="0" max="100" className="w-full border rounded px-2 py-1 text-sm" value={evalForm.score}
                        onChange={e => setEvalForm(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Progreso (%)</label>
                      <input type="number" min="0" max="100" className="w-full border rounded px-2 py-1 text-sm" value={evalForm.progressPct}
                        onChange={e => setEvalForm(prev => ({ ...prev, progressPct: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Evaluador</label>
                      <input type="text" className="w-full border rounded px-2 py-1 text-sm" value={evalForm.evaluator}
                        onChange={e => setEvalForm(prev => ({ ...prev, evaluator: e.target.value }))} placeholder="Nombre del evaluador" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Comentarios</label>
                      <input type="text" className="w-full border rounded px-2 py-1 text-sm" value={evalForm.comments}
                        onChange={e => setEvalForm(prev => ({ ...prev, comments: e.target.value }))} placeholder="Observaciones..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setShowEvalForm(false)}>
                      <X className="h-3 w-3 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddEvaluation}
                      disabled={!evalForm.evaluator}>
                      <Save className="h-3 w-3 mr-1" /> Guardar
                    </Button>
                  </div>
                </div>
              )}

              {evaluations.length === 0 ? (
                <p className="text-sm text-gray-500">No hay evaluaciones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {evaluations.map((ev: any) => (
                    <div key={ev.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-bold ${ev.score >= 70 ? 'text-green-600' : ev.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {ev.score}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {ev.pip_goals?.title || 'Evaluación General'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(ev.evaluationDate || ev.evaluation_date).toLocaleDateString('es-HN')} • {ev.evaluator}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">Progreso: <strong>{ev.progressPct || ev.progress_pct}%</strong></div>
                          {ev.comments && <div className="text-xs text-gray-500 max-w-xs truncate">{ev.comments}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Planes de Mejoramiento (PIP)</h1>
          </div>
          <Button onClick={() => { setViewMode('create'); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Plan
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{activePlans.length}</div>
              <div className="text-xs text-gray-500">Planes Activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{draftPlans.length}</div>
              <div className="text-xs text-gray-500">Borradores</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedPlans.length}</div>
              <div className="text-xs text-gray-500">Completados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {activePlans.filter(p => getDaysRemaining(p.endDate) < 7 && getDaysRemaining(p.endDate) >= 0).length}
              </div>
              <div className="text-xs text-gray-500">Por Vencer (7d)</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-1 mb-6 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'plans' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('plans')}>
            <Target className="h-4 w-4 inline mr-1" /> Planes
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stats' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('stats')}>
            <BarChart3 className="h-4 w-4 inline mr-1" /> Estadísticas por Área
          </button>
        </div>

        {activeTab === 'stats' ? (() => {
          const filteredPlans = plans.filter(p => {
            if (timeFilter !== 'all') {
              const start = new Date(p.startDate)
              const now = new Date()
              if (timeFilter === 'month') {
                return start >= new Date(now.getFullYear(), now.getMonth(), 1)
              } else if (timeFilter === 'quarter') {
                return start >= new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
              } else if (timeFilter === 'year') {
                return start >= new Date(now.getFullYear(), 0, 1)
              } else if (timeFilter === 'custom' && customDateRange.from) {
                const from = new Date(customDateRange.from)
                const to = customDateRange.to ? new Date(customDateRange.to) : new Date()
                return start >= from && start <= to
              }
            }
            return true
          })
          const areaCounts: Record<string, { title: string; count: number; met: number; inProgress: number; pending: number; employees: Record<string, { name: string; id: string }>; planIds: Set<string> }> = {}
          filteredPlans.forEach(plan => {
            const empName = getEmployeeName(plan.employeeId)
            ;(plan.pip_goals || []).forEach((g: any) => {
              const key = g.title || g.metric || 'Sin área'
              if (!areaCounts[key]) areaCounts[key] = { title: key, count: 0, met: 0, inProgress: 0, pending: 0, employees: {}, planIds: new Set() }
              areaCounts[key].count++
              if (plan.employeeId) areaCounts[key].employees[plan.employeeId] = { name: empName, id: plan.employeeId }
              areaCounts[key].planIds.add(plan.id)
              if (g.status === 'met') areaCounts[key].met++
              else if (g.status === 'in_progress') areaCounts[key].inProgress++
              else areaCounts[key].pending++
            })
          })
          const sorted = Object.values(areaCounts).sort((a, b) => b.count - a.count)
          const maxCount = Math.max(...sorted.map(a => a.count), 1)

          return (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Frecuencia de Áreas de Mejoramiento
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={timeFilter}
                        onChange={e => setTimeFilter(e.target.value as typeof timeFilter)}>
                        <option value="all">Todo el tiempo</option>
                        <option value="month">Este mes</option>
                        <option value="quarter">Este trimestre</option>
                        <option value="year">Este año</option>
                        <option value="custom">Rango personalizado</option>
                      </select>
                      {timeFilter === 'custom' && (
                        <>
                          <input type="date" className="border rounded px-2 py-1 text-sm" value={customDateRange.from}
                            onChange={e => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))} />
                          <input type="date" className="border rounded px-2 py-1 text-sm" value={customDateRange.to}
                            onChange={e => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))} />
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {sorted.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No hay metas registradas en ningún plan.</p>
                  ) : (
                    <div className="space-y-3">
                      {sorted.map((area, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <button
                            className="w-48 text-sm font-medium text-cyan-600 hover:text-cyan-800 hover:underline truncate text-left cursor-pointer"
                            title={`${area.title} — click para ver empleados`}
                            onClick={() => setSelectedAreaStats({ title: area.title, employees: Object.values(area.employees), plans: Array.from(area.planIds) })}>
                            {area.title}
                          </button>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                            <div className="bg-cyan-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                              style={{ width: `${(area.count / maxCount) * 100}%` }}>
                              <span className="text-xs font-bold text-white">{area.count}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600" title="Cumplidas">{area.met}✓</span>
                            <span className="text-blue-600" title="En progreso">{area.inProgress}⟳</span>
                            <span className="text-gray-400" title="Pendientes">{area.pending}○</span>
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 pt-3 border-t">
                        <div className="text-sm text-gray-500">
                          Total de metas: <strong>{sorted.reduce((s, a) => s + a.count, 0)}</strong> en{' '}
                          <strong>{filteredPlans.length}</strong> planes
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedAreaStats && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedAreaStats(null)}>
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" /> {selectedAreaStats.title}
                      </h3>
                      <button onClick={() => setSelectedAreaStats(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {selectedAreaStats.employees.length} empleado(s) con PIP en esta área
                    </p>
                    <div className="space-y-2">
                      {selectedAreaStats.employees.map((emp, i) => (
                        <button key={i}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-cyan-50 hover:ring-1 hover:ring-cyan-200 w-full text-left transition-colors"
                          onClick={() => { setFilterEmployeeId(emp.id); setActiveTab('plans'); setSelectedAreaStats(null) }}>
                          <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm font-bold shrink-0">
                            {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                          <span className="ml-auto text-xs text-cyan-500">Ver PIP →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        })() : (
          <>
          {(filterEmployeeId || timeFilter !== 'all') && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex-wrap">
              {filterEmployeeId && (
                <>
                  <Users className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm text-cyan-700">Empleado: <strong>{filterEmployeeName}</strong></span>
                  <Button variant="ghost" size="sm" className="text-cyan-600" onClick={() => setFilterEmployeeId(null)}>
                    <X className="h-3 w-3 mr-1" /> Quitar
                  </Button>
                </>
              )}
              {timeFilter !== 'all' && (
                <>
                  <span className="text-cyan-300">|</span>
                  <Clock className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm text-cyan-700">
                    {timeFilter === 'month' ? 'Este mes' : timeFilter === 'quarter' ? 'Este trimestre' : timeFilter === 'year' ? 'Este año' : `Desde ${customDateRange.from}${customDateRange.to ? ' hasta ' + customDateRange.to : ''}`}
                  </span>
                  <Button variant="ghost" size="sm" className="text-cyan-600" onClick={() => { setTimeFilter('all'); setCustomDateRange({ from: '', to: '' }) }}>
                    <X className="h-3 w-3 mr-1" /> Quitar
                  </Button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <select className="border rounded-md px-2 py-1 text-sm" value={timeFilter}
                  onChange={e => setTimeFilter(e.target.value as typeof timeFilter)}>
                  <option value="all">Todo el tiempo</option>
                  <option value="month">Este mes</option>
                  <option value="quarter">Este trimestre</option>
                  <option value="year">Este año</option>
                  <option value="custom">Rango personalizado</option>
                </select>
                {timeFilter === 'custom' && (
                  <>
                    <input type="date" className="border rounded px-2 py-1 text-sm" value={customDateRange.from}
                      onChange={e => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))} />
                    <input type="date" className="border rounded px-2 py-1 text-sm" value={customDateRange.to}
                      onChange={e => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))} />
                  </>
                )}
              </div>
            </div>
          )}
          {displayedPlans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700">{filterEmployeeId ? 'Este empleado no tiene planes PIP' : 'No hay planes PIP'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {filterEmployeeId ? 'Intente con otro empleado.' : 'Cree un plan de mejoramiento para comenzar a hacer seguimiento.'}
                </p>
                {!filterEmployeeId && (
                  <Button className="mt-4" onClick={() => { setViewMode('create'); setShowForm(true) }}>
                    <Plus className="h-4 w-4 mr-1" /> Crear Primer Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-3">
            {displayedPlans.map(plan => {
              const statusInfo = STATUS_MAP[plan.status] || STATUS_MAP.draft
              const progress = getOverallProgress(plan)
              const daysLeft = getDaysRemaining(plan.endDate)
              const goals = plan.pip_goals || []
              const evaluations = plan.pip_evaluations || []
              const isExpanded = expandedPlan === plan.id

              return (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{plan.title}</h3>
                          <Badge className={`${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {getEmployeeName(plan.employeeId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(plan.startDate).toLocaleDateString('es-HN')} → {new Date(plan.endDate).toLocaleDateString('es-HN')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" /> {goals.length} metas
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" /> {evaluations.length} evaluaciones
                          </span>
                          {plan.status === 'active' && (
                            <span className={`flex items-center gap-1 ${daysLeft < 0 ? 'text-red-600 font-medium' : daysLeft < 7 ? 'text-yellow-600 font-medium' : ''}`}>
                              <Clock className="h-3 w-3" /> {daysLeft < 0 ? `Vencido ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <div className="text-center text-sm font-medium mb-1">{progress}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setExpandedPlan(isExpanded ? null : plan.id!) }}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" onClick={async () => {
                          try {
                            const res = await fetch(`/api/companies/${companyId}/hr/pip?planId=${plan.id}`, { headers: { 'x-tenant-id': companyId } })
                            if (res.ok) {
                              const fullPlan = await res.json()
                              setSelectedPlan(fullPlan)
                            } else {
                              setSelectedPlan(plan)
                            }
                          } catch { setSelectedPlan(plan) }
                          setViewMode('detail')
                        }}>
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                        {(plan.status === 'draft' || plan.status === 'active') && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              const res = await fetch(`/api/companies/${companyId}/hr/pip?planId=${plan.id}`, { headers: { 'x-tenant-id': companyId } })
                              const fullPlan = res.ok ? await res.json() : plan
                              setSelectedPlan(fullPlan)
                              setForm({
                                employeeId: fullPlan.employeeId || fullPlan.employee_id,
                                title: fullPlan.title,
                                description: fullPlan.description,
                                startDate: fullPlan.startDate || fullPlan.start_date,
                                endDate: fullPlan.endDate || fullPlan.end_date,
                                observations: fullPlan.observations || '',
                                commitments: fullPlan.commitments || '',
                                goals: (fullPlan.pip_goals || []).map((g: any) => ({
                                  id: g.id,
                                  title: g.title,
                                  description: g.description || '',
                                  metric: g.metric,
                                  targetValue: g.targetValue || g.target_value || 100,
                                  currentValue: g.currentValue || g.current_value || 0,
                                  unit: g.unit || 'porcentaje',
                                  dueDate: g.dueDate || g.due_date || '',
                                  status: g.status || 'pending',
                                  commitments: g.commitments || '',
                                })),
                              })
                            } catch { setSelectedPlan(plan) }
                            setViewMode('edit')
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-2">{plan.description || 'Sin descripción'}</p>
                        {goals.length > 0 && (
                          <div className="space-y-1">
                            {goals.slice(0, 3).map((g: any) => {
                              const gs = GOAL_STATUS[g.status] || GOAL_STATUS.pending
                              return (
                                <div key={g.id} className="flex items-center gap-2 text-sm">
                                  <Badge className={`${gs.bg} ${gs.color} text-xs`}>{gs.label}</Badge>
                                  <span>{g.title}</span>
                                  <span className="text-gray-400">({g.current_value}/{g.target_value} {g.unit})</span>
                                </div>
                              )
                            })}
                            {goals.length > 3 && <p className="text-xs text-gray-500">+{goals.length - 3} metas más</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
