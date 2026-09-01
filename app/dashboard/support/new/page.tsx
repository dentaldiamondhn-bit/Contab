'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, CheckCircle, User, Paperclip, X, FileIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface SupportUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName: string;
}

export default function NewSupportTicketPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    ticketType: 'support' as 'support' | 'bug' | 'feature' | 'question' | 'billing',
    assignedTo: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetch('/api/support/users')
      .then(r => r.json())
      .then(data => {
        const users = data.users || [];
        setSupportUsers(users.filter((u: SupportUser) => u.role === 'SUPPORT' || u.role === 'SUPER_ADMIN'));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;

    const assignee = supportUsers.find(u => u.id === form.assignedTo);

    try {
      setLoading(true);
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          ticketType: form.ticketType,
          userEmail: user?.emailAddresses?.[0]?.emailAddress || '',
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          assignedTo: form.assignedTo || null,
          assignedName: assignee ? `${assignee.firstName} ${assignee.lastName}`.trim() : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const ticketId = data.ticket?.id;

        if (ticketId && selectedFiles.length > 0) {
          const uploadedAttachments: Array<{ name: string; url: string; size: number; type: string }> = [];
          for (const file of selectedFiles) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('ticketId', ticketId);
            const uploadRes = await fetch('/api/support/tickets/attachments', { method: 'POST', body: fd });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              uploadedAttachments.push(uploadData.attachment);
            }
          }
          if (uploadedAttachments.length > 0) {
            await fetch('/api/support/tickets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticketId, attachments: uploadedAttachments })
            });
          }
        }

        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Creado</h2>
              <p className="text-gray-600 mb-6">Tu ticket ha sido enviado exitosamente. Nuestro equipo de soporte lo revisara pronto.</p>
              <Button onClick={() => router.push('/dashboard/support')}>Ver mis tickets</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Crear Ticket de Soporte</h1>
          <p className="text-gray-600 mt-1">Describe tu problema o solicitud y te ayudaremos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asunto</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ej: Error al generar factura"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                <div className="flex gap-3">
                  {[
                    { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-800 border-green-300' },
                    { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                    { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                    { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800 border-red-300' }
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p.value as any })}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                        form.priority === p.value
                          ? p.color + ' border-current'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ticket</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { value: 'support', label: 'Soporte', color: 'bg-cyan-100 text-cyan-800 border-blue-300' },
                    { value: 'bug', label: 'Error/Bug', color: 'bg-red-100 text-red-800 border-red-300' },
                    { value: 'feature', label: 'Solicitud', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                    { value: 'question', label: 'Pregunta', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                    { value: 'billing', label: 'Facturacion', color: 'bg-amber-100 text-amber-800 border-amber-300' }
                  ].map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, ticketType: t.value as any })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                        form.ticketType === t.value
                          ? t.color + ' border-current'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a</label>
                <select
                  value={form.assignedTo}
                  onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Sin asignar (se asignara automaticamente)</option>
                  {supportUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
                {supportUsers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No hay agentes de soporte disponibles</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe tu problema o solicitud con el mayor detalle posible..."
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Archivos adjuntos (opcional)</label>
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Seleccionar archivos (max. 10MB c/u)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    onChange={e => {
                      if (e.target.files) {
                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                        <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !form.subject.trim() || !form.description.trim()} className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {loading ? 'Enviando...' : 'Enviar Ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
