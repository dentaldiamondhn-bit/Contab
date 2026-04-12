// Types for file management

export interface FileRecord {
  id: string;
  tenantId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: 'excel' | 'pdf' | 'image' | 'document' | 'other';
  category: 'accounting' | 'template' | 'document' | 'other';
  description?: string;
  tags?: string[];
  uploadedBy: string;
  status: 'active' | 'deleted' | 'archived';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FileProcessing {
  id: string;
  fileId: string;
  processingType: 'excel_import' | 'data_extraction' | 'validation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalRows?: number;
  processedRows?: number;
  errorCount: number;
  errors?: string[];
  warnings?: string[];
  results?: any;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  templateType: string;
  fileId: string;
  schema: any;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileActivity {
  id: string;
  fileId: string;
  userId: string;
  action: 'uploaded' | 'downloaded' | 'viewed' | 'deleted' | 'processed';
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface FileUploadOptions {
  tenantId: string;
  category: FileRecord['category'];
  description?: string;
  tags?: string[];
  metadata?: any;
}

export interface ExcelProcessingOptions {
  fileId: string;
  tenantId: string;
  processingType: 'excel_import';
  userId: string;
}

export interface FileUploadResult {
  file: FileRecord;
  processing?: FileProcessing;
  success: boolean;
  error?: string;
}

// Excel column definitions for templates
export interface ExcelColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  description?: string;
}

export interface ExcelTemplateSchema {
  columns: ExcelColumn[];
  validations?: {
    [key: string]: {
      min?: number;
      max?: number;
      format?: string;
      pattern?: string;
    };
  };
}

// File processing progress callback
export type ProcessingProgressCallback = (progress: FileProcessing) => void;
