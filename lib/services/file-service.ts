import { createSupabaseClient } from "@/lib/supabase/client";
import { 
  FileRecord, 
  FileProcessing, 
  FileTemplate, 
  FileActivity,
  FileUploadOptions,
  ExcelProcessingOptions,
  FileUploadResult,
  ProcessingProgressCallback,
  ExcelTemplateSchema
} from "@/types/file";

export class FileService {
  private supabase = createSupabaseClient();

  // ========================================
  // FILE MANAGEMENT
  // ========================================

  async uploadFile(
    file: File, 
    options: FileUploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      // Generate unique file name
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${timestamp}_${file.name}`;
      const filePath = `uploads/${options.tenantId}/${uniqueFileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('files')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      // Handle progress manually since onProgress is not available
      if (onProgress) {
        onProgress(0);
        // Simulate progress for now
        const progressInterval = setInterval(() => {
          onProgress(Math.min(90, (Date.now() - timestamp) / 10));
        }, 100);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          onProgress(100);
        }, 1000);
      }

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Determine file type
      const fileType = this.determineFileType(file);
      
      // Create file record
      const { data: fileRecord, error: dbError } = await (this.supabase as any)
        .from('File')
        .insert({
          tenantId: options.tenantId,
          originalName: file.name,
          fileName: uniqueFileName,
          filePath: filePath,
          fileSize: file.size,
          mimeType: file.type,
          fileType,
          category: options.category,
          description: options.description,
          tags: options.tags || [],
          uploadedBy: options.tenantId, // TODO: Get actual user ID
          status: 'active',
          metadata: options.metadata
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Log activity
      await this.logActivity(fileRecord.id, options.tenantId, 'uploaded', {
        originalName: file.name,
        fileSize: file.size,
        fileType
      });

      return {
        file: fileRecord,
        success: true
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        file: undefined as any
      };
    }
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    const { data, error } = await this.supabase
      .from('File')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      console.error('Error fetching file:', error);
      return null;
    }

    return data;
  }

  async getFilesByTenant(
    tenantId: string, 
    filters?: {
      fileType?: string;
      category?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ files: FileRecord[]; total: number }> {
    let query = this.supabase
      .from('File')
      .select('*', { count: 'exact' })
      .eq('tenantId', tenantId)
      .eq('status', filters?.status || 'active')
      .order('createdAt', { ascending: false });

    if (filters?.fileType) {
      query = query.eq('fileType', filters.fileType);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching files:', error);
      return { files: [], total: 0 };
    }

    return {
      files: data || [],
      total: count || 0
    };
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Get file info before deleting
      const file = await this.getFile(fileId);
      if (!file) return false;

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('files')
        .remove([file.filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Mark as deleted in database
      const { error: dbError } = await (this.supabase as any)
        .from('File')
        .update({ 
          status: 'deleted',
          deletedAt: new Date().toISOString()
        })
        .eq('id', fileId);

      if (dbError) {
        console.error('Error deleting file record:', dbError);
        return false;
      }

      // Log activity
      await this.logActivity(fileId, userId, 'deleted', {
        fileName: file.fileName,
        filePath: file.filePath
      });

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // ========================================
  // FILE PROCESSING
  // ========================================

  async startExcelProcessing(
    options: ExcelProcessingOptions,
    onProgress?: ProcessingProgressCallback
  ): Promise<FileProcessing> {
    try {
      // Create processing record
      const { data: processing, error } = await (this.supabase as any)
        .from('FileProcessing')
        .insert({
          fileId: options.fileId,
          processingType: options.processingType,
          status: 'pending',
          progress: 0,
          errorCount: 0,
          errors: [],
          warnings: []
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create processing record: ${error.message}`);
      }

      // Log activity
      await this.logActivity(options.fileId, options.userId, 'processed', {
        processingType: options.processingType
      });

      return processing;
    } catch (error: any) {
      console.error('Error starting processing:', error);
      throw error;
    }
  }

  async updateProcessingProgress(
    processingId: string,
    updates: Partial<FileProcessing>
  ): Promise<boolean> {
    try {
      const { error } = await (this.supabase as any)
        .from('FileProcessing')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', processingId);

      if (error) {
        console.error('Error updating processing progress:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating processing progress:', error);
      return false;
    }
  }

  async completeProcessing(
    processingId: string,
    results: any,
    errors: string[] = [],
    warnings: string[] = []
  ): Promise<boolean> {
    try {
      const { error } = await (this.supabase as any)
        .from('FileProcessing')
        .update({
          status: errors.length > 0 ? 'completed' : 'completed',
          progress: 100,
          results,
          errors,
          warnings,
          errorCount: errors.length,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', processingId);

      if (error) {
        console.error('Error completing processing:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error completing processing:', error);
      return false;
    }
  }

  async failProcessing(
    processingId: string,
    errorMessage: string,
    errors: string[] = []
  ): Promise<boolean> {
    try {
      const { error } = await (this.supabase as any)
        .from('FileProcessing')
        .update({
          status: 'failed',
          errors: [errorMessage, ...errors],
          errorCount: errors.length + 1,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', processingId);

      if (error) {
        console.error('Error failing processing:', error);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error failing processing:', error);
      return false;
    }
  }

  // ========================================
  // FILE TEMPLATES
  // ========================================

  async createTemplate(
    template: Omit<FileTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FileTemplate | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('FileTemplate')
        .insert(template)
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      return null;
    }
  }

  async getTemplatesByTenant(
    tenantId: string,
    templateType?: string
  ): Promise<FileTemplate[]> {
    let query = this.supabase
      .from('FileTemplate')
      .select(`
        *,
        File (*)
      `)
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false });

    if (templateType) {
      query = query.eq('templateType', templateType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data || [];
  }

  // ========================================
  // FILE ACTIVITY
  // ========================================

  private async logActivity(
    fileId: string,
    userId: string,
    action: FileActivity['action'],
    details?: any
  ): Promise<void> {
    try {
      await (this.supabase as any)
        .from('FileActivity')
        .insert({
          fileId,
          userId,
          action,
          details,
          ipAddress: typeof window !== 'undefined' ? 'client' : 'server',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async getFileActivity(fileId: string): Promise<FileActivity[]> {
    const { data, error } = await this.supabase
      .from('FileActivity')
      .select('*')
      .eq('fileId', fileId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching file activity:', error);
      return [];
    }

    return data || [];
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private determineFileType(file: File): FileRecord['fileType'] {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (mimeType.includes('excel') || ['xlsx', 'xls'].includes(extension || '')) {
      return 'excel';
    }
    if (mimeType.includes('pdf') || extension === 'pdf') {
      return 'pdf';
    }
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return 'document';
    }

    return 'other';
  }

  async getPublicUrl(filePath: string): Promise<string> {
    const { data } = this.supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileService = new FileService();
