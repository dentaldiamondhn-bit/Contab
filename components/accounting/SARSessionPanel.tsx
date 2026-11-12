'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Wifi,
  XCircle,
} from 'lucide-react';
import type { SARConnectionStatus } from '@/lib/services/sar-session';

interface SARSessionPanelProps {
  companyId: string;
  onStatusChange?: (status: SARConnectionStatus) => void;
}

type SessionShape = {
  status: SARConnectionStatus;
  endpoint?: string;
  userLabel?: string;
  verifiedAt?: string;
  expiresAt?: string;
};

function formatFecha(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status: SARConnectionStatus): { text: string; className: string } {
  switch (status) {
    case 'CONECTADO':
      return { text: 'Sesión verificada', className: 'bg-emerald-600' };
    case 'VERIFICANDO':
      return { text: 'Verificando…', className: '' };
    case 'CREDENCIALES_INVALIDAS':
      return { text: 'Credenciales inválidas', className: '' };
    case 'PORTAL_NO_DISPONIBLE':
      return { text: 'Portal no disponible', className: '' };
    case 'CONFIG_INCOMPLETA':
      return { text: 'Faltan datos de conexión', className: '' };
    case 'SESION_VENCIDA':
      return { text: 'Sesión vencida', className: '' };
    default:
      return { text: 'No conectado', className: '' };
  }
}

export default function SARSessionPanel({ companyId, onStatusChange }: SARSessionPanelProps) {
  const [session, setSession] = React.useState<SessionShape | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [endpoint, setEndpoint] = React.useState('');
  const [usuario, setUsuario] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [formMessage, setFormMessage] = React.useState<{ kind: SARConnectionStatus; text: string } | null>(null);

  const applyStatus = (status: SARConnectionStatus) => {
    if (onStatusChange) onStatusChange(status);
  };

  const refresh = React.useCallback(async () => {
    if (!companyId) {
      setSession({ status: 'NO_CONECTADO' });
      applyStatus('NO_CONECTADO');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/sar-session?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      const next: SessionShape = data?.session || { status: 'NO_CONECTADO' };
      setSession(next);
      applyStatus(next.status || 'NO_CONECTADO');
    } catch {
      setSession({ status: 'NO_CONECTADO' });
      applyStatus('NO_CONECTADO');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const openForm = async () => {
    setFormMessage(null);
    let prefilledEndpoint = '';
    let prefilledUser = '';
    if (companyId) {
      try {
        const res = await fetch(`/api/accounting/sar-config?tenantId=${encodeURIComponent(companyId)}`);
        const data = await res.json();
        if (data?.configured) {
          prefilledEndpoint = data.endpoint || '';
          prefilledUser = data.usuario || '';
        }
      } catch {
        /* sin datos previos para precargar */
      }
    }
    setEndpoint(session?.endpoint || prefilledEndpoint);
    setUsuario(session?.userLabel || prefilledUser);
    setPassword('');
    setShowPassword(false);
    setShowForm(true);
  };

  const connect = async () => {
    if (!companyId) return;
    if (!endpoint.trim() || !usuario.trim() || !password.trim()) {
      setFormMessage({ kind: 'CONFIG_INCOMPLETA', text: 'Faltan datos de conexión' });
      return;
    }
    setVerifying(true);
    setFormMessage(null);
    applyStatus('VERIFICANDO');
    try {
      const res = await fetch('/api/accounting/sar-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          endpoint: endpoint.trim(),
          user: usuario.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data?.session?.status === 'CONECTADO') {
        setSession(data.session);
        applyStatus('CONECTADO');
        setShowForm(false);
        setPassword('');
        return;
      }
      const kind: SARConnectionStatus = data?.errorHint || 'CREDENCIALES_INVALIDAS';
      setSession({ status: kind });
      applyStatus(kind);
      setFormMessage({ kind, text: data?.message || 'No se pudo conectar con el portal SAR.' });
    } catch {
      setSession({ status: 'PORTAL_NO_DISPONIBLE' });
      applyStatus('PORTAL_NO_DISPONIBLE');
      setFormMessage({ kind: 'PORTAL_NO_DISPONIBLE', text: 'Error de red, reinténtalo' });
    } finally {
      setVerifying(false);
    }
  };

  const logout = async () => {
    if (!companyId) return;
    try {
      await fetch(`/api/accounting/sar-session?companyId=${encodeURIComponent(companyId)}`, {
        method: 'DELETE',
      });
    } catch {
      /* el logout se refleja igual en la UI */
    }
    setSession({ status: 'NO_CONECTADO' });
    setShowForm(false);
    setPassword('');
    applyStatus('NO_CONECTADO');
  };

  const connected = session?.status === 'CONECTADO';
  const label = session ? statusLabel(session.status) : { text: 'No conectado', className: '' };

  const verifyMessage = (() => {
    if (verifying) return null;
    if (!formMessage) return null;
    switch (formMessage.kind) {
      case 'CREDENCIALES_INVALIDAS':
        return {
          className: 'text-red-700 border-red-200 bg-red-50',
          text: 'Credenciales inválidas — verifica usuario y contraseña',
        };
      case 'PORTAL_NO_DISPONIBLE':
        return {
          className: 'text-amber-800 border-amber-200 bg-amber-50',
          text: 'El portal SAR no responde — verifica tu conexión',
        };
      case 'CONFIG_INCOMPLETA':
        return {
          className: 'text-amber-800 border-amber-200 bg-amber-50',
          text: 'Faltan datos de conexión',
        };
      case 'SESION_VENCIDA':
        return {
          className: 'text-red-700 border-red-200 bg-red-50',
          text: 'Sesión vencida — reconectar',
        };
      default:
        return { className: 'text-red-700 border-red-200 bg-red-50', text: formMessage.text };
    }
  })();

  return (
    <Card className="border-cyan-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          <KeyRound className="h-5 w-5 text-cyan-600" />
          <CardTitle className="text-base">Sesión al portal SAR</CardTitle>
        </div>
        {!loading && session && (
          <Badge variant={connected ? 'default' : session?.status === 'CREDENCIALES_INVALIDAS' || session?.status === 'SESION_VENCIDA' ? 'destructive' : 'outline'} className={label.className || undefined}>
            {label.text}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {loading && <p className="text-sm text-slate-500">Cargando sesión SAR...</p>}

        {!loading && !connected && (
          <div className="flex items-start space-x-3 border border-amber-200 bg-amber-50 rounded-lg p-4 text-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">No hay una sesión activa con el portal SAR</p>
              <p className="mt-1">
                Inicia sesión para verificar tus credenciales en vivo contra el portal y poder subir
                declaraciones (Anuales, DET/SAR 221 y DIAT).
              </p>
            </div>
          </div>
        )}

        {!loading && connected && session && (
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Sesión verificada
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Usuario:</span>
              <span>{session.userLabel}</span>
            </div>
            <div>
              <span className="font-medium">Vence:</span> {formatFecha(session.expiresAt)}
            </div>
            <div>
              <span className="font-medium">Endpoint:</span>{' '}
              <span className="font-mono break-all">{session.endpoint}</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
              <Button variant="outline" size="sm" onClick={openForm}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconectar
              </Button>
            </div>
          </div>
        )}

        {!loading && !connected && !showForm && (
          <Button onClick={openForm}>
            <KeyRound className="h-4 w-4 mr-2" />
            Iniciar sesión en el portal SAR
          </Button>
        )}

        {!loading && showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="space-y-2">
              <Label htmlFor="sar-session-endpoint">Endpoint del portal SAR</Label>
              <Input
                id="sar-session-endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.sar.gob.hn/... (URL del portal o API)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sar-session-usuario">Usuario</Label>
              <Input
                id="sar-session-usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario del portal SAR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sar-session-password">Contraseña</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="sar-session-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña del portal SAR"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {(verifying || formMessage) && (
              <div className="space-y-2">
                {verifying ? (
                  <span className="inline-flex items-center text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando credenciales…
                  </span>
                ) : (
                  verifyMessage && (
                    <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${verifyMessage.className}`}>
                      {formMessage?.kind === 'CREDENCIALES_INVALIDAS' ||
                      formMessage?.kind === 'SESION_VENCIDA' ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {verifyMessage.text}
                    </div>
                  )
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button onClick={connect} disabled={verifying}>
                {verifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                {verifying ? 'Verificando…' : 'Verificar y conectar'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setFormMessage(null); }}>
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-slate-500">Clave cifrada AES-256-GCM</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}