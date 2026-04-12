import { PrismaClient } from '@prisma/client';
// import { auditMiddleware } from './audit-middleware';
// import { periodLockMiddleware } from './period-lock-middleware';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Register audit middleware - temporarily disabled due to circular dependency
// db.$use(auditMiddleware);

// Register period lock middleware - temporarily disabled due to React object rendering error
// db.$use((params: any, action: any) => periodLockMiddleware(params, action, params.model));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
