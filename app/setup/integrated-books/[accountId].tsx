'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertCircle, Database, FileText, Play, ExternalLink, Loader2, ArrowLeft, Building } from 'lucide-react';

interface SetupResult {
  statement: string;
  status: string;
  message: string;
}

interface SetupResponse {
  message: string;
  totalStatements: number;
  results: SetupResult[];
  instructions: {
    title: string;
    steps: string[];
  };
  error?: string;
}

interface AccountInfo {
  id: string;
  name: string;
  code: string;
  type: string;
}

export default function IntegratedBooksSetupPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  // Cargar información de la cuenta
  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!accountId) {
        setError('No se proporcionó ID de cuenta');
        setLoadingAccount(false);
        return;
      }

      try {
        const response = await fetch(`/api/accounting/accounts?id=${accountId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error cargando información de la cuenta');
        }

        setAccountInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoadingAccount(false);
      }
    };

    fetchAccountInfo();
  }, [accountId]);

  const runSetup = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setProgress(0);
    setCurrentStep('Iniciando proceso de setup...');

    try {
      // Simular progreso durante el proceso
      setCurrentStep('Conectando con el servidor...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentStep('Analizando archivo SQL...');
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentStep('Procesando declaraciones SQL...');
      setProgress(50);
      
      const response = await fetch('/api/setup/integrated-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        })
      });

      setCurrentStep('Procesando resultados...');
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 500));

      const data: SetupResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el setup');
      }

      setCurrentStep('Setup completado exitosamente');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setResult(data);
    } catch (err) {
      setCurrentStep('Error en el proceso');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'manual_execution_required':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'manual_execution_required':
        return <Badge variant="secondary">Requiere ejecución manual</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'skipped':
        return <Badge variant="outline">Omitido</Badge>;
      default:
        return <Badge variant="default">Completado</Badge>;
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Botón de navegación hacia atrás */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={goBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Setup: Libros Contables Integrados
          </h1>
          {loadingAccount ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-muted-foreground">Cargando información de la cuenta...</p>
            </div>
          ) : accountInfo ? (
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground">
                Configura las funciones y vistas para integrar libros de ingresos y egresos
              </p>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{accountInfo.name}</span>
                <Badge variant="outline">{accountInfo.code}</Badge>
                <Badge variant="secondary">
                  {accountInfo.type === 'ASSET' ? 'Activo' :
                   accountInfo.type === 'LIABILITY' ? 'Pasivo' :
                   accountInfo.type === 'EQUITY' ? 'Patrimonio' :
                   accountInfo.type === 'REVENUE' ? 'Ingresos' :
                   accountInfo.type === 'EXPENSE' ? 'Gastos' : accountInfo.type}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2">
              Configura las funciones y vistas para integrar libros de ingresos y egresos con los demás libros contables
            </p>
          )}
        </div>
      </div>

      {/* Mostrar error si no hay cuenta */}
      {!loadingAccount && !accountInfo && !error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró la cuenta especificada. Verifica el ID e intenta nuevamente.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="setup" className="w-full">
        <TabsList>
          <TabsTrigger value="setup">Ejecutar Setup</TabsTrigger>
          <TabsTrigger value="instructions">Instrucciones Manuales</TabsTrigger>
          <TabsTrigger value="test">Pruebas</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Ejecutar Configuración Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Este proceso analizará el archivo SQL y te dará instrucciones específicas 
                para configurar las funciones integradas en tu base de datos Supabase 
                para la cuenta <strong>{accountInfo?.name || 'seleccionada'}</strong>.
              </p>

              <Button 
                onClick={runSetup} 
                disabled={loading || !accountInfo || loadingAccount}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep || 'Analizando...'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Analizar y Preparar Setup
                  </>
                )}
              </Button>

              {/* Barra de progreso */}
              {(loading || progress > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso del setup</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  {currentStep && (
                    <p className="text-sm text-muted-foreground italic">
                      {currentStep}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.message}. Se analizaron {result.totalStatements} declaraciones SQL.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Resultados del análisis:</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {result.results.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-2 flex-1">
                            {getStatusIcon(item.status)}
                            <code className="text-sm bg-muted p-1 rounded flex-1">
                              {item.statement}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Instrucciones de Ejecución Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Si la configuración automática no funciona, sigue estos pasos manualmente.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Pasos para configurar manualmente:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Abre el dashboard de Supabase: 
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      supabase.com/dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Selecciona tu proyecto</li>
                  <li>Ve a la sección <strong>SQL Editor</strong> en el menú lateral</li>
                  <li>Abre el archivo <code>INTEGRAR_LIBROS_INGRESOS_EGRESOS.sql</code> en tu editor</li>
                  <li>Copia todo el contenido del archivo SQL</li>
                  <li>Pega el contenido en el SQL Editor de Supabase</li>
                  <li>Haz clic en <strong>Run</strong> para ejecutar el SQL</li>
                  <li>Verifica que no haya errores en la consola</li>
                  <li>Confirma que todas las funciones y vistas se hayan creado correctamente</li>
                </ol>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-semibold mb-2">Funciones que se crearán:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code>get_libro_diario_integrado</code> - Libro diario completo</li>
                    <li><code>get_libro_mayor_integrado</code> - Libro mayor integrado</li>
                    <li><code>get_balance_comprobacion_integrado</code> - Balance de comprobación</li>
                    <li><code>get_resumen_ingresos_egresos</code> - Resumen mensual</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-semibold mb-2">Vistas que se crearán:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code>libro_diario_integrado</code></li>
                    <li><code>libro_mayor_integrado</code></li>
                    <li><code>balance_comprobacion_integrado</code></li>
                    <li><code>resumen_ingresos_egresos</code></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Probar Funciones Integradas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Después de configurar las funciones, puedes probarlas en la aplicación:
              </p>
              <div className="mt-4 space-y-2">
                <a 
                  href={`/accounting/integrated-books?accountId=${accountId}`}
                  className="block p-3 border rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Libros Contables Integrados</span>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visualiza y prueba las funciones para la cuenta {accountInfo?.name || 'seleccionada'}
                  </p>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
