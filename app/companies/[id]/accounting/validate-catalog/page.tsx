'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

interface ValidationIssue {
  severity: 'error' | 'warning';
  type: string;
  message: string;
  accounts: { id: string; code: string; name: string }[];
}

interface ValidationResult {
  issues: ValidationIssue[];
  accounts: number;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    valid: boolean;
  };
}

const TYPE_LABELS: Record<string, string> = {
  DUPLICATE_CODE: 'Código Duplicado',
  ORPHAN_PARENT: 'Padre Huérfano',
  MISSING_CODE: 'Sin Código',
  MISSING_NAME: 'Sin Nombre',
  INCONSISTENT_SEPARATORS: 'Separadores Inconsistentes',
  INACTIVE_ACCOUNTS: 'Cuentas Desactivadas',
  INVALID_TYPE: 'Tipo No Válido',
  SELF_REFERENCE: 'Autorreferencia',
  CODE_AS_NAME: 'Nombre = Código',
};

export default function ValidateCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  useEffect(() => {
    validate();
  }, [companyId]);

  const validate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/accounts/validate?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Error validating catalog:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/accounting`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Validación del Catálogo</h1>
                  <p className="text-sm text-gray-500">Integridad y consistencia de cuentas contables</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={validate} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Re-validar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && !result ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-500">Validando catálogo de cuentas...</p>
          </div>
        ) : result ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{result.summary.total}</p>
                    <p className="text-sm text-gray-500">Total Cuentas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={result.summary.errors > 0 ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${result.summary.errors > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {result.summary.errors}
                    </p>
                    <p className="text-sm text-gray-500">Errores</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={result.summary.warnings > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${result.summary.warnings > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                      {result.summary.warnings}
                    </p>
                    <p className="text-sm text-gray-500">Advertencias</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={result.summary.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    {result.summary.valid ? (
                      <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-10 w-10 text-red-600 mx-auto" />
                    )}
                    <p className={`text-sm font-medium mt-2 ${result.summary.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {result.summary.valid ? 'Catálogo Válido' : 'Requiere Atención'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues List */}
            {result.issues.length === 0 ? (
              <Card>
                <CardContent className="pt-8 pb-8">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      ¡Catálogo sin problemas!
                    </h3>
                    <p className="text-gray-500">
                      El catálogo de {result.summary.total} cuentas pasó todas las validaciones.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {result.issues.map((issue) => {
                  const isExpanded = expandedIssue === issue.type;
                  const Icon = issue.severity === 'error' ? XCircle : AlertTriangle;
                  const color = issue.severity === 'error' ? 'red' : 'yellow';

                  return (
                    <Card key={issue.type} className={`border-${color}-200`}>
                      <CardContent className="p-0">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedIssue(isExpanded ? null : issue.type)}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 text-${color}-500 shrink-0`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={`bg-${color}-100 text-${color}-700`}>
                                  {TYPE_LABELS[issue.type] || issue.type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.accounts.length} {issue.accounts.length === 1 ? 'cuenta' : 'cuentas'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{issue.message}</p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>

                        {isExpanded && (
                          <div className="border-t px-4 py-3 bg-gray-50">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="pb-2 font-medium w-[120px]">Código</th>
                                  <th className="pb-2 font-medium">Nombre</th>
                                </tr>
                              </thead>
                              <tbody>
                                {issue.accounts.map((acc) => (
                                  <tr key={acc.id} className="border-t border-gray-200">
                                    <td className="py-2 font-mono font-medium">{acc.code}</td>
                                    <td className="py-2 text-gray-600">{acc.name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
