'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  FileIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface TicketItem {
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

export default function DashboardSupportPage() {
  const router = useRouter();
  const { user } = useUser();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

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

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const myEmail = user?.emailAddresses?.[0]?.emailAddress || '';
  const myTickets = tickets.filter(t => t.user_email === myEmail);

  const filtered = myTickets.filter(t => {
    const matchSearch = !searchTerm ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = myTickets.filter(t => t.status === 'open').length;
  const inProgressCount = myTickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = myTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return s;
    }
  };

  const getPriorityLabel = (p: string) => {
    switch (p) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return p;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Tickets de Soporte</h1>
          <p className="text-gray-600 mt-1">Estado de tus solicitudes de soporte</p>
        </div>
        <Button onClick={() => router.push('/dashboard/support/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
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
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
            <Button variant="outline" onClick={fetchTickets} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Cargando tickets...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              {myTickets.length === 0 ? 'No has creado ningun ticket aun' : 'No se encontraron tickets'}
            </p>
            {myTickets.length === 0 && (
              <Button onClick={() => router.push('/dashboard/support/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear mi primer ticket
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}>
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
                    <p className="text-sm text-gray-500">
                      Creado: {new Date(ticket.created_at).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {expandedTicket === ticket.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                {expandedTicket === ticket.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3" onClick={e => e.stopPropagation()}>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Descripcion:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
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
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
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
                          <p className="text-xs text-gray-400 italic">Sin eventos registrados</p>
                        ) : (
                          ticket.timeline.slice().reverse().map((event: any, i: number) => (
                            <div key={i} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
                                  event.type === 'created' ? 'bg-green-500' :
                                  event.type === 'status_change' ? 'bg-blue-500' :
                                  event.type === 'comment' ? 'bg-yellow-500' :
                                  'bg-gray-400'
                                }`} />
                                {i < (ticket.timeline?.length || 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                              </div>
                              <div className="pb-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    event.type === 'created' ? 'bg-green-100 text-green-700' :
                                    event.type === 'status_change' ? 'bg-blue-100 text-blue-700' :
                                    event.type === 'comment' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {event.type === 'created' ? 'Creado' :
                                     event.type === 'status_change' ? `${event.from} → ${event.to}` :
                                     event.type === 'comment' ? 'Comentario' :
                                     event.type}
                                  </span>
                                  <span className="text-xs text-gray-400">{event.timestamp}</span>
                                  {event.user && <span className="text-xs text-gray-500">por {event.user}</span>}
                                </div>
                                {event.message && <p className="text-sm text-gray-600 mt-1">{event.message}</p>}
                                {event.attachments && event.attachments.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {event.attachments.map((att: any, j: number) => (
                                      <a key={j} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
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
                    {!['closed', 'resolved'].includes(ticket.status) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Comentario:</p>
                        <textarea
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Escribe un comentario..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                        />
                        <label className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer mb-2">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Adjuntar archivos</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                            onChange={e => {
                              if (e.target.files) {
                                setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                              }
                            }}
                          />
                        </label>
                        {commentFiles.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {commentFiles.map((file, i) => (
                              <div key={i} className="flex items-center justify-between bg-white border rounded px-2 py-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span className="text-xs text-gray-600 truncate">{file.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCommentFiles(prev => prev.filter((_, j) => j !== i))}
                                  className="text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingComment || (!commentText.trim() && commentFiles.length === 0)}
                          onClick={async () => {
                            setSendingComment(true);
                            try {
                              let uploadedAttachments: Array<{ name: string; url: string; size: number; type: string }> = [];
                              if (commentFiles.length > 0) {
                                for (const file of commentFiles) {
                                  const fd = new FormData();
                                  fd.append('file', file);
                                  fd.append('ticketId', ticket.id);
                                  const uploadRes = await fetch('/api/support/tickets/attachments', { method: 'POST', body: fd });
                                  if (uploadRes.ok) {
                                    const uploadData = await uploadRes.json();
                                    uploadedAttachments.push(uploadData.attachment);
                                  }
                                }
                              }
                              const res = await fetch('/api/support/tickets', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ticketId: ticket.id,
                                  comment: commentText || undefined,
                                  attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
                                })
                              });
                              const data = await res.json();
                              if (data.ticket) {
                                setTickets(prev => prev.map(t => t.id === ticket.id ? data.ticket : t));
                              }
                              setCommentText('');
                              setCommentFiles([]);
                            } catch (e) { console.error(e); }
                            setSendingComment(false);
                          }}
                        >
                          Comentar
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Ultima actualizacion: {new Date(ticket.updated_at).toLocaleString('es-HN')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
