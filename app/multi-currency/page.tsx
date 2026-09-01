'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

export default function MultiCurrencyPage() {
  const [exchangeRates] = useState([
    {
      id: '1',
      fromCurrency: 'HNL',
      toCurrency: 'USD',
      rate: 24.70,
      date: '2024-03-27',
      source: 'Banco Central'
    },
    {
      id: '2',
      fromCurrency: 'USD',
      toCurrency: 'HNL',
      rate: 0.0405,
      date: '2024-03-27',
      source: 'Banco Central'
    }
  ]);

  const [recentTransactions] = useState([
    {
      id: '1',
      description: 'Pago de consultas',
      amount: 1000,
      currency: 'USD',
      hnlEquivalent: 24700,
      date: '2024-03-27',
      company: 'Dental Diamond Center'
    },
    {
      id: '2',
      description: 'Compra de equipo',
      amount: 500000,
      currency: 'HNL',
      usdEquivalent: 20243,
      date: '2024-03-27',
      company: 'Dental Diamond Center'
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Divisa</h1>
          <p className="text-gray-600">Transacciones HNL/USD y gestión de tasas de cambio</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar Tasas
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Transacción
          </Button>
        </div>
      </div>

      {/* Badge */}
      <Badge className="bg-green-100 text-green-800 w-fit">
        NUEVO
      </Badge>

      {/* Exchange Rates */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tasas de Cambio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exchangeRates.map((rate) => (
            <Card key={rate.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {rate.fromCurrency} → {rate.toCurrency}
                  </CardTitle>
                  <Badge variant="outline">
                    {rate.source}
                  </Badge>
                </div>
                <CardDescription>
                  Actualizado: {rate.date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tasa:</span>
                    <span className="text-2xl font-bold text-cyan-600">
                      {rate.rate.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transacciones Recientes</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Original
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equivalente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {transaction.currency === 'USD' 
                          ? (transaction.hnlEquivalent?.toLocaleString() || '0') + ' HNL'
                          : (transaction.usdEquivalent?.toLocaleString() || '0') + ' USD'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total HNL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  500,000
                </p>
                <p className="text-sm text-gray-600">Lempiras</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-cyan-600">
                  20,243
                </p>
                <p className="text-sm text-gray-600">Dólares</p>
              </div>
              <DollarSign className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-600">
                  2
                </p>
                <p className="text-sm text-gray-600">Este mes</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Características</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Soporte para múltiples divisas (HNL, USD)</li>
                <li>• Tasas de cambio en tiempo real</li>
                <li>• Conversión automática de montos</li>
                <li>• Reportes en ambas monedas</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Próximamente</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Soporte para EUR y otras monedas</li>
                <li>• Historial de tasas de cambio</li>
                <li>• Alertas de fluctuación</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
