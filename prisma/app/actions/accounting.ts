"use server";
import { db } from "@/lib/db";

export async function createVoucher(formData: any) {
  const { tenantId, description, amount, voucherType } = formData;
  const amountCents = BigInt(Math.round(amount * 100));
  const isvCents = BigInt(Math.round(amount * 0.15 * 100));
  const totalWithIsv = amountCents + isvCents;

  // 1. Obtener correlativo automático
  const lastVoucher = await db.transaction.aggregate({
    _max: { voucherNumber: true },
    where: { tenantId, voucherType },
  });
  const nextNumber = (lastVoucher._max.voucherNumber || 0) + 1;

  // 2. Buscar cuentas (Bancos, Ventas, ISV)
  const ctaBanco = await db.account.findFirst({ where: { code: "1101", tenantId } });
  const ctaVenta = await db.account.findFirst({ where: { code: "4101", tenantId } });
  const ctaIsv = await db.account.findFirst({ where: { code: "2101", tenantId } });

  if (!ctaBanco || !ctaVenta || !ctaIsv) throw new Error("Faltan cuentas en el catálogo");

  // 3. Crear Transacción con Partida Doble
  return await db.transaction.create({
    data: {
      tenantId,
      description,
      voucherType,
      voucherNumber: nextNumber,
      totalAmount: totalWithIsv,
      functionalAmount: totalWithIsv,
      originalTotal: totalWithIsv,
      entries: {
        create: [
          { accountId: ctaBanco.id, tenantId, amount: totalWithIsv, originalAmount: totalWithIsv }, // DEBE
          { accountId: ctaVenta.id, tenantId, amount: -amountCents, originalAmount: -amountCents }, // HABER (Neto)
          { accountId: ctaIsv.id, tenantId, amount: -isvCents, originalAmount: -isvCents },        // HABER (ISV)
        ],
      },
    },
  });
}