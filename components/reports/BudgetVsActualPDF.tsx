// Reporte presupuesto vs real en PDF (server-side). Datos: getBudgetComparison.

import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import {
  CompanyHeader,
  DocHeader,
  DocPage,
  Signatures,
  styles,
} from '@/components/reports/ProfessionalDoc';

export interface BudgetPdfData {
  company: CompanyHeader;
  comparison: {
    budget: { name: string; year: number };
    period: string;
    lines: Array<{
      accountCode: string;
      accountName: string;
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
      executionPct: number | null;
      status: string;
    }>;
    totals: {
      gasto: { budgeted: number; actual: number; variance: number; executionPct: number | null };
      ingreso: { budgeted: number; actual: number; variance: number; executionPct: number | null };
    };
    alerts: Array<{ level: string; message: string }>;
  };
}

const STATUS_ES: Record<string, string> = {
  ok: 'OK',
  advertencia: 'Advertencia',
  critico: 'Crítico',
  'sin-datos': 'Sin datos',
};

export function BudgetVsActualPDF({ data }: { data: BudgetPdfData }) {
  const { company, comparison } = data;
  const generatedAt = new Date().toLocaleString('es-HN');
  const pct = (v: number | null) => (v === null ? 's/p' : `${v}%`);

  return (
    <Document>
      <DocPage generatedAt={generatedAt}>
        {DocHeader({
          company,
          title: 'Presupuesto vs real',
          meta: [
            `${comparison.budget.name} · ${comparison.budget.year}`,
            `Período: ${comparison.period}`,
          ],
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del período</Text>
          <View style={styles.kpiRow}>
            {(['gasto', 'ingreso'] as const).map((cat) => {
              const t = comparison.totals[cat];
              return (
                <View key={cat} style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>{cat === 'gasto' ? 'Gastos' : 'Ingresos'}</Text>
                  <Text style={styles.kpiValue}>{pct(t.executionPct)}</Text>
                  <Text style={styles.infoLine}>P: {t.budgeted.toFixed(2)}</Text>
                  <Text style={styles.infoLine}>R: {t.actual.toFixed(2)}</Text>
                  <Text style={styles.infoLine}>V: {t.variance.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {comparison.alerts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alertas ({comparison.alerts.length})</Text>
            {comparison.alerts.map((a, i) => (
              <View
                key={i}
                style={a.level === 'critico' ? { ...styles.alertBox, ...styles.alertCrit } : styles.alertBox}
              >
                <Text>{a.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por cuenta</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '26%' }}>Cuenta</Text>
              <Text style={{ ...styles.th, width: '10%' }}>Cat.</Text>
              <Text style={{ ...styles.th, width: '16%', textAlign: 'right' }}>Presup.</Text>
              <Text style={{ ...styles.th, width: '16%', textAlign: 'right' }}>Real</Text>
              <Text style={{ ...styles.th, width: '16%', textAlign: 'right' }}>Varianza</Text>
              <Text style={{ ...styles.th, width: '8%', textAlign: 'right' }}>Ejec.</Text>
              <Text style={{ ...styles.th, width: '8%' }}>Est.</Text>
            </View>
            {comparison.lines.map((l, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.td, width: '26%' }}>
                  {l.accountCode} · {l.accountName}
                </Text>
                <Text style={{ ...styles.td, width: '10%' }}>{l.category}</Text>
                <Text style={{ ...styles.td, width: '16%', textAlign: 'right' }}>
                  {l.budgeted.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '16%', textAlign: 'right' }}>
                  {l.actual.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '16%', textAlign: 'right' }}>
                  {l.variance.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '8%', textAlign: 'right' }}>{pct(l.executionPct)}</Text>
                <Text style={{ ...styles.td, width: '8%' }}>{STATUS_ES[l.status] || l.status}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.legend}>
          Reales del mayor contable: gastos = débitos − créditos, ingresos = créditos − débitos.
          Varianza gasto = presupuestado − real; varianza ingreso = real − presupuestado.
        </Text>

        {Signatures({ roles: ['Elaborado por', 'Revisado por', 'Aprobado por'] })}
      </DocPage>
    </Document>
  );
}
