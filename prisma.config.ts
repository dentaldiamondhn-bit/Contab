import { defineConfig } from "prisma/config";
import { PostgresDatasource } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const directConnectionString = process.env.DIRECT_URL;

if (!connectionString) {
  console.warn("DATABASE_URL environment variable is not set. Using placeholder for schema generation.");
}

const pool = connectionString ? new Pool({ connectionString }) : null;
const adapter = pool ? new PostgresDatasource(pool) : undefined;

export default defineConfig({
  adapter,
  schema: "./prisma/schema.prisma",
  earlyAccess: true,
});