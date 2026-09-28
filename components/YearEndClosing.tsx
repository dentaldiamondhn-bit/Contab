'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Lock, Info } from 'lucide-react';

import { formatCurrency } from '@/lib/date-utils';
import { Input } from '@/components/ui/input';

export interface ValidationChecklistState {
  /** Critical errors that prevent proceeding */
  criticalErrors: ValidationError[];
  /** Warnings that require user confirmation but don't block */
  warnings: ValidationWarning[];
  /** Whether the user can proceed to the next step */
  canProceed: boolean;
  /** Whether warnings have been acknowledged via checkbox */
  warningsAcknowledged: boolean;
}

export interface ValidationError {
  id: string;
  title: string;
  message: string;
  actionUrl?: string; // Link to fix the issue
}

export interface ValidationWarning {
  id: string;
  title: string;
  message: string;
}

/** Step states for the Wizard */
type WizardStep =
  | 'pre-validation'
  | 'review'
  | 'adjust'
  | 'close'
  | 'complete';

interface TrialBalanceData {
  year: string;
  trialBalance: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    balance: number;
    debit: number;
    credit: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

interface AdjustingEntry {
  id: string;
  date: string;
  description: string;
  voucherNumber: number;
  entries: Array<{
    id: string;
    amount: number;
    account: {
      name: string;
      code: string;
      type: string;
    };
  }>;
}

interface ClosingStatus {
  year: string;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  lastClosedDate?: string;
}

/** Scope clarification types */
interface ScopeBannerProps {
  isAnnual: boolean;
  onClose?: () => void;
}

export default function YearEndClosing() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<WizardStep>('pre-validation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trial balance & adjusting entries
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [adjustingEntries, setAdjustingEntries] = useState<AdjustingEntry[]>([]);
  const [closingStatus, setClosingStatus] = useState<ClosingStatus | null>(null);
  const [equityAccounts, setEquityAccounts] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // NEW: Validation checklist state
  const [validation, setValidation] = useState<ValidationChecklistState>({
    criticalErrors: [],
    warnings: [],
    canProceed: false,
    warningsAcknowledged: false,
  });

  // Period variations
  const [showPeriodVariations, setShowPeriodVariations] = useState(false);

  // Auto opening balance
  const [generateOpeningBalance, setGenerateOpeningBalance] = useState(false);
  const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false);
  const [openingBalanceError, setOpeningBalanceError] = useState<string | null>(null);

  useEffect(() => {
    fetchClosingStatus();
    fetchEquityAccounts();
  }, [year]);

  const fetchClosingStatus = async () => {
    try {
      const response = await fetch(`/api/closing/perform?year=${year}`);
      const data = await response.json();
      setClosingStatus(data);

      if (data.isClosed) {
        setStep('complete');
      }
    } catch (error) {
      setError('Failed to check closing status');
    }
  };

  const fetchEquityAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const accounts = await response.json();
      setEquityAccounts(accounts.filter((acc: any) => acc.type === 'EQUITY'));
    } catch (error) {
      setError('Failed to fetch equity accounts');
    }
  };

  /** -------------------------------------------------------
   *  STEP 0: PRE-VALIDATION CHECKLIST
   *  ------------------------------------------------------- */
  const fetchPreValidation = async () => {
    setLoading(true);
    setError(null);
    setValidation({
      criticalErrors: [],
      warnings: [],
      canProceed: false,
      warningsAcknowledged: false,
    });

    try {
      const response = await fetch(
        `/api/accounting/period-closing?year=${year}`,
        {
          headers: {
            'x-tenant-id': (await import('@/lib/db')).db.getTenantId?.() || '',
          },
        }
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed pre-validation');

      // Build critical errors (hard blocks)
      const criticalErrors: ValidationError[] = [];

      // 1️⃣ Asientos descuadrados o pendientes de postear
      const unbalancedEntries = data.unbalancedEntries || [];
      if (unbalancedEntries.length > 0) {
        criticalErrors.push({
          id: 'unbalanced-entries',
          title: 'Asientos descuadrados pendientes',
          message: `Se encontraron ${unbalancedEntries.length} asientos donde el débito no iguala al crédito. Revise y corrija antes del cierre anual.`,
          actionUrl: '/accounting',
        });
      }

      // 2️⃣ Cuentas transitorias/de ajuste con saldo pendiente
      const transientAccounts = data.transientAccounts || [];
      if (transientAccounts.length > 0) {
        criticalErrors.push({
          id: 'transient-accounts',
          title: 'Cuentas transitorias con saldo pendiente',
          message: `Se detectan ${transientAccounts.length} cuentas de ajuste/transporte con saldo sin conciliar.`,
          actionUrl: '/accounting',
        });
      }

      // 3️⃣ Cierre de períodos mensuales anteriores
      const unclosedMonths = data.unclosedMonths || [];
      if (unclosedMonths.length > 0) {
        criticalErrors.push({
          id: 'unclosed-months',
          title: 'Períodos mensuales sin cerrar',
          message: `Los siguientes meses del ejercicio no han sido cerrados: ${unclosedMonths.join(', ')}. Cierre mensual primero.`,
          actionUrl: '/accounting/closing',
        });
      }

      // 4️⃣ Conciliaciones/Auditorías pendientes (informativa, warning)
      const pendingReconciliations = data.pendingReconciliations || [];
      const warnings: ValidationWarning[] = [];

      if (pendingReconciliations.length > 0) {
        warnings.push({
          id: 'pending-reconciliations',
          title: 'Conciliaciones pendientes',
          message: `Hay ${pendingReconciliations.length} cuenta(s) crítica(s) (Caja/Bancos) con conciliación pendiente al cierre.`,
        });
      }

      // Build warnings (non-blocking but require acknowledgment)
      const warningCheckboxes: ValidationWarning[] = warnings.length > 0 ? warnings : [];

      setValidation({
        criticalErrors,
        warnings: warningCheckboxes,
        canProceed: criticalErrors.length === 0,
        warningsAcknowledged: criticalErrors.length > 0 ? false : true,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed pre-validation');
      setValidation({
        criticalErrors: [],
        warnings: [],
        canProceed: false,
        warningsAcknowledged: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWarningAcknowledge = (acknowledged: boolean) => {
    setValidation((prev) => ({
      ...prev,
      warningsAcknowledged: acknowledged,
      canProceed: prev.criticalErrors.length === 0 && acknowledged,
    }));
  };

  /** -------------------------------------------------------
   *  FETCH TRIAL BALANCE
   *  ------------------------------------------------------- */
  const fetchTrialBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/closing/trial-balance?year=${year}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trial balance');
      }

      setTrialBalance(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch trial balance');
    } finally {
      setLoading(false);
    }
  };

  /** -------------------------------------------------------
   *  FETCH ADJUSTING ENTRIES
   *  ------------------------------------------------------- */
  const fetchAdjustingEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/closing/adjusting-entries?year=${year}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch adjusting entries');
      }

      setAdjustingEntries(data.adjustingEntries);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch adjusting entries');
    } finally {
      setLoading(false);
    }
  };

  /** -------------------------------------------------------
   *  PERFORM CLOSING
   *  ------------------------------------------------------- */
  const performClosing = async () => {
    if (!equityAccounts.length) {
      setError('No equity accounts available for closing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/closing/perform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          equityAccountId: equityAccounts[0].id,
          closedBy: 'System',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data.error);
        } else if (response.status === 400 && data.type === 'VALIDATION_ERROR') {
          throw new Error(data.error);
        } else {
          throw new Error(data.error || 'Failed to perform closing');
        }
      }

      setStep('complete');
      await fetchClosingStatus();

      // NEW: Auto-generate opening balance if checkbox is checked
      if (generateOpeningBalance) {
        setOpeningBalanceLoading(true);
        setOpeningBalanceError(null);

        try {
          const autoResponse = await fetch('/api/accounting/opening-balances/auto', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': (await import('@/lib/db')).db.getTenantId?.() || '',
            },
            body: JSON.stringify({
              year: Number(year),
              apply: true,
              overwrite: false,
            }),
          });

          const autoData = await autoResponse.json();

          if (!autoResponse.ok) {
            throw new Error(
              autoData.error || 'Failed to generate opening balances'
            );
          }

          // Show success toast - in a real app would use a toast library
          console.log('Opening balances generated successfully', autoData);
        } catch (autoError) {
          setOpeningBalanceError(
            autoError instanceof Error ? autoError.message : 'Error generating opening balances'
          );
          console.error('Error generating opening balances:', autoError);
        } finally {
          setOpeningBalanceLoading(false);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to perform closing');
    } finally {
      setLoading(false);
    }
  };

  /** -------------------------------------------------------
   *  OPEN PERIOD VARIATIONS
   *  ------------------------------------------------------- */
  const openPeriodVariations = () => {
    // Open in new tab - the report endpoint requires tenantId
    const tenantId = closingStatus?.closedBy || 'unknown';
    const variationUrl = `/reports/period-variations?tenantId=${tenantId}&from=${String(
      Number(year) - 1
    )}-01&to=${year}-12&yoy=true&yoyYears=2`;

    window.open(variationUrl, '_blank');
  };

  /** -------------------------------------------------------
   *  FORMAT HELPERS
   *  ------------------------------------------------------- */
  const formatYearDisplay = () => `${year} Ejercicio Fiscal`;

  /** -------------------------------------------------------
   *  RENDER COMPONENT
   *  ------------------------------------------------------- */
  // Scope banner - always show at top for annual close
  const scopeBanner = (
    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-t p-4 mb-6">
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
        <div className="ml-3 flex-1">
          <p className="font-medium text-blue-800">
            ⚠️ <strong>Cierre Anual de Ejercicio Fiscal</strong>
          </p>
          <p className="text-sm text-blue-600">
            Este módulo está diseñado exclusivamente para el cierre del ejercicio
            fiscal anual. No afecta los cierres mensuales recurrentes. Si necesita
            cerrar un período mensual, use la pestaña 'Cierres Mensuales' en el
            panel de contabilidad.
          </p>
        </div>
      </div>
    </div>
  );

  // Render based on current step
  switch (step) {
    case 'pre-validation':
      return (
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {scopeBanner}

          <h1 className="text-2xl font-bold">Validación Previa de Cierre</h1>

          <p className="text-gray-600 mb-6">
            Ejecutando diagnóstico automático para el año {year}. Este proceso
            validará que el estado contable es adecuado antes de proceder con
            el cierre anual.
          </p>

          {/* Checklist UI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Diagnóstico en curso...</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Se están validando los siguientes aspectos del estado contable:
              </p>

              {validation.criticalErrors.length > 0 ||
              validation.warnings.length > 0 ? (
                <>
                  {/* Critical Errors */}
                  {validation.criticalErrors.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <p className="text-sm font-medium text-red-600">
                        ❌ <strong>Errores Críticos (bloquean el cierre):</strong>
                      </p>
                      {validation.criticalErrors.map((err) => (
                        <div key={err.id} className="p-3 rounded bg-red-50 border border-red-200 mb-3">
                          <div className="flex justify-between align-items-start">
                            <div>
                              <h4 className="font-medium text-red-600">{err.title}</h4>
                              <p className="text-sm text-red-700">{err.message}</p>
                            </div>
                            {err.actionUrl && (
                              <a
                                href={err.actionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 text-sm underline cursor-pointer"
                              >
                                Ver y corregir
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {validation.criticalErrors.some((e) => e.id === 'unclosed-months') && (
                        <p className="text-xs text-red-500 mt-1">
                          ✅ <strong>Recomendación:</strong> Cierre los períodos mensuales
          pendientes antes de proceder al cierre anual.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <p className="text-sm font-medium text-orange-600">
                        ⚠️ <strong>Advertencias (requieren confirmación):</strong>
                      </p>
                      {validation.warnings.map((warn) => (
                        <div key={warn.id} className="p-3 rounded bg-orange-50 border border-orange-200 mb-3">
                          <div className="flex justify-between align-items-start">
                            <div>
                              <h4 className="font-medium text-orange-600">{warn.title}</h4>
                              <p className="text-sm text-orange-700">{warn.message}</p>
                            </div>
                            <div className="flex items-center">
                              <Badge
                                variant="outline"
                                className="mx-2"
                                onClick={() => handleWarningAcknowledge(true)}
                              >
                                Aceptado
                              </Badge>
                              <span className="text-orange-500 text-xs">
                                (requerido para continuar)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Checkbox for warnings -->
                      {validation.warnings.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <label className="block text-sm text-gray-500 mb-2">
            <input
              type="checkbox"
              checked={validation.warningsAcknowledged}
              onChange={(e) => handleWarningAcknowledge(e.target.checked)}
              className="mr-2"
            />
            He revisado las advertencias y deseo continuar
          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Proceed button - only enabled when no critical errors + warnings acknowledged */}
                  {validation.canProceed && (
                    <Button
                      onClick={() => setStep('review')}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null
                      }
                      )"
                      >
                        Continuar a Revisión de Balanza
                      </Button>
                  )}

                  {/* Blocked case */}
                  {!validation.canProceed && !validation.criticalErrors.some((e) => e.id === 'unclosed-months') && (
                    <p className="text-sm text-gray-500 mt-2">
                      No se pueden avanzar: hay errores críticos que deben resolverse primero.
                    </p>
                  )}
                </>
              ) : (
                /* No errors yet - show info */
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <p className="text-green-600">
                    ✅ Diagnóstico inicial completado - No se encontraron errores críticos.
                    Puede proceder a la revisión de la balanza.
                  </p>
                </div>
              )}

              {/* Manual fetch button if not already loaded */}
              {validation.criticalErrors.length === 0 && validation.warnings.length === 0 && (
                <Button
                  onClick={fetchPreValidation}
                  disabled={loading}
                  className="mt-4 w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null
                  }
                  )
                }
                {loading ? null : (
                  'Ejecutar Diagnóstico Autoprevio'
                )}
              )}
            </CardContent>
          </Card>

          {/* Action button to start the wizard if in pre-validation */}
          {step === 'pre-validation' && (
            <Button
              onClick={() => setStep('review')}
              disabled={loading || !validation.canProceed}
              variant="secondary"
              className="w-full mt-4"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null
              )
              }
              {validation.canProceed ? ('Proceed to Trial Balance Review') : ('Resolve Errors First')}
            </Button>
          )}
        </div>
      );

    case 'review':
      return (
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {scopeBanner}

          <h1 className="text-2xl font-bold">Year-End Closing - {year}</h1>

          <p className="text-gray-600 mb-6">
            Verifique que todos los números sean correctos antes de proceder con
            el proceso de cierre.
          </p>

          {/* Period Variations Button */}
          <div className="mb-4">
            <Button
              onClick={openPeriodVariations}
              disabled={loading}
              className="w-full flex items-center justify-between"
            >
              <span>Ver Reporte de Variaciones Periódicas</span>
              <Info className="h-4 w-4 text-blue-500" />
            </Button>
          </div>

          {/* Step 1: Trial Balance Review */}
          <Card className={step !== 'review' ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>1. Trial Balance Review</span>
                {trialBalance?.isBalanced && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Verify all figures are correct before proceeding with the closing process.
              </p>

              <Button
                onClick={fetchTrialBalance}
                disabled={loading || step !== 'review'}
                className="mb-4"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Load Trial Balance
              </Button>

              {trialBalance && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-right">
                      <span className="font-semibold">Total Debits:</span>
                      <div className="text-lg">{formatCurrency(trialBalance.totalDebits)}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">Total Credits:</span>
                      <div className="text-lg">{formatCurrency(trialBalance.totalCredits)}</div>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Account</th>
                          <th className="text-right p-2">Debit</th>
                          <th className="text-right p-2">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.trialBalance.map((account) => (
                          <tr key={account.id} className="border-b">
                            <td className="p-2">
                              <div>{account.name}</div>
                              <div className="text-xs text-gray-500">{account.code}</div>
                            </td>
                            <td className="text-right p-2">
                              {account.debit > 0 ? formatCurrency(account.debit) : ''}
                            </td>
                            <td className="text-right p-2">
                              {account.credit > 0 ? formatCurrency(account.credit) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {trialBalance.isBalanced ? (
                    <Button
                      onClick={() => setStep('adjust')}
                      className="w-full"
                    >
                      Proceed to Adjusting Entries
                    </Button>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Trial balance is not balanced. Please review and correct before
                        proceeding.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Adjusting Entries */}
          <Card className={step !== 'adjust' ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle>2. Adjusting Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Make manual adjusting entries for depreciation, accruals, or other
                year-end adjustments.
              </p>

              <Button
                onClick={fetchAdjustingEntries}
                disabled={loading || step !== 'adjust'}
                className="mb-4"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Load Adjusting Entries
              </Button>

              {adjustingEntries.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">
                    Existing Adjusting Entries ({adjustingEntries.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto">
                    {adjustingEntries.map((entry) => (
                      <div key={entry.id} className="border rounded p-3 mb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{entry.description}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(entry.date).toLocaleDateString()} -
                              Voucher #{entry.voucherNumber}
                            </div>
                          </div>
                          <Badge variant="outline">AJUSTE</Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          {entry.entries.map((journalEntry) => (
                            <div key={journalEntry.id} className="flex justify-between">
                              <span>{journalEntry.account.name}</span>
                              <span
                                className={journalEntry.amount > 0 ? 'text-green-600' : 'text-red-600'}
                              >
                                {formatCurrency(Math.abs(journalEntry.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep('close')}
                disabled={step !== 'adjust'}
                className="w-full mt-4"
              >
                Proceed to Closing
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Perform Closing */}
          <Card className={step !== 'close' ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>3. Year-End Closing</span>
                <Lock className="h-5 w-5 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This will create the closing entry and lock the fiscal year. This
                action cannot be undone.
              </p>

              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> After closing, no transactions can be
                  created or modified for {year}. All revenue and expense accounts
                  will be closed to retained earnings.
                </AlertDescription>
              </Alert>

              {/* Auto-generate opening balance checkbox */}
              <div className="mb-4 p-4 bg-gray-50 rounded border-l-4 border-gray-200">
                <label className="flex items-start">
                  <Input
                    type="checkbox"
                    checked={generateOpeningBalance}
                    onChange={(e) => setGenerateOpeningBalance(e.target.checked)}
                    className="w-4 h-4 rounded border-square mr-3 mt-1"
                  />
                  <span>
                    Generar automáticamente el Balance de Apertura para el nuevo
                    ejercicio fiscal después del cierre
                  </span>
                </label>
              </div>

              <Button
                onClick={performClosing}
                disabled={loading || step !== 'close'}
                variant="destructive"
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Close Books for {year}
              </Button>
            </CardContent>
          </Card>

          {/* Complete State */}
          {step === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <span>Closing Complete</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Year-end closing for {year} has been completed successfully. The
                  books are now locked and no further transactions can be created for
                  this period.
                </p>

                {generateOpeningBalance && !openingBalanceError && (
                  <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                    <Info className="h-4 w-4 text-green-600 mr-3" />
                    <span>
                      Balance de apertura generado automáticamente para el ejercicio
                      {Number(year) + 1}
                    </span>
                  </div>
                )}

                {openingBalanceError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{openingBalanceError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      );

    default:
      return <div>Year-End Closing</div>;
  }
}

