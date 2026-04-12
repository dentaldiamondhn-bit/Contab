import { selectWithTenant, insertWithTenant, updateWithTenant, deleteWithTenant } from '@/lib/supabase/server-final';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAccountTypeLabel, getAccountTypeColor } from '@/lib/accounting-utils';

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

// Server Component - usa headers del middleware
export default async function ServerAccountsPage() {
  // Obtener cuentas usando el helper con tenant filtering automático
  const accounts = await selectWithTenant<Account>('Account', {
    orderBy: { column: 'code', ascending: true }
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuentas Contables (Server)</h1>
        <p className="text-gray-600">
          Gestiona el catálogo de cuentas de tu empresa - Server Component
        </p>
      </div>

      {/* Lista de Cuentas */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-gray-500">{account.code}</p>
                    {account.description && (
                      <p className="text-sm text-gray-500">{account.description}</p>
                    )}
                  </div>
                  <Badge className={getAccountTypeColor(account.type)}>
                    {getAccountTypeLabel(account.type)}
                  </Badge>
                  {account.isActive ? (
                    <Badge variant="outline" className="text-green-600">
                      Activa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(account.createdAt).toLocaleDateString('es-HN')}
                </div>
              </div>
            ))}
            
            {accounts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay cuentas registradas</p>
                <p className="text-sm text-gray-400">Crea tu primera cuenta para comenzar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información de Debug */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Tenant Filtering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Total de cuentas:</strong> {accounts.length}</p>
            <p><strong>Tipo de componente:</strong> Server Component</p>
            <p><strong>Filtering automático:</strong> ✅ Activo</p>
            <p><strong>RLS activado:</strong> ✅ En Supabase</p>
            <p><strong>Middleware:</strong> ✅ Inyectando headers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
