// Layout profesional compartido para PDFs server-side (@react-pdf/renderer).
// Solo server-side: no usar 'use client'. Los documentos llaman a estos
// bloques como funciones (igual que BatchPolizaDocument).

import React from 'react';
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export const PROFESSIONAL_BLUE = '#0e7490';
export const PROFESSIONAL_GRAY = '#4b5563';
export const PROFESSIONAL_LIGHT = '#f1f5f9';

export interface CompanyHeader {
  name: string;
  rtn: string;
  address: string;
  phone: string;
  email: string;
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2.5,
    borderBottomColor: PROFESSIONAL_BLUE,
    paddingBottom: 10,
    marginBottom: 14,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PROFESSIONAL_BLUE,
    marginBottom: 3,
  },
  companyLine: {
    fontSize: 8.5,
    color: PROFESSIONAL_GRAY,
    marginBottom: 1,
  },
  docTitleBlock: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: PROFESSIONAL_BLUE,
  },
  docMeta: {
    fontSize: 8.5,
    color: PROFESSIONAL_GRAY,
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: PROFESSIONAL_LIGHT,
    color: PROFESSIONAL_BLUE,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 7,
  },
  infoBoxTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PROFESSIONAL_BLUE,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoLine: {
    fontSize: 8.5,
    marginBottom: 1.5,
  },
  label: {
    fontWeight: 'bold',
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PROFESSIONAL_BLUE,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  td: {
    paddingVertical: 4.5,
    paddingHorizontal: 5,
    fontSize: 8.5,
  },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
  totalsBox: {
    alignSelf: 'flex-end',
    width: 210,
    borderWidth: 1,
    borderColor: PROFESSIONAL_BLUE,
    marginTop: 10,
    padding: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 9,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginTop: 3,
    paddingTop: 4,
    fontWeight: 'bold',
    fontSize: 11,
    color: PROFESSIONAL_BLUE,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 7,
  },
  kpiLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    color: PROFESSIONAL_GRAY,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PROFESSIONAL_BLUE,
  },
  alertBox: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    padding: 6,
    marginBottom: 4,
    fontSize: 8.5,
  },
  alertCrit: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  legend: {
    fontSize: 7.5,
    color: '#6b7280',
    textAlign: 'justify',
    marginTop: 10,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 34,
  },
  signature: {
    width: '30%',
    borderTopWidth: 1,
    borderTopColor: '#111827',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 8.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 7.5,
    color: '#6b7280',
  },
});

export function DocHeader({
  company,
  title,
  meta,
}: {
  company: CompanyHeader;
  title: string;
  meta: string[];
}) {
  return (
    <View style={styles.headerBar}>
      <View>
        <Text style={styles.companyName}>{company.name}</Text>
        {company.rtn ? <Text style={styles.companyLine}>RTN: {company.rtn}</Text> : null}
        {company.address ? <Text style={styles.companyLine}>{company.address}</Text> : null}
        {company.phone || company.email ? (
          <Text style={styles.companyLine}>
            {[company.phone, company.email].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <View style={styles.docTitleBlock}>
        <Text style={styles.docTitle}>{title}</Text>
        {meta.map((m, i) => (
          <Text key={i} style={styles.docMeta}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function DocFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Generado por Contab · {generatedAt}</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

export function Signatures({ roles }: { roles: string[] }) {
  return (
    <View style={styles.signatures}>
      {roles.map((r) => (
        <Text key={r} style={styles.signature}>
          {r}
        </Text>
      ))}
    </View>
  );
}

export function DocPage({
  children,
  generatedAt,
}: {
  children: React.ReactNode;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      {children}
      <DocFooter generatedAt={generatedAt} />
    </Page>
  );
}
