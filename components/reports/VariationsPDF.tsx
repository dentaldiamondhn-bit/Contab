// Variaciones entre períodos en PDF (server-side). Datos: getVariationsReport.

import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import {
  CompanyHeader,
  DocHeader,
  DocPage,
  Signatures,
  styles,
} from '@/components/reports/ProfessionalDoc';

export interface VariationsPdfData {
  company: CompanyHeader;
  report: {
    from: string;
    to: string;
    rows: Array<{
      accountCode: string;
      accountName: string;
      fromBalance: number;
      toBalance: number;
      varianceAbs: number;
      variancePct: number | null;
      trend: string;
    }>;
    totals: { fromBalance: number; toBalance: number; varianceAbs: number; variancePct: number | null };
    counts: { accounts: number; up: number; down: number; same: number; new: number; gone: number };
  };
}

const TREND_ES: Record<string, string> = {
  up: 'Sube',
  down: 'Baja',
  same: 'Igual',
  new: 'Nueva',
  gone: 'Sale',
};

export function VariationsPDF({ data }: { data: VariationsPdfData }) {
  const { company, report } = data;
  const generatedAt = new Date().toLocaleString('es-HN');
  const pct = (v: number | null) => (v === null ? 's/p' : `${v}%`);

  return (
    <Document>
      <DocPage generatedAt={generatedAt}>
        {DocHeader({
          company,
          title: 'Variaciones entre períodos',
          meta: [`${report.from} vs ${report.to}`, `${report.counts.accounts} cuentas`],
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Saldo {report.from}</Text>
              <Text style={styles.kpiValue}>{report.totals.fromBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Saldo {report.to}</Text>
              <Text style={styles.kpiValue}>{report.totals.toBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Variación</Text>
              <Text style={styles.kpiValue}>{report.totals.varianceAbs.toFixed(2)}</Text>
              <Text style={styles.infoLine}>{pct(report.totals.variancePct)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Suben / Bajan</Text>
              <Text style={styles.kpiValue}>
                {report.counts.up} / {report.counts.down}
              </Text>
              <Text style={styles.infoLine}>
                Nuevas {report.counts.new} · Salen {report.counts.gone}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por cuenta</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '30%' }}>Cuenta</Text>
              <Text style={{ ...styles.th, width: '18%', textAlign: 'right' }}>{report.from}</Text>
              <Text style={{ ...styles.th, width: '18%', textAlign: 'right' }}>{report.to}</Text>
              <Text style={{ ...styles.th, width: '18%', textAlign: 'right' }}>Variación</Text>
              <Text style={{ ...styles.th, width: '8%', textAlign: 'right' }}>%</Text>
              <Text style={{ ...styles.th, width: '8%' }}>Tend.</Text>
            </View>
            {report.rows.map((l, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.td, width: '30%' }}>
                  {l.accountCode} · {l.accountName}
                </Text>
                <Text style={{ ...styles.td, width: '18%', textAlign: 'right' }}>
                  {l.fromBalance.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '18%', textAlign: 'right' }}>
                  {l.toBalance.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '18%', textAlign: 'right' }}>
                  {l.varianceAbs.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '8%', textAlign: 'right' }}>{pct(l.variancePct)}</Text>
                <Text style={{ ...styles.td, width: '8%' }}>{TREND_ES[l.trend] || l.trend}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.legend}>
          Saldos del mayor contable por período (débitos − créditos). Variación = saldo
          final − saldo base. Montos en Lempiras (HNL).
        </Text>

        {Signatures({ roles: ['Elaborado por', 'Revisado por', 'Aprobado por'] })}
      </DocPage>
    </Document>
  );
}
