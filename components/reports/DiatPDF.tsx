// Declaración DIAT en PDF (server-side). Datos: getDiatReport (diat-generator).

import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import {
  CompanyHeader,
  DocHeader,
  DocPage,
  Signatures,
  styles,
} from '@/components/reports/ProfessionalDoc';

export interface DiatPdfData {
  company: CompanyHeader;
  report: {
    period: string;
    declarante: {
      rtn: string;
      razonSocial: string;
      domicilioFiscal: string;
      telefono: string;
      email: string;
      regimen: string;
    };
    ventas: {
      totals: {
        exentas: number;
        exentasCount: number;
        gravadas15: number;
        gravadas15Count: number;
        gravadas18: number;
        gravadas18Count: number;
        otras: number;
        otrasCount: number;
        impuesto: number;
        total: number;
      };
    };
    compras: {
      totals: {
        exento?: number;
        exentas?: number;
        gravado?: number;
        gravadas15?: number;
        gravadas18?: number;
        otras?: number;
        impuesto: number;
        total: number;
      };
    };
    resumen: {
      totalFacturas: number;
      totalVentas: number;
      impuestoVentas: number;
      totalCompras: number;
      impuestoCompras: number;
      creditoFiscal: number;
      isvAPagar: number;
      operaciones: number;
    };
  };
}

export function DiatPDF({ data }: { data: DiatPdfData }) {
  const { company, report } = data;
  const generatedAt = new Date().toLocaleString('es-HN');
  const v = report.ventas.totals;
  const c = report.compras.totals;
  const r = report.resumen;

  const money = (n: number) => Number(n || 0).toFixed(2);

  return (
    <Document>
      <DocPage generatedAt={generatedAt}>
        {DocHeader({
          company,
          title: 'DIAT',
          meta: [
            'Declaración Informativa de Actividades',
            `Período: ${report.period}`,
            `Régimen: ${report.declarante.regimen}`,
          ],
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Declarante</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Razón social: </Text>
                {report.declarante.razonSocial}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>RTN: </Text>
                {report.declarante.rtn}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Domicilio: </Text>
                {report.declarante.domicilioFiscal || '—'}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Contacto: </Text>
                {[report.declarante.telefono, report.declarante.email].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Operaciones</Text>
              <Text style={styles.kpiValue}>{r.operaciones}</Text>
              <Text style={styles.infoLine}>Facturas: {r.totalFacturas}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Ventas / ISV</Text>
              <Text style={styles.kpiValue}>{money(r.totalVentas)}</Text>
              <Text style={styles.infoLine}>ISV: {money(r.impuestoVentas)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Compras / ISV</Text>
              <Text style={styles.kpiValue}>{money(r.totalCompras)}</Text>
              <Text style={styles.infoLine}>ISV: {money(r.impuestoCompras)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>ISV a pagar</Text>
              <Text style={styles.kpiValue}>{money(r.isvAPagar)}</Text>
              <Text style={styles.infoLine}>Crédito fiscal: {money(r.creditoFiscal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventas por tasa</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '34%' }}>Concepto</Text>
              <Text style={{ ...styles.th, width: '22%', textAlign: 'right' }}>Documentos</Text>
              <Text style={{ ...styles.th, width: '22%', textAlign: 'right' }}>Monto</Text>
              <Text style={{ ...styles.th, width: '22%', textAlign: 'right' }}>Impuesto</Text>
            </View>
            {[
              { label: 'Exentas', docs: v.exentasCount, amount: v.exentas },
              { label: 'Gravadas 15%', docs: v.gravadas15Count, amount: v.gravadas15 },
              { label: 'Gravadas 18%', docs: v.gravadas18Count, amount: v.gravadas18 },
              { label: 'Otras', docs: v.otrasCount, amount: v.otras },
            ].map((row, i) => (
              <View
                key={row.label}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.td, width: '34%' }}>{row.label}</Text>
                <Text style={{ ...styles.td, width: '22%', textAlign: 'right' }}>{row.docs}</Text>
                <Text style={{ ...styles.td, width: '22%', textAlign: 'right' }}>{money(row.amount)}</Text>
                <Text style={{ ...styles.td, width: '22%', textAlign: 'right' }}>
                  {i === 0 ? '—' : money(v.impuesto)}
                </Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <Text style={{ ...styles.td, width: '34%', fontWeight: 'bold' }}>Total ventas</Text>
              <Text style={{ ...styles.td, width: '22%' }} />
              <Text style={{ ...styles.td, width: '22%', textAlign: 'right', fontWeight: 'bold' }}>
                {money(v.total)}
              </Text>
              <Text style={{ ...styles.td, width: '22%', textAlign: 'right', fontWeight: 'bold' }}>
                {money(v.impuesto)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compras</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '56%' }}>Concepto</Text>
              <Text style={{ ...styles.th, width: '22%', textAlign: 'right' }}>Monto</Text>
              <Text style={{ ...styles.th, width: '22%', textAlign: 'right' }}>Impuesto</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ ...styles.td, width: '56%' }}>Total compras</Text>
              <Text style={{ ...styles.td, width: '22%', textAlign: 'right' }}>{money(c.total)}</Text>
              <Text style={{ ...styles.td, width: '22%', textAlign: 'right' }}>{money(c.impuesto)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.legend}>
          Declaración informativa mensual complementaria al DET/DMC. Montos en Lempiras (HNL).
          Verifique los datos contra los libros legales antes de su presentación.
        </Text>

        {Signatures({ roles: ['Elaborado por', 'Contador', 'Representante legal'] })}
      </DocPage>
    </Document>
  );
}
