'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Package, BookOpen, Receipt, Users2, BarChart3 } from 'lucide-react';

const AVAILABLE_MODULES = [
  { id: 'ACCOUNTING', name: 'Contabilidad Central', icon: BookOpen },
  { id: 'BILLING', name: 'Facturación y Ventas', icon: Receipt },
  { id: 'INVENTORY', name: 'Inventario', icon: Package },
  { id: 'CONTACTS', name: 'Contactos', icon: Users2 },
  { id: 'REPORTS', name: 'Reportes y Análisis', icon: BarChart3 }
];

interface TenantModuleManagerProps {
  tenantId: string;
  initialModules: string[];
  onUpdate?: (newModules: string[]) => void;
}

export function TenantModuleManager({ tenantId, initialModules, onUpdate }: TenantModuleManagerProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: selectedModules }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Módulos actualizados correctamente.' });
        onUpdate?.(selectedModules);
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al actualizar módulos.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de red al intentar actualizar.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Gestión de Módulos Activos
        </CardTitle>
        <CardDescription>
          Agrega o quita módulos para este tenant. Los cambios se reflejarán inmediatamente en su menú lateral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {AVAILABLE_MODULES.map((module) => {
            const isActive = selectedModules.includes(module.id);
            return (
              <div 
                key={module.id}
                onClick={() => toggleModule(module.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isActive ? 'border-blue-600 bg-blue-50/30' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <module.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {module.name}
                  </span>
                </div>
                <Checkbox checked={isActive} onCheckedChange={() => toggleModule(module.id)} />
              </div>
            );
          })}
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </CardContent>
    </Card>
  );
}
