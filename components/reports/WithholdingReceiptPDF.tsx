import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
// Register fonts (you may need to adjust the path)
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
});

Font.register({
  family: 'Roboto-Bold',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Bold.ttf',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Roboto',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Bold',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Roboto-Bold',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    borderBottom: '1pt solid #000',
  },
  tableRow: {
    borderBottom: '1pt solid #ddd',
  },
  tableCell: {
    padding: 5,
    borderRight: '1pt solid #ddd',
  },
  totals: {
    borderTop: '2pt solid #000',
    marginTop: 10,
    paddingTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  signature: {
    marginTop: 30,
    borderTop: '1pt solid #000',
    paddingTop: 20,
  },
});

interface WithholdingReceiptPDFProps {
  receiptData: {
    receiptNumber: string;
    receiptDate: Date;
    provider: {
      name: string;
      rtn: string;
      address?: string;
    };
    invoice: {
      number: string;
      date: Date;
      amount: number;
    };
    withholding: {
      type: string;
      rate: number;
      amount: number;
      description: string;
    };
    totals: {
      baseAmount: number;
      withholdingAmount: number;
      netAmount: number;
    };
    period: string;
  };
}

export default function WithholdingReceiptPDF({ receiptData }: WithholdingReceiptPDFProps) {
  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>COMPROBANTE DE RETENCIÓN</Text>
        
        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Datos del Emisor</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Empresa:</Text>
            <Text style={styles.value}>NOMBRE DE LA EMPRESA</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RTN:</Text>
            <Text style={styles.value}>0801-XXXXX-X</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>Dirección de la empresa</Text>
          </View>
        </View>

        {/* Receipt Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Datos del Comprobante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>No. Comprobante:</Text>
            <Text style={styles.value}>{receiptData.receiptNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha Emisión:</Text>
            <Text style={styles.value}>{formatDate(receiptData.receiptDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Período:</Text>
            <Text style={styles.value}>{receiptData.period}</Text>
          </View>
        </View>

        {/* Provider Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Datos del Proveedor</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{receiptData.provider.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RTN:</Text>
            <Text style={styles.value}>{receiptData.provider.rtn}</Text>
          </View>
          {receiptData.provider.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Dirección:</Text>
              <Text style={styles.value}>{receiptData.provider.address}</Text>
            </View>
          )}
        </View>

        {/* Invoice Information */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Datos de la Factura</Text>
          <View style={styles.row}>
            <Text style={styles.label}>No. Factura:</Text>
            <Text style={styles.value}>{receiptData.invoice.number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha Factura:</Text>
            <Text style={styles.value}>{formatDate(receiptData.invoice.date)}</Text>
          </View>
        </View>

        {/* Withholding Details */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Detalles de la Retención</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Concepto</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Tasa</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Monto</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {receiptData.withholding.description}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {(receiptData.withholding.rate * 100).toFixed(1)}%
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(receiptData.withholding.amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.row}>
            <Text style={[styles.label, { width: 150 }]}>Monto Base:</Text>
            <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>
              {formatCurrency(receiptData.totals.baseAmount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: 150 }]}>Monto Retenido:</Text>
            <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }]}>
              {formatCurrency(receiptData.totals.withholdingAmount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: 150 }]}>Monto Neto:</Text>
            <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }]}>
              {formatCurrency(receiptData.totals.netAmount)}
            </Text>
          </View>
        </View>

        {/* Legal Text */}
        <View style={styles.section}>
          <Text style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 10 }}>
            Este comprobante constituye constancia suficiente de la retención practicada, de conformidad con lo dispuesto en el Artículo 33 del Código Tributario de Honduras.
          </Text>
          <Text style={{ fontSize: 10, fontStyle: 'italic' }}>
            La presente retención ha sido declarada y pagada al Servicio de Administración Tributaria (SAR) en el plazo correspondiente.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <Text style={{ textAlign: 'center', marginBottom: 10 }}>
            _________________________
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 10 }}>
            Firma Autorizada
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 10, marginTop: 5 }}>
            Nombre del Responsable
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Este documento es un comprobante válido de retención tributaria | Generado el {new Date().toLocaleDateString('es-HN')}
        </Text>
      </Page>
    </Document>
  );
}
