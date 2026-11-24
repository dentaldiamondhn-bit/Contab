import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL environment variable is not set. Using placeholder for schema generation.");
}

const pool = connectionString ? new Pool({ connectionString }) : null;
const adapter = pool ? new PrismaPg(pool) : undefined;

export default defineConfig({
  adapter,
  schema: "./prisma/schema.prisma",
  earlyAccess: true,
});