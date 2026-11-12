// Client-side Prisma client (without adapter - for client components only)
// This file is safe to import in client components
import { PrismaClient } from '@prisma/client';

const globalForPrismaClient = globalThis as unknown as {
  prismaClient: PrismaClient | undefined
};

export const db = globalForPrismaClient.prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrismaClient.prismaClient = db;
}