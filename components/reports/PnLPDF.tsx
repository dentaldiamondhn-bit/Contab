import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12 },
  header: { fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, marginTop: 20, borderBottom: 1, paddingBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, fontWeight: 'bold', borderTop: 2, paddingTop: 5 },
  footer: { marginTop: 50, textAlign: 'center', color: 'gray', fontSize: 10 }
});

export const PnLPDF = ({ data, dateRange }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Dental Diamond: Profit & Loss Statement</Text>
      <Text style={{ textAlign: 'center' }}>{dateRange}</Text>

      <Text style={styles.sectionTitle}>REVENUE</Text>
      {data.revenue.map((item: any) => (
        <View key={item.name} style={styles.row}>
          <Text>{item.name}</Text>
          <Text>{(Math.abs(item.total) / 100).toFixed(2)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>EXPENSES</Text>
      {data.expenses.map((item: any) => (
        <View key={item.name} style={styles.row}>
          <Text>{item.name}</Text>
          <Text>{(item.total / 100).toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text>NET PROFIT</Text>
        <Text>{(data.netProfit / 100).toFixed(2)}</Text>
      </View>
      
      <Text style={styles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);