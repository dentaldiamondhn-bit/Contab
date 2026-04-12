import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: 2 },
  title: { fontSize: 16, fontWeight: 'bold' },
  infoTable: { marginBottom: 20, border: 1 },
  row: { flexDirection: 'row', borderBottom: 0.5, minHeight: 20, alignItems: 'center' },
  colCode: { width: '15%', padding: 2, borderRight: 0.5 },
  colDesc: { width: '45%', padding: 2, borderRight: 0.5 },
  colDebit: { width: '20%', padding: 2, textAlign: 'right', borderRight: 0.5 },
  colCredit: { width: '20%', padding: 2, textAlign: 'right' },
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 },
  sigBox: { width: '30%', borderTop: 1, textAlign: 'center', paddingTop: 5 }
});

export const PolizaVoucher = ({ transaction }: any) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>DENTAL DIAMOND</Text>
        <Text>PÓLIZA DE {transaction.type} # {transaction.number}</Text>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text>Fecha: {new Date(transaction.date).toLocaleDateString()}</Text>
        <Text>Concepto: {transaction.description}</Text>
      </View>

      <View style={styles.infoTable}>
        <View style={[styles.row, { backgroundColor: '#f0f0f0', fontWeight: 'bold' }]}>
          <Text style={styles.colCode}>Código</Text>
          <Text style={styles.colDesc}>Cuenta / Concepto</Text>
          <Text style={styles.colDebit}>Debe</Text>
          <Text style={styles.colCredit}>Haber</Text>
        </View>
        {transaction.entries.map((entry: any) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.colCode}>{entry.account.code}</Text>
            <Text style={styles.colDesc}>{entry.account.name}</Text>
            <Text style={styles.colDebit}>{entry.amount > 0 ? (entry.amount / 100).toFixed(2) : ""}</Text>
            <Text style={styles.colCredit}>{entry.amount < 0 ? (Math.abs(entry.amount) / 100).toFixed(2) : ""}</Text>
          </View>
        ))}
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.sigBox}><Text>Hecho por</Text></View>
        <View style={styles.sigBox}><Text>Revisado por</Text></View>
        <View style={styles.sigBox}><Text>Autorizado por</Text></View>
      </View>
    </Page>
  </Document>
);