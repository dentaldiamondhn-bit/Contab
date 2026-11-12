import { Prisma, PrismaClient } from '@prisma/client';

// Server-side only Prisma client with adapter
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrismaServer = globalThis as unknown as {
  prismaServer: PrismaClient | undefined
};

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const adapter = pool ? new PrismaPg(pool) : undefined;

const prismaServer = globalForPrismaServer.prismaServer ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrismaServer.prismaServer = prismaServer;
}

export const db = prismaServer;

// Tenant-aware Prisma client factory
export function createTenantAwarePrismaClient(tenantId: string) {
  if (typeof window !== 'undefined') {
    throw new Error('createTenantAwarePrismaClient can only be used on the server');
  }

  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
  });

  return client;
}

// Extensión de Prisma para filtrado explícito de tenant
// Uso: const tenantClient = db.$extends(tenantFilterExtension(tenantId))
export function tenantFilterExtension(tenantId: string) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      query: {
        $allModels: {
          async findUnique({ args, query }) {
            const whereArgs = args as { where?: Record<string, unknown> };
            if (whereArgs.where) {
              whereArgs.where = { ...whereArgs.where, tenantId };
            } else {
              whereArgs.where = { tenantId };
            }
            return query(args);
          },
          async findMany({ args, query }) {
            const whereArgs = args as { where?: Record<string, unknown> };
            if (whereArgs.where) {
              whereArgs.where = { ...whereArgs.where, tenantId };
            } else {
              whereArgs.where = { tenantId };
            }
            return query(args);
          },
          async findFirst({ args, query }) {
            const whereArgs = args as { where?: Record<string, unknown> };
            if (whereArgs.where) {
              whereArgs.where = { ...whereArgs.where, tenantId };
            } else {
              whereArgs.where = { tenantId };
            }
            return query(args);
          },
          async create({ args, query }) {
            const dataArgs = args as { data?: Record<string, unknown> };
            if (dataArgs.data) {
              dataArgs.data = { ...dataArgs.data, tenantId };
            } else {
              dataArgs.data = { tenantId };
            }
            return query(args);
          },
          async update({ args, query }) {
            const whereArgs = args as { where?: Record<string, unknown> };
            if (whereArgs.where) {
              whereArgs.where = { ...whereArgs.where, tenantId };
            } else {
              whereArgs.where = { tenantId };
            }
            return query(args);
          },
          async delete({ args, query }) {
            const whereArgs = args as { where?: Record<string, unknown> };
            if (whereArgs.where) {
              whereArgs.where = { ...whereArgs.where, tenantId };
            } else {
              whereArgs.where = { tenantId };
            }
            return query(args);
          },
        },
      },
    });
  });
}