// Factura fiscal en PDF (server-side). Datos: fetchInvoiceData (pdf-documents).

import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import {
  CompanyHeader,
  DocHeader,
  DocPage,
  Signatures,
  styles,
} from '@/components/reports/ProfessionalDoc';

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

export interface InvoicePdfData {
  company: CompanyHeader;
  invoice: {
    invoiceNumber: string;
    invoiceType: string;
    status: string;
    customerName: string;
    customerRTN: string;
    customerEmail: string;
    customerAddress: string;
    issueDate: string;
    dueDate: string;
    cai: string;
    subtotal: number;
    tax: number;
    total: number;
    taxRate: number;
    notes: string;
  };
  items: InvoicePdfItem[];
}

export function InvoicePDF({ data }: { data: InvoicePdfData }) {
  const { company, invoice, items } = data;
  const generatedAt = new Date().toLocaleString('es-HN');
  return (
    <Document>
      <DocPage generatedAt={generatedAt}>
        {DocHeader({
          company,
          title: 'Factura',
          meta: [
            `N° ${invoice.invoiceNumber}`,
            `Fecha: ${invoice.issueDate}`,
            invoice.dueDate ? `Vence: ${invoice.dueDate}` : '',
            `Estado: ${invoice.status}`,
          ].filter(Boolean),
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del cliente</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Cliente: </Text>
                {invoice.customerName}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>RTN: </Text>
                {invoice.customerRTN || '—'}
              </Text>
              {invoice.customerAddress ? (
                <Text style={styles.infoLine}>
                  <Text style={styles.label}>Dirección: </Text>
                  {invoice.customerAddress}
                </Text>
              ) : null}
              {invoice.customerEmail ? (
                <Text style={styles.infoLine}>
                  <Text style={styles.label}>Email: </Text>
                  {invoice.customerEmail}
                </Text>
              ) : null}
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Datos fiscales</Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Tipo: </Text>
                {invoice.invoiceType}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>CAI: </Text>
                {invoice.cai || '—'}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>ISV: </Text>
                {invoice.taxRate}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '8%' }}>Cant.</Text>
              <Text style={{ ...styles.th, width: '52%' }}>Descripción</Text>
              <Text style={{ ...styles.th, width: '20%', textAlign: 'right' }}>P. Unitario</Text>
              <Text style={{ ...styles.th, width: '20%', textAlign: 'right' }}>Total</Text>
            </View>
            {items.map((it, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.td, width: '8%', textAlign: 'right' }}>{it.quantity}</Text>
                <Text style={{ ...styles.td, width: '52%' }}>{it.description}</Text>
                <Text style={{ ...styles.td, width: '20%', textAlign: 'right' }}>
                  {it.unitPrice.toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '20%', textAlign: 'right' }}>
                  {it.total.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{invoice.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>ISV ({invoice.taxRate}%):</Text>
              <Text>{invoice.tax.toFixed(2)}</Text>
            </View>
            <View style={{ ...styles.totalRow, ...styles.grandTotal }}>
              <Text>Total:</Text>
              <Text>L {invoice.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.infoLine}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.legend}>
          Documento generado electrónicamente por Contab. Montos expresados en Lempiras (HNL).
          Conserve este documento para efectos fiscales conforme a la normativa del SAR.
        </Text>

        {Signatures({ roles: ['Elaborado por', 'Revisado por', 'Recibido conforme'] })}
      </DocPage>
    </Document>
  );
}
