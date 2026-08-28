import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export function useBalanceGeneral(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('balance_general')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useEstadoResultados(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('estado_resultados')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useBalanzaComprobacion(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('balanza_comprobacion')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useLibroDiario(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('libro_diario')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useLibroVentas(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('libro_ventas')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useLibroCompras(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('libro_compras')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useResumenISV(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('resumen_isv')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useDeclaracionMensual(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('declaracion_mensual')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useTopClientes(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('top_clientes')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useInventarioValorizado(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventario_valorizado')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useCuentasPorCobrar(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cuentas_por_cobrar')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useCuentasPorPagar(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cuentas_por_pagar')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useFlujoEfectivo(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('flujo_efectivo_mensual')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}

export function useResumenContable(tenantId: string | undefined) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('resumen_contable')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  return { data, loading };
}
