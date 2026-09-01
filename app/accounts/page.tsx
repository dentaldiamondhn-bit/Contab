"use client";

import { useState, useEffect } from 'react';
import { selectWithTenant, insertWithTenant, updateWithTenant, deleteWithTenant } from '@/lib/supabase/standard-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState({ name: '', code: '', type: 'ASSET', description: '' });
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Cargar cuentas usando el helper con tenant filtering automático
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await selectWithTenant<Account>('Account', {
        orderBy: { column: 'code', ascending: true }
      });
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      await insertWithTenant('Account', newAccount);
      setNewAccount({ name: '', code: '', type: 'ASSET', description: '' });
      await loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleUpdateAccount = async (account: Account) => {
    try {
      await updateWithTenant('Account', account.id, {
        name: account.name,
        code: account.code,
        type: account.type,
        description: account.description
      });
      setEditingAccount(null);
      await loadAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteWithTenant('Account', id);
      await loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cuentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuentas Contables</h1>
        <p className="text-gray-600">
          Gestiona el catálogo de cuentas de tu empresa
        </p>
      </div>

      {/* Formulario de Nueva Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Nueva Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Nombre de la cuenta"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
            />
            <Input
              placeholder="Código"
              value={newAccount.code}
              onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newAccount.type}
              onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
            >
              <option value="ASSET">Activo</option>
              <option value="LIABILITY">Pasivo</option>
              <option value="EQUITY">Patrimonio</option>
              <option value="REVENUE">Ingreso</option>
              <option value="EXPENSE">Egreso</option>
            </select>
            <Input
              placeholder="Descripción"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
            />
            <Button onClick={handleCreateAccount} className="md:col-span-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear Cuenta
            </Button>
          </div>
        </CardContent>
      </Card>

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
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Modal de Edición */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Editar Cuenta</h3>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la cuenta"
                value={editingAccount.name}
                onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
              />
              <Input
                placeholder="Código"
                value={editingAccount.code}
                onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editingAccount.type}
                onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value })}
              >
                <option value="ASSET">Activo</option>
                <option value="LIABILITY">Pasivo</option>
                <option value="EQUITY">Patrimonio</option>
                <option value="REVENUE">Ingreso</option>
                <option value="EXPENSE">Egreso</option>
              </select>
              <Input
                placeholder="Descripción"
                value={editingAccount.description || ''}
                onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
              />
              <div className="flex space-x-2">
                <Button onClick={() => handleUpdateAccount(editingAccount)}>
                  Guardar Cambios
                </Button>
                <Button variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
