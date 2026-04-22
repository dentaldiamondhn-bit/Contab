"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Import,
  FileDown,
  UserPlus,
  Calculator,
  Receipt,
  CreditCard,
  PlusCircle,
  Table,
  Grid3x3
} from 'lucide-react';
import { supabase } from '@/lib/supabase/standard-client';

interface Customer {
  id: string;
  tenantid: string;
  rtn: string;
  name: string;
  email?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  contactType?: string;
  otherTypeDescription?: string;
  observations?: string;
  contactCode: string;
  accounting?: string;
  retentions?: string;
  retentionAccount?: string;
  retentionPercentage?: string;
  taxpayerType?: string;
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

interface RetentionField {
  id: string;
  account: string;
  percentage: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface NewCustomerData {
  tenantid: string;
  rtn: string;
  name: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  contactType: string;
  otherTypeDescription: string;
  observations: string;
  contactCode: string;
  accounting: string;
  retentions: string;
  taxpayerType: string;
  retentionFields: RetentionField[];
  files: UploadedFile[];
}

interface Company {
  id: string;
  businessname: string;
  businessrtn: string;
}

interface Tax {
  id: string;
  tenantId: string;
  name: string;
  type: 'IVA' | 'ISR' | 'ISV' | 'OTRO';
  rate: number;
  description?: string;
  isActive: boolean;
}

interface Retention {
  id: string;
  tenantId: string;
  name: string;
  type: 'IVA' | 'ISR' | 'ISV' | 'OTRO';
  rate: number;
  description?: string;
  isActive: boolean;
}

interface CustomerTax {
  id: string;
  customerId: string;
  taxId?: string;
  retentionId?: string;
  customRate?: number;
  customDescription?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [customerTaxes, setCustomerTaxes] = useState<CustomerTax[]>([]);
  const [customerRetentions, setCustomerRetentions] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showAddTaxDialog, setShowAddTaxDialog] = useState(false);
  const [showEditTaxDialog, setShowEditTaxDialog] = useState(false);
  const [showAddRetentionDialog, setShowAddRetentionDialog] = useState(false);
  const [showEditRetentionDialog, setShowEditRetentionDialog] = useState(false);
  const [editingTax, setEditingTax] = useState<CustomerTax | null>(null);
  const [editingRetention, setEditingRetention] = useState<CustomerTax | null>(null);
  const [taxFormData, setTaxFormData] = useState({
    taxId: '',
    customRate: '',
    customDescription: ''
  });
  const [retentionFormData, setRetentionFormData] = useState({
    retentionId: '',
    customRate: '',
    customDescription: ''
  });
  const [formData, setFormData] = useState<NewCustomerData>({
    tenantid: '',
    rtn: '',
    name: '',
    email: '',
    phone: '',
    phone2: '',
    address: '',
    contactType: '',
    otherTypeDescription: '',
    observations: '',
    contactCode: '',
    accounting: '',
    retentions: '',
    taxpayerType: '',
    retentionFields: [{ id: '1', account: '', percentage: '' }],
    files: []
  });
  const [importDialog, setImportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  
  useEffect(() => {
    loadCustomers();
    loadCompanies();
    loadTaxes();
    loadRetentions();
  }, []);

  const loadTaxes = async () => {
    try {
      // TODO: Create Taxes table in database
      // const { data, error } = await supabase
      //   .from('Taxes')
      //   .select('*')
      //   .eq('isActive', true)
      //   .order('name', { ascending: true });

      // if (error) throw error;
      // setTaxes(data || []);
      setTaxes([]); // Temporarily empty until table is created
    } catch (error) {
      console.error('Error loading taxes:', error);
    }
  };

  const loadRetentions = async () => {
    try {
      // TODO: Create Retentions table in database
      // const { data, error } = await supabase
      //   .from('Retentions')
      //   .select('*')
      //   .eq('isActive', true)
      //   .order('name', { ascending: true });

      // if (error) throw error;
      // setRetentions(data || []);
      setRetentions([]); // Temporarily empty until table is created
    } catch (error) {
      console.error('Error loading retentions:', error);
    }
  };

  const loadCustomerTaxes = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('CustomerTaxes')
        .select(`
          *,
          Taxes(name, type, rate),
          Retentions(name, type, rate)
        `)
        .eq('customerId', customerId)
        .eq('isActive', true);

      if (error) throw error;
      setCustomerTaxes(data || []);
    } catch (error) {
      console.error('Error loading customer taxes:', error);
    }
  };

  const loadCustomerRetentions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('CustomerRetentions')
        .select('*')
        .eq('customerid', customerId)
        .eq('isActive', true);

      if (error) throw error;
      setCustomerRetentions(data || []);
    } catch (error) {
      console.error('Error loading customer retentions:', error);
    }
  };

  // Function to generate automatic contact code
  const generateContactCode = () => {
    const prefix = 'CT'; // Contact prefix
    const timestamp = Date.now().toString(36).toUpperCase(); // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 random chars
    return `${prefix}${timestamp}${random}`;
  };

  const loadCompanies = async () => {
    try {
      // Usar los mismos datos mock que la página de companies para consistencia
      const mockCompanies = [
        {
          id: "1",
          businessname: "Dental Diamond Center",
          businessrtn: "08011999012345"
        },
        {
          id: "2", 
          businessname: "Clínica Médica San José",
          businessrtn: "08011999067890"
        },
        {
          id: "3",
          businessname: "Lab Dental Pro",
          businessrtn: "08011999054321"
        }
      ];
      
      setCompanies(mockCompanies);
      
      // Opcional: Intentar cargar desde la base de datos real si existe
      try {
        const { data, error } = await supabase
          .from('Tenant')
          .select('id, businessname, businessrtn')
          .order('businessname', { ascending: true });

        if (!error && data && data.length > 0) {
          setCompanies(data);
        }
      } catch (dbError) {
        console.log('Usando datos mock - tabla Tenant no disponible');
      }
      
    } catch (error) {
      console.error('Error loading companies:', error);
      // Asegurarse de que siempre haya datos disponibles
      setCompanies([
        {
          id: "1",
          businessname: "Dental Diamond Center", 
          businessrtn: "08011999012345"
        }
      ]);
    }
  };

  // Functions to handle taxes
  const handleAddTax = async () => {
    if (!selectedCustomer) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .insert({
          customerId: selectedCustomer.id,
          tenantId: selectedCustomer.tenantid,
          taxId: taxFormData.taxId,
          customRate: parseFloat(taxFormData.customRate),
          customDescription: taxFormData.customDescription,
          isActive: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Impuesto agregado exitosamente' });
      setShowAddTaxDialog(false);
      setTaxFormData({ taxId: '', customRate: '', customDescription: '' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error adding tax:', error);
      setMessage({ type: 'error', text: error.message || 'Error al agregar impuesto' });
    }
  };

  const handleEditTax = async () => {
    if (!selectedCustomer || !editingTax) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .update({
          taxId: taxFormData.taxId,
          customRate: parseFloat(taxFormData.customRate),
          customDescription: taxFormData.customDescription,
          updatedat: new Date().toISOString()
        })
        .eq('id', editingTax.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Impuesto actualizado exitosamente' });
      setShowEditTaxDialog(false);
      setEditingTax(null);
      setTaxFormData({ taxId: '', customRate: '', customDescription: '' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error updating tax:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar impuesto' });
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!selectedCustomer) return;
    
    if (!confirm('¿Está seguro de que desea eliminar este impuesto?')) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .delete()
        .eq('id', taxId);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Impuesto eliminado exitosamente' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error deleting tax:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar impuesto' });
    }
  };

  // Functions to handle retentions
  const handleAddRetention = async () => {
    if (!selectedCustomer) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .insert({
          customerId: selectedCustomer.id,
          tenantId: selectedCustomer.tenantid,
          retentionId: retentionFormData.retentionId,
          customRate: parseFloat(retentionFormData.customRate),
          customDescription: retentionFormData.customDescription,
          isActive: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Retención agregada exitosamente' });
      setShowAddRetentionDialog(false);
      setRetentionFormData({ retentionId: '', customRate: '', customDescription: '' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error adding retention:', error);
      setMessage({ type: 'error', text: error.message || 'Error al agregar retención' });
    }
  };

  const handleEditRetention = async () => {
    if (!selectedCustomer || !editingRetention) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .update({
          retentionId: retentionFormData.retentionId,
          customRate: parseFloat(retentionFormData.customRate),
          customDescription: retentionFormData.customDescription,
          updatedat: new Date().toISOString()
        })
        .eq('id', editingRetention.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Retención actualizada exitosamente' });
      setShowEditRetentionDialog(false);
      setEditingRetention(null);
      setRetentionFormData({ retentionId: '', customRate: '', customDescription: '' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error updating retention:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar retención' });
    }
  };

  const handleDeleteRetention = async (retentionId: string) => {
    if (!selectedCustomer) return;
    
    if (!confirm('¿Está seguro de que desea eliminar esta retención?')) return;
    
    try {
      const { error } = await supabase
        .from('CustomerTaxes')
        .delete()
        .eq('id', retentionId);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Retención eliminada exitosamente' });
      loadCustomerTaxes(selectedCustomer.id);
    } catch (error: any) {
      console.error('Error deleting retention:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar retención' });
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Customer')
        .select('*')
        .order('createdat', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setMessage({ type: 'error', text: 'Error al cargar los contactos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let customerId: string;

      // Prepare customer data (exclude retentionFields and files)
      const customerData = {
        tenantid: formData.tenantid,
        rtn: formData.rtn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        phone2: formData.phone2,
        address: formData.address,
        contactType: formData.contactType,
        otherTypeDescription: formData.otherTypeDescription,
        observations: formData.observations,
        contactCode: editingCustomer ? formData.contactCode : generateContactCode(),
        accounting: formData.accounting,
        retentions: formData.retentions,
        taxpayerType: formData.taxpayerType,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      };

      if (editingCustomer) {
        // Update existing customer
        const { data, error } = await supabase
          .from('Customer')
          .update(customerData)
          .eq('id', editingCustomer.id)
          .select('id')
          .single();

        if (error) throw error;
        if (!data || !data.id) {
          throw new Error('No se pudo obtener el ID del contacto actualizado');
        }
        customerId = data.id;
        setMessage({ type: 'success', text: 'Contacto actualizado exitosamente' });
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('Customer')
          .insert(customerData)
          .select('id')
          .single();

        if (error) throw error;
        if (!data || !data.id) {
          throw new Error('No se pudo obtener el ID del contacto creado');
        }
        customerId = data.id;
        setMessage({ type: 'success', text: 'Contacto creado exitosamente' });
      }

      // DEBUG: Log customerId value
      console.log('DEBUG - customerId before saving retentions:', customerId);
      console.log('DEBUG - editingCustomer:', editingCustomer);
      console.log('DEBUG - retentionFields:', formData.retentionFields);

      // Save retentions in separate table
      if (formData.retentionFields && formData.retentionFields.length > 0) {
        const validRetentions = formData.retentionFields.filter(r => r.account && r.percentage);
        
        console.log('DEBUG - validRetentions:', validRetentions);
        console.log('DEBUG - customerId in retention block:', customerId);
        
        if (validRetentions.length > 0 && customerId) {
          // Delete existing retentions if editing
          if (editingCustomer) {
            await supabase
              .from('CustomerRetentions')
              .delete()
              .eq('customerid', customerId);
          }

          // Insert new retentions
          const retentionData = validRetentions.map(retention => ({
            customerid: customerId || editingCustomer?.id || 'unknown',
            tenantid: formData.tenantid,
            account: retention.account,
            percentage: parseFloat(retention.percentage),
            description: `Retención ${retention.percentage}% en cuenta ${retention.account}`,
            isActive: true,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          }));

          console.log('DEBUG - retentionData to insert:', retentionData);
          console.log('DEBUG - customerId value:', customerId);
          console.log('DEBUG - editingCustomer.id:', editingCustomer?.id);
          console.log('DEBUG - First retention item:', retentionData[0]);

          const { error: retentionError } = await supabase
            .from('CustomerRetentions')
            .insert(retentionData);

          if (retentionError) {
            console.error('Error saving retentions:', retentionError);
            console.error('DEBUG - Full retention data being sent:', JSON.stringify(retentionData, null, 2));
            // Don't throw error, just log it - customer was saved successfully
          } else {
            console.log('DEBUG - Retentions saved successfully, reloading...');
            await loadCustomerRetentions(customerId);
          }
        } else if (!customerId) {
          console.error('DEBUG - customerId is null or undefined, skipping retention save');
        }
      }

      // Save files in separate table (in a real implementation, you would upload files first)
      // For now, we'll just log the files
      if (formData.files && formData.files.length > 0) {
        console.log('Files to save:', formData.files);
        // TODO: Implement file upload logic here
        // This would involve uploading files to storage and then saving metadata to CustomerFiles table
      }

      // Reset form and close dialog
      setFormData({ tenantid: '', rtn: '', name: '', email: '', phone: '', phone2: '', address: '', contactType: '', otherTypeDescription: '', observations: '', contactCode: '', accounting: '', retentions: '', taxpayerType: '', retentionFields: [{ id: '1', account: '', percentage: '' }], files: [] });
      setEditingCustomer(null);
      setShowAddDialog(false);
      loadCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar el contacto' });
    } finally {
      setLoading(false);
    }
  };

  // Functions to handle dynamic retention fields
  const addRetentionField = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      retentionFields: [...prev.retentionFields, { id: newId, account: '', percentage: '' }]
    }));
  };

  const removeRetentionField = (id: string) => {
    if (formData.retentionFields.length > 1) {
      setFormData(prev => ({
        ...prev,
        retentionFields: prev.retentionFields.filter(field => field.id !== id)
      }));
    }
  };

  const updateRetentionField = (id: string, field: 'account' | 'percentage', value: string) => {
    setFormData(prev => ({
      ...prev,
      retentionFields: prev.retentionFields.map(retention => 
        retention.id === id ? { ...retention, [field]: value } : retention
      )
    }));
  };

  // Functions to handle file uploads
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    selectedFiles.forEach(file => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        status: 'pending'
      };
      
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, newFile]
      }));
    });
    
    // Clear the input
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈';
    return '📎';
  };

  const handleEdit = async (customer: Customer) => {
    setEditingCustomer(customer);
    
    // Load customer retentions from database
    try {
      const { data: retentionsData, error: retentionsError } = await supabase
        .from('CustomerRetentions')
        .select('*')
        .eq('customerid', customer.id)
        .eq('isActive', true);

      if (!retentionsError && retentionsData && retentionsData.length > 0) {
        // Convert database retentions to form format
        const retentionFields = retentionsData.map((retention, index) => ({
          id: (index + 1).toString(),
          account: retention.account,
          percentage: retention.percentage.toString()
        }));
        
        setFormData({
          tenantid: customer.tenantid,
          rtn: customer.rtn,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          phone2: '', // Reset phone2 for editing
          address: customer.address || '',
          contactType: customer.contactType || '',
          otherTypeDescription: customer.otherTypeDescription || '',
          observations: customer.observations || '',
          contactCode: customer.contactCode || '',
          accounting: customer.accounting || '',
          retentions: customer.retentions || '',
          taxpayerType: customer.taxpayerType || '',
          retentionFields: retentionFields,
          files: []
        });
      } else {
        // No retentions found, use empty form
        setFormData({
          tenantid: customer.tenantid,
          rtn: customer.rtn,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          phone2: '', // Reset phone2 for editing
          address: customer.address || '',
          contactType: customer.contactType || '',
          otherTypeDescription: customer.otherTypeDescription || '',
          observations: customer.observations || '',
          contactCode: customer.contactCode || '',
          accounting: customer.accounting || '',
          retentions: customer.retentions || '',
          taxpayerType: customer.taxpayerType || '',
          retentionFields: [{ id: '1', account: '', percentage: '' }],
          files: []
        });
      }
    } catch (error) {
      console.error('Error loading customer retentions:', error);
      // Fallback to empty form
      setFormData({
        tenantid: customer.tenantid,
        rtn: customer.rtn,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        phone2: '', // Reset phone2 for editing
        address: customer.address || '',
        contactType: customer.contactType || '',
        otherTypeDescription: customer.otherTypeDescription || '',
        observations: customer.observations || '',
        contactCode: customer.contactCode || '',
        accounting: customer.accounting || '',
        retentions: customer.retentions || '',
        taxpayerType: customer.taxpayerType || '',
        retentionFields: [{ id: '1', account: '', percentage: '' }],
        files: []
      });
    }
    
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este contacto?')) return;

    try {
      const { error } = await supabase
        .from('Customer')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Contacto eliminado exitosamente' });
      loadCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      handleDeleteError(error);
    }
  };

  const handleDeleteError = (error: any) => {
    console.error('Delete error details:', error);
    if (error.code === '23503') {
      setMessage({ 
        type: 'error', 
        text: 'No se puede eliminar este contacto porque tiene facturas asociadas. Elimine las facturas primero.' 
      });
    } else if (error.code === '23514') {
      setMessage({ 
        type: 'error', 
        text: 'No se puede eliminar este contacto porque tiene cuentas por cobrar asociadas.' 
      });
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Error al eliminar el contacto. Inténtelo de nuevo.' 
      });
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    try {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const { error } = await supabase
        .from('Customer')
        .update({
          where: { id },
          data: {
            isactive: !customer.isactive,
            updatedat: new Date().toISOString()
          }
        });

      if (error) throw error;
      setMessage({ 
        type: 'success', 
        text: `Contacto ${customer.isactive ? 'desactivado' : 'activado'} exitosamente` 
      });
      loadCustomers();
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      setMessage({ type: 'error', text: 'Error al cambiar el estado del contacto' });
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setLoading(true);
    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of lines) {
        const [rtn, name, email, phone, address] = line.split(',').map(item => item.trim());
        
        if (rtn && name) {
          try {
            const { error } = await supabase
              .from('Customer')
              .upsert({
                rtn: rtn,
                name: name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                isactive: true,
                createdat: new Date().toISOString(),
                updatedat: new Date().toISOString(),
                tenantid: formData.tenantid || 'default'
              }, {
                onConflict: 'rtn'
              });

            if (!error) successCount++;
            else errorCount++;
          } catch (error) {
            console.error(`Error importing ${rtn}:`, error);
            errorCount++;
          }
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Importación completada: ${successCount} contactos importados, ${errorCount} con errores` 
      });
      setImportFile(null);
      loadCustomers();
    } catch (error: any) {
      console.error('Error importing customers:', error);
      setMessage({ type: 'error', text: 'Error al importar los contactos' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const csvContent = [
        ['RTN', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Estado', 'Fecha Creación'],
        ...customers.map(c => [
          c.rtn,
          c.name,
          c.email || '',
          c.phone || '',
          c.address || '',
          c.isactive ? 'Activo' : 'Inactivo',
          new Date(c.createdat).toLocaleDateString('es-HN')
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Contactos exportados exitosamente' });
    } catch (error: any) {
      console.error('Error exporting customers:', error);
      setMessage({ type: 'error', text: 'Error al exportar los contactos' });
    } finally {
      setLoading(false);
      setExportDialog(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rtn.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCustomers = filteredCustomers.filter(c => c.isactive);
  const inactiveCustomers = filteredCustomers.filter(c => !c.isactive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes y prospectos
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Contacto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Editar Contacto' : 'Nuevo Contacto'}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer 
                    ? 'Modifica los datos del contacto existente'
                    : 'Agrega un nuevo cliente o prospecto'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="informacion" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="informacion">Información Básica</TabsTrigger>
                    <TabsTrigger value="fiscal">Información Fiscal</TabsTrigger>
                    <TabsTrigger value="adicional">Información Adicional</TabsTrigger>
                  </TabsList>

                  {/* Información Básica Tab */}
                  <TabsContent value="informacion" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="contactCode">Código de Contacto</Label>
                        <Input
                          id="contactCode"
                          value={formData.contactCode}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                          placeholder="Se generará automáticamente"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Este código se genera automáticamente al guardar el contacto
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="tenantid">Empresa *</Label>
                        <select
                          id="tenantid"
                          value={formData.tenantid}
                          onChange={(e) => setFormData(prev => ({ ...prev, tenantid: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Seleccionar empresa</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>
                              {company.businessname} ({company.businessrtn})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="name">Nombre del Contacto *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre completo del contacto"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="rtn">RTN del Contacto *</Label>
                        <Input
                          id="rtn"
                          value={formData.rtn}
                          onChange={(e) => setFormData(prev => ({ ...prev, rtn: e.target.value }))}
                          placeholder="Ej: 0801-1999-12345"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactType">Tipo de Contacto *</Label>
                        <select
                          id="contactType"
                          value={formData.contactType}
                          onChange={(e) => setFormData(prev => ({ ...prev, contactType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Seleccionar tipo</option>
                          <option value="empresa">Empresa</option>
                          <option value="persona">Persona</option>
                          <option value="consumidor_final">Consumidor Final</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      {formData.contactType === 'otro' && (
                        <div>
                          <Label htmlFor="otherTypeDescription">Especificar tipo de contacto *</Label>
                          <Input
                            id="otherTypeDescription"
                            value={formData.otherTypeDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, otherTypeDescription: e.target.value }))}
                            placeholder="Ej: Proveedor, Sociedad Anónima, etc."
                            required
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono Principal</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+504 1234 5678"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone2">Teléfono Secundario (Opcional)</Label>
                        <Input
                          id="phone2"
                          value={formData.phone2}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone2: e.target.value }))}
                          placeholder="+504 9876 5432"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Dirección fiscal completa"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Información Fiscal Tab */}
                  <TabsContent value="fiscal" className="space-y-4">
                    {/* Impuestos Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Impuestos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="taxpayerType">Tipo de Contribuyente</Label>
                          <select
                            id="taxpayerType"
                            value={formData.taxpayerType}
                            onChange={(e) => setFormData(prev => ({ ...prev, taxpayerType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar tipo de contribuyente</option>
                            <option value="grande">Grande</option>
                            <option value="mediano">Mediano</option>
                            <option value="pequeno">Pequeño</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Clasificación fiscal del contribuyente según la SAR
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Retenciones Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Retenciones</h3>
                        <Button
                          type="button"
                          onClick={addRetentionField}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Agregar Retención
                        </Button>
                      </div>
                      
                      {formData.retentionFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                          <div>
                            <Label htmlFor={`account-${field.id}`}>Selecciona una cuenta</Label>
                            <select
                              id={`account-${field.id}`}
                              value={field.account}
                              onChange={(e) => updateRetentionField(field.id, 'account', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Seleccionar cuenta</option>
                              
                              {/* 1. Activos */}
                              <optgroup label="1. Activos">
                                <option value="1101-01">Caja General</option>
                                <option value="1101-02">Bancos</option>
                                <option value="1102-01">Clientes</option>
                                <option value="1102-02">Empleados</option>
                                <option value="1103-01">Inventarios</option>
                                <option value="1201-01">Mobiliario y Equipo</option>
                                <option value="1201-02">Equipo de Computación</option>
                                <option value="1201-03">Equipo Médico</option>
                                <option value="1201-04">Depreciación Acumulada</option>
                              </optgroup>

                              {/* 2. Pasivos */}
                              <optgroup label="2. Pasivos">
                                <option value="2101-01">Proveedores</option>
                                <option value="2102-01">ISV por Pagar</option>
                                <option value="2102-02">Retenciones ISR</option>
                                <option value="2103-01">Planilla por Pagar</option>
                                <option value="2103-02">IHSS/RAP por Pagar</option>
                              </optgroup>

                              {/* 3. Patrimonio */}
                              <optgroup label="3. Patrimonio">
                                <option value="3101-01">Capital Social</option>
                                <option value="3201-01">Utilidades Retenidas</option>
                                <option value="3201-02">Utilidad del Ejercicio</option>
                              </optgroup>

                              {/* 4. Ingresos */}
                              <optgroup label="4. Ingresos">
                                <option value="4101-01">Servicios y Honorarios</option>
                                <option value="4101-02">Alquileres</option>
                                <option value="4201-01">Intereses Ganados</option>
                              </optgroup>

                              {/* 5. Gastos */}
                              <optgroup label="5. Gastos">
                                <option value="5101-01">Sueldos y Salarios</option>
                                <option value="5101-02">Seguridad Social</option>
                                <option value="5101-03">Servicios Públicos</option>
                                <option value="5101-04">Alquiler de Local</option>
                                <option value="5201-01">Publicidad</option>
                                <option value="5301-01">Comisiones Bancarias</option>
                              </optgroup>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Cuenta para recibir retenciones
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor={`percentage-${field.id}`}>Porcentaje de Retención</Label>
                            <Input
                              id={`percentage-${field.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={field.percentage}
                              onChange={(e) => updateRetentionField(field.id, 'percentage', e.target.value)}
                              placeholder="15.00"
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Porcentaje aplicable (ej: 15.00 para 15%)
                            </p>
                          </div>
                          
                          <div className="flex items-end">
                            {formData.retentionFields.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeRetentionField(field.id)}
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Información Fiscal Adicional</h4>
                      <p className="text-sm text-blue-600">
                        La configuración fiscal aquí establecida se usará automáticamente al generar facturas y documentos para este contacto.
                      </p>
                    </div>
                  </TabsContent>

                  {/* Información Adicional Tab */}
                  <TabsContent value="adicional" className="space-y-4">
                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Documentos Adjuntos</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Agrega documentos relacionados con este contacto (contratos, identificaciones, etc.)
                        </p>
                      </div>
                      
                      {/* File Upload Area */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <Upload className="h-12 w-12 text-gray-400" />
                          <div className="text-sm text-gray-600">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                              Haz clic para subir archivos
                            </span>
                            <span className="block">o arrastra y suelta</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            PDF, Word, Excel, PowerPoint, imágenes (Máx. 10MB por archivo)
                          </p>
                        </label>
                      </div>

                      {/* Files List */}
                      {formData.files.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Archivos seleccionados:</Label>
                          <div className="space-y-2">
                            {formData.files.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">{getFileIcon(file.type)}</span>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeFile(file.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Observations Section */}
                    <div>
                      <Label htmlFor="observations">Observaciones (Opcional)</Label>
                      <Textarea
                        id="observations"
                        value={formData.observations}
                        onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                        placeholder="Notas adicionales sobre el contacto, preferencias, información relevante, etc."
                        className="min-h-[150px] resize-none"
                        rows={5}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Incluye cualquier información adicional que sea relevante para este contacto
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingCustomer(null);
                      setFormData({ tenantid: '', rtn: '', name: '', email: '', phone: '', phone2: '', address: '', contactType: '', otherTypeDescription: '', observations: '', contactCode: '', accounting: '', retentions: '', taxpayerType: '', retentionFields: [{ id: '1', account: '', percentage: '' }], files: [] });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : (editingCustomer ? 'Actualizar' : 'Guardar')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={importDialog} onOpenChange={setImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Import className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Importar Contactos</DialogTitle>
                <DialogDescription>
                  Importa contactos desde un archivo CSV (formato: RTN, Nombre, Email, Teléfono, Dirección)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <Label htmlFor="file">Archivo CSV</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportDialog(false);
                      setImportFile(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || !importFile}>
                    {loading ? 'Importando...' : 'Importar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={exportDialog} onOpenChange={setExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Exportar Contactos</DialogTitle>
                <DialogDescription>
                  Exporta todos los contactos a un archivo CSV
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Se exportarán {customers.length} contactos en formato CSV.
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    onClick={() => setExportDialog(false)}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleExport} disabled={loading}>
                    {loading ? 'Exportando...' : 'Exportar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, RTN, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none border-l"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCustomers.length} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactos Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCustomers.length}</div>
            <p className="text-xs text-muted-foreground">
              {((activeCustomers.length / customers.length) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactos Inactivos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inactiveCustomers.length}</div>
            <p className="text-xs text-muted-foreground">
              {((inactiveCustomers.length / customers.length) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      {viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${customer.isactive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <CardDescription className="text-sm">
                        RTN: {customer.rtn}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={customer.isactive ? 'default' : 'secondary'}>
                    {customer.isactive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {customer.address}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        loadCustomerTaxes(customer.id);
                        loadCustomerRetentions(customer.id);
                        setShowTaxDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Accounting and Retention Summary */}
                <div className="space-y-2 pb-2 border-b">
                  {customer.accounting && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600">Contabilidad: {customer.accounting}</span>
                    </div>
                  )}
                  {customer.retentions && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CreditCard className="h-4 w-4 text-orange-600" />
                      <span className="text-gray-600">Retenciones: {customer.retentions}</span>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RTN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${customer.isactive ? 'bg-green-500' : 'bg-red-500'} mr-3`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            {customer.contactCode && (
                              <div className="text-xs text-gray-500">Código: {customer.contactCode}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.rtn}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.email || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.phone || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant={customer.isactive ? 'default' : 'secondary'}>
                          {customer.isactive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              loadCustomerTaxes(customer.id);
                              loadCustomerRetentions(customer.id);
                              setShowTaxDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron contactos' : 'No hay contactos registrados'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No hay contactos que coincidan con "${searchTerm}"`
              : 'Empieza agregando tu primer contacto'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Contacto
            </Button>
          )}
        </div>
      )}

      {/* Customer Details Dialog */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Contacto</DialogTitle>
            <DialogDescription>
              {selectedCustomer && `Información completa y configuración fiscal de ${selectedCustomer.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="informacion" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="informacion">Información</TabsTrigger>
                <TabsTrigger value="retenciones">Retenciones</TabsTrigger>
              </TabsList>

              {/* Información Tab */}
              <TabsContent value="informacion" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Código de Contacto</Label>
                      <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded">
                        {selectedCustomer.contactCode || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nombre</Label>
                      <p className="text-lg">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">RTN</Label>
                      <p className="text-lg">{selectedCustomer.rtn}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo de Contacto</Label>
                      <p className="text-lg capitalize">
                        {selectedCustomer.contactType === 'otro' 
                          ? `${selectedCustomer.otherTypeDescription || 'Otro'}`
                          : selectedCustomer.contactType?.replace('_', ' ')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p className="text-lg">{selectedCustomer.email || 'No registrado'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Teléfono Principal</Label>
                      <p className="text-lg">{selectedCustomer.phone || 'No registrado'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Teléfono Secundario</Label>
                      <p className="text-lg">{selectedCustomer.phone2 || 'No registrado'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Dirección</Label>
                      <p className="text-lg">{selectedCustomer.address || 'No registrada'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Estado</Label>
                      <Badge variant={selectedCustomer.isactive ? 'default' : 'secondary'}>
                        {selectedCustomer.isactive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Fecha de Creación</Label>
                      <p className="text-lg">
                        {new Date(selectedCustomer.createdat).toLocaleDateString('es-HN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedCustomer.observations && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Observaciones</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">
                      {selectedCustomer.observations}
                    </p>
                  </div>
                )}
              </TabsContent>

              
              {/* Retenciones Tab */}
              <TabsContent value="retenciones" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Retenciones Aplicables</h3>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar Retención
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {customerRetentions.map((retention) => (
                    <Card key={retention.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Retención Cuenta {retention.account}</CardTitle>
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            {retention.percentage}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cuenta:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {retention.account}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Porcentaje:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {retention.percentage}%
                          </span>
                        </div>
                        {retention.description && (
                          <div className="text-sm text-gray-600">
                            <p>{retention.description}</p>
                          </div>
                        )}
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implementar función para eliminar retención del contacto
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {customerRetentions.length === 0 && (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay retenciones configuradas
                    </h3>
                    <p className="text-gray-600">
                      Agrega retenciones para aplicar a las transacciones de este contacto
                    </p>
                    <Button 
                      onClick={() => {
                        setRetentionFormData({ retentionId: '', customRate: '', customDescription: '' });
                        setShowAddRetentionDialog(true);
                      }} 
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Agregar Primera Retención
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Tax Dialog */}
      <Dialog open={showAddTaxDialog} onOpenChange={setShowAddTaxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Impuesto</DialogTitle>
            <DialogDescription>
              Configure un nuevo impuesto para este contacto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="taxId">Tipo de Impuesto</Label>
              <select
                id="taxId"
                value={taxFormData.taxId}
                onChange={(e) => setTaxFormData({ ...taxFormData, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar impuesto</option>
                {taxes.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.name} ({tax.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="customRate">Tasa Personalizada (%)</Label>
              <Input
                id="customRate"
                type="number"
                step="0.01"
                value={taxFormData.customRate}
                onChange={(e) => setTaxFormData({ ...taxFormData, customRate: e.target.value })}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="customDescription">Descripción</Label>
              <Textarea
                id="customDescription"
                value={taxFormData.customDescription}
                onChange={(e) => setTaxFormData({ ...taxFormData, customDescription: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddTaxDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTax} className="bg-blue-600 hover:bg-blue-700">
              Agregar Impuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tax Dialog */}
      <Dialog open={showEditTaxDialog} onOpenChange={setShowEditTaxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Impuesto</DialogTitle>
            <DialogDescription>
              Modifique la configuración del impuesto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editTaxId">Tipo de Impuesto</Label>
              <select
                id="editTaxId"
                value={taxFormData.taxId}
                onChange={(e) => setTaxFormData({ ...taxFormData, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar impuesto</option>
                {taxes.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.name} ({tax.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="editCustomRate">Tasa Personalizada (%)</Label>
              <Input
                id="editCustomRate"
                type="number"
                step="0.01"
                value={taxFormData.customRate}
                onChange={(e) => setTaxFormData({ ...taxFormData, customRate: e.target.value })}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="editCustomDescription">Descripción</Label>
              <Textarea
                id="editCustomDescription"
                value={taxFormData.customDescription}
                onChange={(e) => setTaxFormData({ ...taxFormData, customDescription: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditTaxDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTax} className="bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Retention Dialog */}
      <Dialog open={showAddRetentionDialog} onOpenChange={setShowAddRetentionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Retención</DialogTitle>
            <DialogDescription>
              Configure una nueva retención para este contacto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="retentionId">Tipo de Retención</Label>
              <select
                id="retentionId"
                value={retentionFormData.retentionId}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, retentionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar retención</option>
                {retentions.map((retention) => (
                  <option key={retention.id} value={retention.id}>
                    {retention.name} ({retention.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="retentionCustomRate">Tasa Personalizada (%)</Label>
              <Input
                id="retentionCustomRate"
                type="number"
                step="0.01"
                value={retentionFormData.customRate}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, customRate: e.target.value })}
                placeholder="10.00"
              />
            </div>
            <div>
              <Label htmlFor="retentionCustomDescription">Descripción</Label>
              <Textarea
                id="retentionCustomDescription"
                value={retentionFormData.customDescription}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, customDescription: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddRetentionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRetention} className="bg-blue-600 hover:bg-blue-700">
              Agregar Retención
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Retention Dialog */}
      <Dialog open={showEditRetentionDialog} onOpenChange={setShowEditRetentionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Retención</DialogTitle>
            <DialogDescription>
              Modifique la configuración de la retención
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editRetentionId">Tipo de Retención</Label>
              <select
                id="editRetentionId"
                value={retentionFormData.retentionId}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, retentionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar retención</option>
                {retentions.map((retention) => (
                  <option key={retention.id} value={retention.id}>
                    {retention.name} ({retention.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="editRetentionCustomRate">Tasa Personalizada (%)</Label>
              <Input
                id="editRetentionCustomRate"
                type="number"
                step="0.01"
                value={retentionFormData.customRate}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, customRate: e.target.value })}
                placeholder="10.00"
              />
            </div>
            <div>
              <Label htmlFor="editRetentionCustomDescription">Descripción</Label>
              <Textarea
                id="editRetentionCustomDescription"
                value={retentionFormData.customDescription}
                onChange={(e) => setRetentionFormData({ ...retentionFormData, customDescription: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditRetentionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditRetention} className="bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
