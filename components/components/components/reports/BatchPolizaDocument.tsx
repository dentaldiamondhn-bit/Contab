import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { formatVoucher, VOUCHER_TYPE_DESCRIPTIONS } from '@/lib/voucher-types';
import { SignatureBlock } from '@/components/reports/SignatureBlock';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  voucherContainer: { marginBottom: 30, border: 1, padding: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottom: 2 },
  title: { fontSize: 14, fontWeight: 'bold' },
  voucherInfo: { marginBottom: 10 },
  infoTable: { marginBottom: 10, border: 1 },
  row: { flexDirection: 'row', borderBottom: 0.5, minHeight: 20, alignItems: 'center' },
  colCode: { width: '15%', padding: 2, borderRight: 0.5 },
  colDesc: { width: '45%', padding: 2, borderRight: 0.5 },
  colDebit: { width: '20%', padding: 2, textAlign: 'right', borderRight: 0.5 },
  colCredit: { width: '20%', padding: 2, textAlign: 'right' },
  headerRow: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  totalsRow: { backgroundColor: '#f8f8f8', fontWeight: 'bold' },
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigBox: { width: '30%', borderTop: 1, textAlign: 'center', paddingTop: 5 },
  pageBreak: { marginBottom: 40 }
});

interface TransactionEntry {
  id: string;
  amount: bigint;
  account: {
    code: string;
    name: string;
  };
}

interface Transaction {
  id: string;
  description: string;
  date: Date;
  voucherType: string;
  voucherNumber: number;
  entries: TransactionEntry[];
}

interface BatchPolizaDocumentProps {
  transactions: Transaction[];
  companyName?: string;
  month?: string;
  contadorProfile?: any;
}

export const BatchPolizaDocument = ({ 
  transactions, 
  companyName = "DENTAL DIAMOND",
  month,
  contadorProfile
}: BatchPolizaDocumentProps) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{companyName}</Text>
        <Text>{month ? `PÓLIZAS DE ${month.toUpperCase()}` : 'PÓLIZAS CONTABLES'}</Text>
      </View>

      <Text style={{ marginBottom: 20, textAlign: 'center', fontSize: 12 }}>
        {transactions.length} Póliza{transactions.length > 1 ? 's' : ''} Generada{transactions.length > 1 ? 's' : ''}
      </Text>

      {transactions.map((transaction, index) => (
        <View key={transaction.id} style={styles.voucherContainer}>
          {/* Voucher Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
              {VOUCHER_TYPE_DESCRIPTIONS[transaction.voucherType as keyof typeof VOUCHER_TYPE_DESCRIPTIONS] || transaction.voucherType}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
              #{formatVoucher(transaction.voucherType as any, transaction.voucherNumber)}
            </Text>
          </View>

          <View style={styles.voucherInfo}>
            <Text>Fecha: {new Date(transaction.date).toLocaleDateString()}</Text>
            <Text>Concepto: {transaction.description}</Text>
          </View>

          {/* Entries Table */}
          <View style={styles.infoTable}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.colCode}>Código</Text>
              <Text style={styles.colDesc}>Cuenta / Concepto</Text>
              <Text style={styles.colDebit}>Debe</Text>
              <Text style={styles.colCredit}>Haber</Text>
            </View>
            
            {transaction.entries.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <Text style={styles.colCode}>{entry.account.code}</Text>
                <Text style={styles.colDesc}>{entry.account.name}</Text>
                <Text style={styles.colDebit}>
                  {entry.amount > 0n ? (Number(entry.amount) / 100).toFixed(2) : ""}
                </Text>
                <Text style={styles.colCredit}>
                  {entry.amount < 0n ? (Math.abs(Number(entry.amount)) / 100).toFixed(2) : ""}
                </Text>
              </View>
            ))}

            {/* Totals Row */}
            <View style={[styles.row, styles.totalsRow]}>
              <Text style={styles.colCode}></Text>
              <Text style={styles.colDesc}>TOTALES</Text>
              <Text style={styles.colDebit}>
                {transaction.entries
                  .filter(e => e.amount > 0n)
                  .reduce((sum, e) => sum + e.amount, 0n) > 0n 
                  ? (Number(transaction.entries
                      .filter(e => e.amount > 0n)
                      .reduce((sum, e) => sum + e.amount, 0n)) / 100).toFixed(2)
                  : "0.00"
                }
              </Text>
              <Text style={styles.colCredit}>
                {transaction.entries
                  .filter(e => e.amount < 0n)
                  .reduce((sum, e) => sum + e.amount, 0n) < 0n 
                  ? (Math.abs(Number(transaction.entries
                      .filter(e => e.amount < 0n)
                      .reduce((sum, e) => sum + e.amount, 0n))) / 100).toFixed(2)
                  : "0.00"
                }
              </Text>
            </View>
          </View>

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.sigBox}><Text>Hecho por</Text></View>
            <View style={styles.sigBox}><Text>Revisado por</Text></View>
            <View style={styles.sigBox}><Text>Autorizado por</Text></View>
          </View>

          {index < transactions.length - 1 && <View style={styles.pageBreak} />}
        </View>
      ))}

      {/* Final Summary */}
      <View style={{ marginTop: 30, borderTop: 2, paddingTop: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
          RESUMEN DEL LOTE
        </Text>
        <View style={styles.infoTable}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={styles.colCode}>Tipo</Text>
            <Text style={styles.colDesc}>Cantidad</Text>
            <Text style={styles.colDebit}>Total Débitos</Text>
            <Text style={styles.colCredit}>Total Créditos</Text>
          </View>
          
          {Object.entries(
            transactions.reduce((acc, t) => {
              const type = t.voucherType;
              if (!acc[type]) {
                acc[type] = { count: 0, debits: 0n, credits: 0n };
              }
              acc[type].count++;
              acc[type].debits += t.entries.filter(e => e.amount > 0n).reduce((sum, e) => sum + e.amount, 0n);
              acc[type].credits += t.entries.filter(e => e.amount < 0n).reduce((sum, e) => sum + e.amount, 0n);
              return acc;
            }, {} as Record<string, { count: number; debits: bigint; credits: bigint }>)
          ).map(([type, data]) => (
            <View key={type} style={styles.row}>
              <Text style={styles.colCode}>
                {VOUCHER_TYPE_DESCRIPTIONS[type as keyof typeof VOUCHER_TYPE_DESCRIPTIONS]?.split(' ')[2] || type}
              </Text>
              <Text style={styles.colDesc}>{data.count}</Text>
              <Text style={styles.colDebit}>{(Number(data.debits) / 100).toFixed(2)}</Text>
              <Text style={styles.colCredit}>{(Math.abs(Number(data.credits)) / 100).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signature Block */}
      {contadorProfile && <SignatureBlock profile={contadorProfile} />}
    </Page>
  </Document>
);
