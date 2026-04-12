import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { SignatureBlock } from '@/components/reports/SignatureBlock';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottom: 2 },
  title: { fontSize: 14, fontWeight: 'bold' },
  dateInfo: { marginBottom: 20, textAlign: 'center' },
  table: { marginBottom: 10, border: 1 },
  row: { flexDirection: 'row', borderBottom: 0.5, minHeight: 20, alignItems: 'center' },
  headerRow: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  totalsRow: { backgroundColor: '#f8f8f8', fontWeight: 'bold' },
  colCode: { width: '15%', padding: 2, borderRight: 0.5 },
  colName: { width: '45%', padding: 2, borderRight: 0.5 },
  colDebit: { width: '20%', padding: 2, textAlign: 'right', borderRight: 0.5 },
  colCredit: { width: '20%', padding: 2, textAlign: 'right' },
  parentRow: { backgroundColor: '#e8f4fd', fontWeight: 'bold' }
});

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  debitMovement: number;
  creditMovement: number;
  finalBalance: number;
  isParent?: boolean;
  level?: number;
}

interface TrialBalanceDocumentProps {
  data: AccountRow[];
  companyName?: string;
  period?: string;
  contadorProfile?: any;
}

export const TrialBalanceDocument = ({ 
  data, 
  companyName = "DENTAL DIAMOND",
  period,
  contadorProfile
}: TrialBalanceDocumentProps) => {
  const totalDebits = data.reduce((sum, row) => sum + row.debitMovement, 0);
  const totalCredits = data.reduce((sum, row) => sum + row.creditMovement, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{companyName}</Text>
          <Text>{period ? `BALANZA DE COMPROBACIÓN - ${period.toUpperCase()}` : 'BALANZA DE COMPROBACIÓN'}</Text>
        </View>

        <Text style={styles.dateInfo}>
          Fecha: {new Date().toLocaleDateString()}
        </Text>

        {/* Trial Balance Table */}
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={styles.colCode}>Código</Text>
            <Text style={styles.colName}>Cuenta</Text>
            <Text style={styles.colDebit}>Débitos</Text>
            <Text style={styles.colCredit}>Créditos</Text>
          </View>
          
          {data.map((row) => (
            <View 
              key={row.id} 
              style={[
                styles.row, 
                row.isParent ? styles.parentRow : {}
              ]}>
              <Text style={styles.colCode}>
                {row.level ? '  '.repeat(row.level - 1) + row.code : row.code}
              </Text>
              <Text style={styles.colName}>{row.name}</Text>
              <Text style={styles.colDebit}>
                {row.debitMovement > 0 ? row.debitMovement.toFixed(2) : ""}
              </Text>
              <Text style={styles.colCredit}>
                {row.creditMovement > 0 ? row.creditMovement.toFixed(2) : ""}
              </Text>
            </View>
          ))}

          {/* Totals Row */}
          <View style={[styles.row, styles.totalsRow]}>
            <Text style={styles.colCode}></Text>
            <Text style={styles.colName}>TOTALES</Text>
            <Text style={styles.colDebit}>{totalDebits.toFixed(2)}</Text>
            <Text style={styles.colCredit}>{totalCredits.toFixed(2)}</Text>
          </View>
        </View>

        {/* Balance Verification */}
        <View style={{ marginTop: 20, border: 1, padding: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 10 }}>
            VERIFICACIÓN DEL BALANCE
          </Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.colCode, { width: '50%' }]}>Concepto</Text>
              <Text style={[styles.colDebit, { width: '25%', borderRight: 0 }]}>Débitos</Text>
              <Text style={[styles.colCredit, { width: '25%' }]}>Créditos</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.colCode, { width: '50%' }]}>Suma de Movimientos</Text>
              <Text style={[styles.colDebit, { width: '25%', borderRight: 0 }]}>{totalDebits.toFixed(2)}</Text>
              <Text style={[styles.colCredit, { width: '25%' }]}>{totalCredits.toFixed(2)}</Text>
            </View>
            <View style={[styles.row, styles.totalsRow]}>
              <Text style={[styles.colCode, { width: '50%' }]}>DIFERENCIA</Text>
              <Text style={[styles.colDebit, { width: '25%', borderRight: 0 }]}>
                {Math.abs(totalDebits - totalCredits).toFixed(2)}
              </Text>
              <Text style={[styles.colCredit, { width: '25%' }]}>
                {Math.abs(totalDebits - totalCredits).toFixed(2)}
              </Text>
            </View>
          </View>
          <Text style={{ 
            marginTop: 10, 
            textAlign: 'center', 
            fontWeight: 'bold',
            color: totalDebits === totalCredits ? '#065f46' : '#dc2626'
          }}>
            {totalDebits === totalCredits ? '✓ BALANCE CUADRADO' : '✗ BALANCE DESCUADRADO'}
          </Text>
        </View>

        {/* Signature Block */}
        {contadorProfile && <SignatureBlock profile={contadorProfile} />}
      </Page>
    </Document>
  );
};

export default TrialBalanceDocument;
