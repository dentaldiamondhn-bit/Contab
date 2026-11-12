'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  MessageSquare,
  User,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  Paperclip
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user_email: string;
  user_name: string;
  tenant_name: string;
  assigned_name?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  timeline?: Array<{
    type: 'created' | 'status_change' | 'comment';
    message?: string;
    from?: string;
    to?: string;
    user?: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/support/tickets');
      if (!response.ok) {
        setTickets([]);
        return;
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        setTickets([]);
        return;
      }
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async (ticketId: string, status?: string, priority?: string) => {
    try {
      setUpdating(ticketId);
      const response = await fetch('/api/support/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status, priority })
      });
      if (response.ok) {
        setTickets(prev =>
          prev.map(t =>
            t.id === ticketId
              ? { ...t, ...(status && { status: status as Ticket['status'] }), ...(priority && { priority: priority as Ticket['priority'] }), updated_at: new Date().toISOString() }
              : t
          )
        );
      }
    } catch {
    } finally {
      setUpdating(null);
    }
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !searchTerm ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/support')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Panel
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tickets de Soporte</h1>
              <p className="text-gray-600 mt-1">Gestión y seguimiento de tickets de clientes</p>
            </div>
            <Button variant="outline" onClick={fetchTickets} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abiertos</p>
                  <p className="text-2xl font-bold text-yellow-600">{openCount}</p>
                </div>
                <Ticket className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Progreso</p>
                  <p className="text-2xl font-bold text-cyan-600">{inProgressCount}</p>
                </div>
                <Clock className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resueltos</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgentes/Altas</p>
                  <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por asunto, usuario o tenant..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="in_progress">En Progreso</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">Todas las prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
            <span className="ml-3 text-gray-600">Cargando tickets...</span>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No se encontraron tickets</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(ticket => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.user_name} ({ticket.user_email})
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {ticket.tenant_name} ({ticket.tenant_code})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString('es-HN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                        <select
                          value={ticket.status}
                          disabled={updating === ticket.id}
                          onChange={e => updateTicket(ticket.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="open">Abierto</option>
                          <option value="in_progress">En Progreso</option>
                          <option value="resolved">Resuelto</option>
                          <option value="closed">Cerrado</option>
                        </select>
                      )}
                      <button
                        onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedTicket === ticket.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {expandedTicket === ticket.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Descripcion:</p>
                        <p className="text-sm text-gray-600">{ticket.description}</p>
                      </div>
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Archivos adjuntos:</p>
                          <div className="space-y-1">
                            {ticket.attachments.map((att: any, i: number) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-800 hover:underline"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>{att.name}</span>
                                <span className="text-xs text-gray-400">({att.size < 1024 * 1024 ? (att.size / 1024).toFixed(1) + ' KB' : (att.size / (1024 * 1024)).toFixed(1) + ' MB'})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {ticket.assigned_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Asignado a:</p>
                          <p className="text-sm text-gray-600">{ticket.assigned_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Historial:</p>
                        <div className="space-y-3">
                          {(!ticket.timeline || ticket.timeline.length === 0) ? (
                            <p className="text-xs text-gray-400 italic">Sin eventos</p>
                          ) : (
                            ticket.timeline.slice().reverse().map((event: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
                                    event.type === 'created' ? 'bg-green-500' :
                                    event.type === 'status_change' ? 'bg-cyan-500' :
                                    event.type === 'comment' ? 'bg-yellow-500' : 'bg-gray-400'
                                  }`} />
                                  {i < (ticket.timeline?.length || 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                                </div>
                                <div className="pb-3 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                      event.type === 'created' ? 'bg-green-100 text-green-700' :
                                      event.type === 'status_change' ? 'bg-cyan-100 text-cyan-700' :
                                      event.type === 'comment' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {event.type === 'created' ? 'Creado' :
                                       event.type === 'status_change' ? `${event.from} → ${event.to}` :
                                       event.type === 'comment' ? 'Comentario' : event.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{event.timestamp}</span>
                                    {event.user && <span className="text-xs text-gray-500">por {event.user}</span>}
                                  </div>
                                  {event.message && <p className="text-sm text-gray-600 mt-1">{event.message}</p>}
                                  {event.attachments && event.attachments.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {event.attachments.map((att: any, j: number) => (
                                        <a key={j} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-cyan-600 hover:underline">
                                          <Paperclip className="w-3 h-3" />{att.name}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Ultima actualizacion: {new Date(ticket.updated_at).toLocaleString('es-HN')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
