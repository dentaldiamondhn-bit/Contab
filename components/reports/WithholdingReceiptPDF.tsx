'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { formatDateForDisplay } from '@/lib/date-utils';

// Estilos profesionales para el PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  colDescription: { width: '50%' },
  colBase: { width: '20%', textAlign: 'right' },
  colRate: { width: '10%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: 200,
    borderWidth: 1,
    borderColor: '#1e40af',
    padding: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
    paddingTop: 4,
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  legalLegend: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'justify',
    marginBottom: 20,
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureImage: {
    width: 120,
    height: 60,
    marginBottom: 5,
    objectFit: 'contain',
  },
  sealImage: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },
  signatureLine: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#333',
    textAlign: 'center',
    paddingTop: 5,
    fontSize: 9,
  },
  caiBadge: {
    marginTop: 10,
    fontSize: 9,
    color: '#1e40af',
    fontWeight: 'bold',
  }
});

interface WithholdingReceiptPDFProps {
  receiptData: {
    issuerName: string;
    issuerRTN: string;
    issuerAddress: string;
    cai: string;
    correlativo: string;
    fechaLimite: string;
    date: string | Date;
    providerName: string;
    providerRTN: string;
    invoiceNumber: string;
    baseAmount: number;
    rate: number;
    withheldAmount: number;
    description: string;
    type: string;
    signatureUrl?: string;
    sealUrl?: string;
  };
}

const WithholdingReceiptPDF: React.FC<WithholdingReceiptPDFProps> = ({ receiptData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado con Datos del Emisor */}
        <View style={styles.header}>
          <Text style={styles.title}>Comprobante de Retención</Text>
          <Text style={styles.subtitle}>{receiptData.issuerName}</Text>
          <Text style={styles.subtitle}>RTN: {receiptData.issuerRTN}</Text>
          <Text style={styles.subtitle}>{receiptData.issuerAddress}</Text>
          <Text style={[styles.subtitle, { fontWeight: 'bold' }]}>No. {receiptData.correlativo}</Text>
        </View>

        {/* Información Fiscal del Documento */}
        <View style={styles.section}>
          <Text style={styles.caiBadge}>CAI: {receiptData.cai}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>Fecha Límite de Emisión: {formatDateForDisplay(receiptData.fechaLimite)}</Text>
        </View>

        {/* Datos del Retenido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Sujeto Retenido</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre/Razón Social:</Text>
            <Text style={styles.value}>{receiptData.providerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RTN:</Text>
            <Text style={styles.value}>{receiptData.providerRTN}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Emisión:</Text>
            <Text style={styles.value}>{formatDateForDisplay(receiptData.date)}</Text>
          </View>
        </View>

        {/* Detalle de la Retención */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Descripción del Impuesto</Text>
            <Text style={styles.colBase}>Base Imponible</Text>
            <Text style={styles.colRate}>Tasa</Text>
            <Text style={styles.colTotal}>Monto Retenido</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>
              {receiptData.type} - Factura: {receiptData.invoiceNumber}
              {'\n'}{receiptData.description}
            </Text>
            <Text style={styles.colBase}>L {receiptData.baseAmount.toFixed(2)}</Text>
            <Text style={styles.colRate}>{(receiptData.rate * 100).toFixed(1)}%</Text>
            <Text style={styles.colTotal}>L {receiptData.withheldAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Totales */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text>Total Base:</Text>
              <Text>L {receiptData.baseAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>Total Retenido:</Text>
              <Text>L {receiptData.withheldAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer y Firmas */}
        <View style={styles.footer}>
          <Text style={styles.legalLegend}>
            Este documento es una representación gráfica de un comprobante de retención emitido conforme a las normas del Sistema de Facturación de la República de Honduras. La retención se realiza según lo estipulado en el Artículo 50 de la Ley del Impuesto sobre la Renta.
          </Text>
          <View style={styles.signatureContainer}>
            <View style={{ width: '45%', alignItems: 'center' }}>
              {receiptData.signatureUrl && <Image src={receiptData.signatureUrl} style={styles.signatureImage} />}
              {receiptData.sealUrl && <Image src={receiptData.sealUrl} style={[styles.sealImage, { position: 'absolute', opacity: 0.6, left: -20 }]} />}
              <Text style={[styles.signatureLine, { width: '100%' }]}>Firma y Sello Agente Retenedor</Text>
            </View>
            <View style={{ width: '45%', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={[styles.signatureLine, { width: '100%' }]}>Recibido por (Sujeto Retenido)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default WithholdingReceiptPDF;