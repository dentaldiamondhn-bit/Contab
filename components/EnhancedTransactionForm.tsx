"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormValues } from "@/lib/validations/transaction";
import { createTransaction } from "@/lib/actions/transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { AccountSelector } from "@/components/account-selector";
import TaxableSwitch from "@/components/TaxableSwitch";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { VOUCHER_TYPE_DESCRIPTIONS, VOUCHER_TYPES } from "@/lib/voucher-types";

interface EnhancedTransactionFormProps {
  enableTaxHelper?: boolean;
  onTransactionCreated?: () => void;
}

export function EnhancedTransactionForm({ 
  enableTaxHelper = false, 
  onTransactionCreated 
}: EnhancedTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [taxProcessing, setTaxProcessing] = useState(false);
  const [taxResult, setTaxResult] = useState<any>(null);
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      date: new Date().toISOString().split('T')[0],
      voucherType: VOUCHER_TYPES.DIARIO,
      entries: [{ accountId: "", amount: 0, taxable: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });
  
  // Calculate running balance for UI
  const watchEntries = watch("entries");
  const watchDescription = watch("description");
  const totalBalance = watchEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Process tax entries when taxable status changes
  useEffect(() => {
    if (enableTaxHelper && watchEntries.some(entry => entry.taxable)) {
      processTaxEntries();
    }
  }, [watchEntries, watchDescription]);

  const processTaxEntries = async () => {
    if (!enableTaxHelper) return;
    
    setTaxProcessing(true);
    try {
      const response = await fetch('/api/tax-helper/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: watchEntries,
          description: watchDescription
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTaxResult(result.data);
        
        // Update form entries with processed entries (including tax entries)
        setValue('entries', result.data.entries.map((entry: any) => ({
          accountId: entry.accountId,
          amount: entry.amount
        })));
      }
    } catch (error) {
      console.error('Error processing tax:', error);
    } finally {
      setTaxProcessing(false);
    }
  };

  const toggleTaxable = async (index: number, taxable: boolean) => {
    const currentEntries = watchEntries;
    const updatedEntries = [...currentEntries];
    updatedEntries[index] = { 
      ...updatedEntries[index], 
      taxable 
    };
    
    setValue('entries', updatedEntries);
  };

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // If tax helper is enabled and has tax entries, use the tax helper endpoint
      if (enableTaxHelper && taxResult) {
        const response = await fetch('/api/tax-helper/create-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: taxResult.entries,
            description: data.description,
            date: data.date
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Transacción creada exitosamente con impuestos' });
          reset();
          setTaxResult(null);
          onTransactionCreated?.();
        } else {
          setMessage({ type: 'error', text: result.error || 'Error al crear la transacción' });
        }
      } else {
        // Use regular transaction creation
        const result = await createTransaction(data);
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Transacción creada exitosamente' });
          reset();
          onTransactionCreated?.();
        } else {
          setMessage({ type: 'error', text: result.error || 'Error al crear la transacción' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear la transacción' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <Input
              {...register("description")}
              placeholder="Descripción de la transacción"
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <Input
              type="date"
              {...register("date")}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Voucher
            </label>
            <select
              {...register("voucherType")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(VOUCHER_TYPE_DESCRIPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tax Helper Toggle */}
        {enableTaxHelper && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enableTaxHelper"
                checked={taxProcessing || taxResult !== null}
                onChange={() => {
                  if (taxResult) {
                    setTaxResult(null);
                    // Reset entries to remove tax entries
                    setValue('entries', fields.map((_, index) => ({
                      accountId: watchEntries[index]?.accountId || '',
                      amount: watchEntries[index]?.amount || 0
                    })));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enableTaxHelper" className="text-sm font-medium text-gray-700">
                Enable Tax Helper (Auto-calculate ISV)
              </label>
            </div>
            {taxProcessing && (
              <p className="text-sm text-blue-600 mt-2">Processing tax calculations...</p>
            )}
          </div>
        )}

        {/* Journal Entries */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Entradas de Diario</h3>
            <Button
              type="button"
              onClick={() => append({ accountId: "", amount: 0, taxable: false } as any)}
              className="flex items-center space-x-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Entrada</span>
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuenta *
                    </label>
                    <Controller
                      name={`entries.${index}.accountId`}
                      control={control}
                      render={({ field }) => (
                        <AccountSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccionar cuenta"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto (L.) *
                    </label>
                    <Controller
                      name={`entries.${index}.amount`}
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0.00"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <Input
                      {...register(`entries.${index}.description` as any)}
                      placeholder="Descripción de la entrada"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    {enableTaxHelper && (
                      <TaxableSwitch
                        checked={watchEntries[index]?.taxable || false}
                        onToggle={(taxable) => toggleTaxable(index, taxable)}
                        amount={Math.round((watchEntries[index]?.amount || 0) * 100)}
                        description={(watchEntries[index] as any)?.description || watchDescription}
                      />
                    )}
                    
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Balance Total:</span>
            <span className={`text-lg font-semibold ${
              totalBalance === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
          {totalBalance !== 0 && (
            <p className="text-red-500 text-sm mt-1">
              Las entradas deben balancear a cero
            </p>
          )}
        </div>

        {/* Tax Result Display */}
        {taxResult && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Tax Calculation Result</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span>
                <div className="font-semibold">{formatCurrency(taxResult.summary.subtotal / 100)}</div>
              </div>
              <div>
                <span className="text-gray-600">Total Tax:</span>
                <div className="font-semibold text-blue-600">{formatCurrency(taxResult.summary.totalTax / 100)}</div>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="font-semibold">{formatCurrency(taxResult.summary.total / 100)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || taxProcessing || totalBalance !== 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Creando...' : 'Crear Transacción'}
          </Button>
        </div>
      </form>
    </div>
  );
}
