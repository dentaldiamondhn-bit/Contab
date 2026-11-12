// Guía de traslado entre almacenes en PDF (server-side). Datos: getTransfer.

import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import {
  CompanyHeader,
  DocHeader,
  DocPage,
  Signatures,
  styles,
} from '@/components/reports/ProfessionalDoc';

export interface TransferPdfData {
  company: CompanyHeader;
  transfer: {
    transfer_number: string;
    transfer_date: string;
    source_warehouse_name: string;
    destination_warehouse_name: string;
    carrier: string;
    guide_number: string;
    notes: string;
    status: string;
    total_items: number;
    total_cost: number;
    dispatched_by: string | null;
    dispatched_at: string | null;
    received_by: string | null;
    received_at: string | null;
    items: Array<{
      product_code: string;
      product_name: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }>;
  };
}

const STATUS_ES: Record<string, string> = {
  pending: 'Pendiente',
  in_transit: 'En tránsito',
  received: 'Recibido',
  cancelled: 'Anulado',
};

export function TransferPDF({ data }: { data: TransferPdfData }) {
  const { company, transfer } = data;
  const generatedAt = new Date().toLocaleString('es-HN');
  return (
    <Document>
      <DocPage generatedAt={generatedAt}>
        {DocHeader({
          company,
          title: 'Guía de traslado',
          meta: [
            `N° ${transfer.transfer_number}`,
            `Fecha: ${transfer.transfer_date}`,
            `Estado: ${STATUS_ES[transfer.status] || transfer.status}`,
          ],
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruta logística</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Origen</Text>
              <Text style={styles.infoLine}>{transfer.source_warehouse_name}</Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Despachado: </Text>
                {transfer.dispatched_at
                  ? `${transfer.dispatched_by || ''} · ${transfer.dispatched_at}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Destino</Text>
              <Text style={styles.infoLine}>{transfer.destination_warehouse_name}</Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Recibido: </Text>
                {transfer.received_at
                  ? `${transfer.received_by || ''} · ${transfer.received_at}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Transporte</Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Transportista: </Text>
                {transfer.carrier || '—'}
              </Text>
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Guía N°: </Text>
                {transfer.guide_number || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mercadería ({transfer.total_items} uds.)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.th, width: '15%' }}>Código</Text>
              <Text style={{ ...styles.th, width: '45%' }}>Producto</Text>
              <Text style={{ ...styles.th, width: '12%', textAlign: 'right' }}>Cant.</Text>
              <Text style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Costo</Text>
              <Text style={{ ...styles.th, width: '14%', textAlign: 'right' }}>Total</Text>
            </View>
            {transfer.items.map((it, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.td, width: '15%' }}>{it.product_code}</Text>
                <Text style={{ ...styles.td, width: '45%' }}>{it.product_name}</Text>
                <Text style={{ ...styles.td, width: '12%', textAlign: 'right' }}>{it.quantity}</Text>
                <Text style={{ ...styles.td, width: '14%', textAlign: 'right' }}>
                  {Number(it.unit_cost).toFixed(2)}
                </Text>
                <Text style={{ ...styles.td, width: '14%', textAlign: 'right' }}>
                  {Number(it.total_cost).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.totalsBox}>
            <View style={{ ...styles.totalRow, ...styles.grandTotal }}>
              <Text>Valorizado:</Text>
              <Text>L {Number(transfer.total_cost).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {transfer.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <Text style={styles.infoLine}>{transfer.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.legend}>
          Guía de traslado interno para control logístico de mercadería entre almacenes.
          Este documento acredita el movimiento físico y su registro en el kardex.
        </Text>

        {Signatures({ roles: ['Despachado por', 'Transportista', 'Recibido por'] })}
      </DocPage>
    </Document>
  );
}
