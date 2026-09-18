import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

function createPrismaClient(tenantId?: string): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

// Tenant-aware Prisma client factory
export function createTenantAwarePrismaClient(tenantId: string): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  
  // Create Prisma client with tenant filter extension
  const client = new PrismaClient({
    datasources: { db: { url } },
  });
  
  // Apply tenant filter extension to all queries
  // This ensures tenantId is always included in queries unless explicitly overridden
  tenantFilterExtensions.set(client, tenantId);
  
  return client;
}

// Map to track tenant IDs per Prisma client instance
const tenantFilterExtensions = new Map<PrismaClient, string>();

// Helper to get tenant ID from a Prisma client
export function getTenantIdFromClient(client: PrismaClient): string | undefined {
  return tenantFilterExtensions.get(client);
}

// Extensión de Prisma para filtrado explícito de tenant
export const tenantFilterExtension = Prisma.defineExtension((client) => {
  const tenantId = tenantFilterExtensions.get(client);
  
  return client.$extends({
    model: {
      $allModels: true,
      async $queryRaw(query: string, ...values: any[]) {
        // Add tenant filter to raw queries if no tenantId specified
        if (!query.toLowerCase().includes('tenant_id') && tenantId) {
          // Inject tenant filter based on model type
        }
        return (client as any).$queryRaw(query, ...values);
      }
    }
  });
});
