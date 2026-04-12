'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save,
  Plus,
  Trash2,
  FileText,
  Upload,
  Eye,
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Ban
} from 'lucide-react';

interface VoucherDetail {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenter?: string;
}

interface VoucherHeader {
  voucherNumber: string;
  voucherType: 'INGRESO' | 'EGRESO' | 'DIARIO' | 'AJUSTE';
  date: string;
  concept: string;
  reference: string;
  status: 'draft' | 'posted' | 'cancelled';
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

export default function VoucherFormPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [voucherHeader, setVoucherHeader] = useState<Partial<VoucherHeader>>({
    voucherNumber: '',
    voucherType: 'DIARIO',
    date: new Date().toISOString().split('T')[0],
    concept: '',
    reference: '',
    status: 'draft',
    createdBy: 'Usuario Actual',
    createdAt: new Date().toISOString()
  });

  const [voucherDetails, setVoucherDetails] = useState<VoucherDetail[]>([
    { id: '1', accountCode: '', accountName: '', debit: 0, credit: 0 },
    { id: '2', accountCode: '', accountName: '', debit: 0, credit: 0 }
  ]);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState<{index: number, type: 'debit' | 'credit'} | null>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [attachedDocument, setAttachedDocument] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  // Cargar cuentas para el selector
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Generar número de póliza automático
  useEffect(() => {
    if (voucherHeader.voucherType) {
      generateVoucherNumber();
    }
  }, [voucherHeader.voucherType]);

  const generateVoucherNumber = async () => {
    // Simulación - en producción llamaría a una API
    const typePrefix = voucherHeader.voucherType?.charAt(0) || 'D';
    const randomNum = Math.floor(Math.random() * 999) + 1;
    setVoucherHeader(prev => ({
      ...prev,
      voucherNumber: `${typePrefix}-${randomNum.toString().padStart(3, '0')}`
    }));
  };

  // Calcular totales en tiempo real
  const totals = voucherDetails.reduce((acc, detail) => {
    acc.totalDebit += detail.debit || 0;
    acc.totalCredit += detail.credit || 0;
    return acc;
  }, { totalDebit: 0, totalCredit: 0 });

  const difference = totals.totalDebit - totals.totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  // Agregar nueva línea
  const addDetailLine = () => {
    const newId = (Math.max(...voucherDetails.map(d => parseInt(d.id))) + 1).toString();
    setVoucherDetails(prev => [...prev, {
      id: newId,
      accountCode: '',
      accountName: '',
      debit: 0,
      credit: 0
    }]);
  };

  // Eliminar línea
  const removeDetailLine = (id: string) => {
    if (voucherDetails.length > 2) {
      setVoucherDetails(prev => prev.filter(d => d.id !== id));
    }
  };

  // Actualizar línea
  const updateDetailLine = (id: string, field: keyof VoucherDetail, value: any) => {
    setVoucherDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, [field]: value } : detail
    ));
  };

  // Seleccionar cuenta
  const selectAccount = (index: number, type: 'debit' | 'credit', account: any) => {
    const detail = voucherDetails[index];
    updateDetailLine(index, 'accountCode', account.code);
    updateDetailLine(index, 'accountName', account.name);
    
    // Si es débito, limpiar crédito y viceversa
    if (type === 'debit') {
      updateDetailLine(index, 'credit', 0);
    } else {
      updateDetailLine(index, 'debit', 0);
    }
    
    setShowAccountSelector(null);
    setAccountSearch('');
  };

  // Filtrar cuentas para búsqueda
  const filteredAccounts = accounts.filter(account => 
    account.code.toLowerCase().includes(accountSearch.toLowerCase()) ||
    account.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  // Manejar carga de documento
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedDocument(file);
      const reader = new FileReader();
      reader.onload = (e) => setDocumentPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Guardar póliza
  const saveVoucher = async () => {
    if (!isBalanced) {
      alert('La póliza no está balanceada. Debe ser igual a cero.');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos para el RPC
      const journalEntries = voucherDetails
        .filter(detail => detail.accountCode && (detail.debit > 0 || detail.credit > 0))
        .map(detail => ({
          accountId: detail.accountCode, // Necesitaríamos el ID real
          amount: detail.debit > 0 ? detail.debit : -detail.credit,
          type: detail.debit > 0 ? 'DEBIT' : 'CREDIT'
        }));

      const voucherData = {
        tenantId: '1', // Hardcoded por ahora
        voucherType: voucherHeader.voucherType,
        voucherNumber: voucherHeader.voucherNumber,
        date: voucherHeader.date,
        description: voucherHeader.concept,
        reference: voucherHeader.reference,
        journalEntries
      };

      // Llamar al RPC existente
      const response = await fetch('/api/accounting/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherData)
      });

      if (response.ok) {
        alert('Póliza guardada exitosamente');
        router.push(`/companies/${companyId}/accounting`);
      } else {
        throw new Error('Error al guardar la póliza');
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Error al guardar la póliza');
    } finally {
      setLoading(false);
    }
  };

  // Anular póliza
  const cancelVoucher = () => {
    if (confirm('¿Está seguro de anular esta póliza? Esta acción no se puede deshacer.')) {
      setVoucherHeader(prev => ({
        ...prev,
        status: 'cancelled',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'Usuario Actual'
      }));
    }
  };

  // Duplicar póliza
  const duplicateVoucher = () => {
    const duplicatedDetails = voucherDetails.map(detail => ({
      ...detail,
      debit: 0,
      credit: 0
    }));
    setVoucherDetails(duplicatedDetails);
    generateVoucherNumber();
    setVoucherHeader(prev => ({
      ...prev,
      concept: `${prev.concept} (COPIA)`,
      reference: '',
      status: 'draft'
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Formulario de Póliza</h1>
                  <p className="text-gray-600">Registro Contable - Partida Doble</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={duplicateVoucher}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              {voucherHeader.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={cancelVoucher}>
                  <Ban className="h-4 w-4 mr-2" />
                  Anular
                </Button>
              )}
              <Button 
                onClick={saveVoucher} 
                disabled={!isBalanced || loading || voucherHeader.status === 'cancelled'}
                className={isBalanced ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Póliza'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabecera de la Póliza */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cabecera de la Póliza</span>
              <Badge variant={voucherHeader.status === 'cancelled' ? 'destructive' : 
                              voucherHeader.status === 'posted' ? 'default' : 'secondary'}>
                {voucherHeader.status === 'draft' ? 'Borrador' : 
                 voucherHeader.status === 'posted' ? 'Posteada' : 'Anulada'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voucherNumber">Número de Póliza</Label>
                <Input
                  id="voucherNumber"
                  value={voucherHeader.voucherNumber || ''}
                  onChange={(e) => setVoucherHeader(prev => ({...prev, voucherNumber: e.target.value}))}
                  placeholder="Auto-generado"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voucherType">Tipo de Póliza</Label>
                <Select 
                  value={voucherHeader.voucherType} 
                  onValueChange={(value: any) => setVoucherHeader(prev => ({...prev, voucherType: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                    <SelectItem value="DIARIO">Diario</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha Contable</Label>
                <Input
                  id="date"
                  type="date"
                  value={voucherHeader.date || ''}
                  onChange={(e) => setVoucherHeader(prev => ({...prev, date: e.target.value}))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="concept">Concepto/Glosa General</Label>
                <Textarea
                  id="concept"
                  value={voucherHeader.concept || ''}
                  onChange={(e) => setVoucherHeader(prev => ({...prev, concept: e.target.value}))}
                  placeholder="Descripción clara de la operación..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={voucherHeader.reference || ''}
                  onChange={(e) => setVoucherHeader(prev => ({...prev, reference: e.target.value}))}
                  placeholder="Cheque #, Transferencia, Factura..."
                />
              </div>
            </div>

            {/* Documento Fuente */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <Label className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Documento Fuente (Soporte)</span>
              </Label>
              <div className="mt-2 flex items-center space-x-4">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="flex-1"
                />
                {attachedDocument && (
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                )}
              </div>
              {documentPreview && (
                <div className="mt-2 p-2 bg-white border rounded">
                  <img src={documentPreview} alt="Preview" className="max-h-32 mx-auto" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detalle de la Póliza */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detalle de Partida Doble</span>
              <Button variant="outline" size="sm" onClick={addDetailLine}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Línea
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Cuenta</th>
                    <th className="text-left p-2">Nombre</th>
                    <th className="text-center p-2 w-32">Debe</th>
                    <th className="text-center p-2 w-32">Haber</th>
                    <th className="text-center p-2 w-24">Centro Costo</th>
                    <th className="text-center p-2 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {voucherDetails.map((detail, index) => (
                    <tr key={detail.id} className="border-b">
                      <td className="p-2">
                        <div className="relative">
                          <Input
                            value={detail.accountCode}
                            onChange={(e) => updateDetailLine(detail.id, 'accountCode', e.target.value)}
                            placeholder="Código"
                            className="w-24"
                            onFocus={() => setShowAccountSelector({index, type: 'debit'})}
                          />
                          {showAccountSelector?.index === index && (
                            <div className="absolute top-full left-0 mt-1 w-96 bg-white border rounded-lg shadow-lg z-10">
                              <Input
                                placeholder="Buscar cuenta..."
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                className="m-2"
                                autoFocus
                              />
                              <div className="max-h-48 overflow-y-auto">
                                {filteredAccounts.slice(0, 10).map(account => (
                                  <div
                                    key={account.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => selectAccount(index, showAccountSelector.type, account)}
                                  >
                                    <div className="font-medium">{account.code}</div>
                                    <div className="text-sm text-gray-600">{account.name}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Input
                          value={detail.accountName}
                          onChange={(e) => updateDetailLine(detail.id, 'accountName', e.target.value)}
                          placeholder="Nombre de cuenta"
                          className="w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={detail.debit || ''}
                          onChange={(e) => updateDetailLine(detail.id, 'debit', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-center"
                          onFocus={() => setShowAccountSelector({index, type: 'debit'})}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={detail.credit || ''}
                          onChange={(e) => updateDetailLine(detail.id, 'credit', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-center"
                          onFocus={() => setShowAccountSelector({index, type: 'credit'})}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={detail.costCenter || ''}
                          onChange={(e) => updateDetailLine(detail.id, 'costCenter', e.target.value)}
                          placeholder="Opcional"
                          className="w-full text-center"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDetailLine(detail.id)}
                          disabled={voucherDetails.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y Validación */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Total Debe:</span>
                    <span className="ml-2 font-semibold">{totals.totalDebit.toFixed(2)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Total Haber:</span>
                    <span className="ml-2 font-semibold">{totals.totalCredit.toFixed(2)}</span>
                  </div>
                  <div className={`text-sm flex items-center ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {isBalanced ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    <span className="font-semibold">
                      Diferencia: {Math.abs(difference).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isBalanced ? 'Póliza balanceada' : 'Póliza desbalanceada'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pista de Auditoría */}
        {(voucherHeader.createdAt || voucherHeader.modifiedAt) && (
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Pista de Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Creado por:</span> {voucherHeader.createdBy} - 
                  {new Date(voucherHeader.createdAt || '').toLocaleString()}
                </div>
                {voucherHeader.modifiedAt && (
                  <div>
                    <span className="font-medium">Modificado por:</span> {voucherHeader.modifiedBy} - 
                    {new Date(voucherHeader.modifiedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
