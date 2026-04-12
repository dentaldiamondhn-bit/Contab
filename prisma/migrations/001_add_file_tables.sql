-- Migration: Add file management tables
-- Created: 2026-03-31

-- Create File table
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "uploaded_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

-- Create FileProcessing table
CREATE TABLE "FileProcessing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_id" TEXT NOT NULL,
    "processing_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_rows" INTEGER,
    "processed_rows" INTEGER,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "warnings" TEXT[],
    "results" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- Create FileTemplate table
CREATE TABLE "FileTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_type" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    UNIQUE("file_id")
);

-- Create FileActivity table
CREATE TABLE "FileActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for File table
CREATE INDEX "idx_file_tenant" ON "File"("tenant_id");
CREATE INDEX "idx_file_uploaded_by" ON "File"("uploaded_by");
CREATE INDEX "idx_file_type" ON "File"("file_type");
CREATE INDEX "idx_file_category" ON "File"("category");
CREATE INDEX "idx_file_status" ON "File"("status");
CREATE INDEX "idx_file_created_at" ON "File"("created_at");

-- Create indexes for FileProcessing table
CREATE INDEX "idx_processing_file_id" ON "FileProcessing"("file_id");
CREATE INDEX "idx_processing_status" ON "FileProcessing"("status");
CREATE INDEX "idx_processing_started_at" ON "FileProcessing"("started_at");

-- Create indexes for FileTemplate table
CREATE INDEX "idx_template_tenant" ON "FileTemplate"("tenant_id");
CREATE INDEX "idx_template_type" ON "FileTemplate"("template_type");
CREATE INDEX "idx_template_is_active" ON "FileTemplate"("is_active");

-- Create indexes for FileActivity table
CREATE INDEX "idx_activity_file_id" ON "FileActivity"("file_id");
CREATE INDEX "idx_activity_user_id" ON "FileActivity"("user_id");
CREATE INDEX "idx_activity_action" ON "FileActivity"("action");
CREATE INDEX "idx_activity_created_at" ON "FileActivity"("created_at");

-- Enable RLS
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileProcessing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileActivity" ENABLE ROW LEVEL SECURITY;
