"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormValues } from "@/lib/validations/transaction";
import { createTransaction } from "@/lib/actions/transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { AccountSelector } from "@/components/account-selector";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { VOUCHER_TYPE_DESCRIPTIONS, VOUCHER_TYPES } from "@/lib/voucher-types";
import { TrialGate } from "@/components/trial-gate";
import { useTenant } from "@/lib/contexts/TenantContext";

const TRIAL_TRANSACTION_LIMIT = 50;

export function TransactionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { register, control, handleSubmit, watch, formState: { errors }, reset } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      date: new Date().toISOString().split('T')[0],
      voucherType: VOUCHER_TYPES.DIARIO,
      entries: [{ accountId: "", amount: 0 }, { accountId: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });
  
  // Calculate running balance for UI
  const watchEntries = watch("entries");
  const totalBalance = watchEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const result = await createTransaction(data);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Transacción creada exitosamente' });
        reset(); // Reset form to default values
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al crear la transacción' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear la transacción' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 border rounded-lg bg-white shadow-sm">
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input {...register("description")} placeholder="e.g., Monthly Cleaning - Patient J. Doe" />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" {...register("date")} />
          {errors.date && (
            <p className="text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Póliza</label>
        <Controller
          name="voucherType"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(VOUCHER_TYPE_DESCRIPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        />
        {errors.voucherType && (
          <p className="text-sm text-red-600">{errors.voucherType.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Journal Entries</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: "", amount: 0 })}>
            <Plus className="w-4 h-4 mr-1" /> Add Line
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-1">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Account</label>
              <Controller
                name={`entries.${index}.accountId`}
                control={control}
                render={({ field }) => (
                  <AccountSelector
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select account..."
                  />
                )}
              />
              {errors.entries?.[index]?.accountId && (
                <p className="text-sm text-red-600">{errors.entries[index]?.accountId?.message}</p>
              )}
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Amount</label>
              <Controller
                name={`entries.${index}.amount`}
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="L. 0.00"
                  />
                )}
              />
              {errors.entries?.[index]?.amount && (
                <p className="text-sm text-red-600">{errors.entries[index]?.amount?.message}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {errors.entries && (
          <p className="text-sm text-red-600">{errors.entries.message}</p>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {totalBalance === 0 ? (
            <span className="flex items-center text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Balanceado
            </span>
          ) : (
            <span className="flex items-center text-destructive text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-1" /> Desbalanceado: L. {(totalBalance / 100).toFixed(2)}
            </span>
          )}
        </div>
        <Button type="submit" disabled={totalBalance !== 0 || isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Post Transaction'}
        </Button>
      </div>
    </form>
  );
}