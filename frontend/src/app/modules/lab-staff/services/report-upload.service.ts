import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadResult {
  success: boolean;
  reportId?: string;
  fileIds?: string[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportUploadService {
  private apiUrl = `${environment.apiUrl}/lab-diagnostics`;
  
  // File validation constants
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_FILES = 10;
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'application/pdf',
    'application/dicom'
  ];

  constructor(private http: HttpClient) {}

  /**
   * Validate files before upload
   */
  async validateFiles(files: File[]): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file count
    if (files.length === 0) {
      errors.push('No files selected');
    }

    if (files.length > this.MAX_FILES) {
      errors.push(`Maximum ${this.MAX_FILES} files allowed`);
    }

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type (${file.type})`);
        continue;
      }

      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (${this.formatFileSize(file.size)} > 50MB)`);
        continue;
      }

      // Check for empty files
      if (file.size === 0) {
        errors.push(`${file.name}: Empty file`);
        continue;
      }

      // Validate file integrity (basic checks)
      try {
        await this.validateFileIntegrity(file);
      } catch (error) {
        errors.push(`${file.name}: File appears to be corrupted`);
      }

      // Check for duplicate names
      const duplicates = files.filter(f => f.name === file.name);
      if (duplicates.length > 1) {
        warnings.push(`${file.name}: Duplicate file name detected`);
      }

      // File type specific validations
      if (file.type.startsWith('image/')) {
        const imageValidation = await this.validateImageFile(file);
        if (!imageValidation.isValid) {
          errors.push(`${file.name}: ${imageValidation.error}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload files with progress tracking
   */
  async uploadFiles(
    requestId: string,
    files: File[],
    remarks: string,
    progressCallback?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('remarks', remarks);
      formData.append('uploadedBy', this.getCurrentUserId());
      formData.append('uploadTimestamp', new Date().toISOString());

      // Add files with metadata
      files.forEach((file, index) => {
        formData.append('files', file);
        formData.append(`fileMetadata_${index}`, JSON.stringify({
          originalName: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }));
      });

      // Create upload request with progress tracking
      const uploadRequest = new HttpRequest(
        'POST',
        `${this.apiUrl}/reports/upload`,
        formData,
        {
          reportProgress: true,
          responseType: 'json'
        }
      );

      return new Promise((resolve, reject) => {
        this.http.request(uploadRequest).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              // Calculate and report progress
              const progress = Math.round(100 * event.loaded / (event.total || 1));
              if (progressCallback) {
                progressCallback(progress);
              }
            } else if (event.type === HttpEventType.Response) {
              // Upload completed
              const response = event.body as any;
              resolve({
                success: true,
                reportId: response.reportId,
                fileIds: response.fileIds
              });
            }
          },
          error: (error) => {
            console.error('Upload error:', error);
            resolve({
              success: false,
              error: error.error?.message || 'Upload failed'
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: 'Upload preparation failed'
      };
    }
  }

  /**
   * Validate file integrity
   */
  private async validateFileIntegrity(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Basic integrity check - file can be read
        resolve();
      };
      
      reader.onerror = () => {
        reject(new Error('File read error'));
      };
      
      // Read first 1KB to check if file is readable
      const blob = file.slice(0, 1024);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Validate image files
   */
  private async validateImageFile(file: File): Promise<{isValid: boolean, error?: string}> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Check minimum dimensions
        if (img.width < 100 || img.height < 100) {
          resolve({
            isValid: false,
            error: 'Image dimensions too small (minimum 100x100)'
          });
          return;
        }
        
        // Check maximum dimensions
        if (img.width > 10000 || img.height > 10000) {
          resolve({
            isValid: false,
            error: 'Image dimensions too large (maximum 10000x10000)'
          });
          return;
        }
        
        resolve({ isValid: true });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          error: 'Invalid or corrupted image file'
        });
      };
      
      img.src = url;
    });
  }

  /**
   * Generate file checksum for integrity verification
   */
  async generateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/uploads/${uploadId}/status`);
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/uploads/${uploadId}`);
  }

  /**
   * Retry failed upload
   */
  retryUpload(uploadId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/uploads/${uploadId}/retry`, {});
  }

  /**
   * Get supported file types for UI display
   */
  getSupportedFileTypes(): Array<{type: string, label: string, extensions: string[]}> {
    return [
      {
        type: 'image/jpeg',
        label: 'JPEG Images',
        extensions: ['.jpg', '.jpeg']
      },
      {
        type: 'image/png',
        label: 'PNG Images',
        extensions: ['.png']
      },
      {
        type: 'image/tiff',
        label: 'TIFF Images',
        extensions: ['.tif', '.tiff']
      },
      {
        type: 'application/pdf',
        label: 'PDF Documents',
        extensions: ['.pdf']
      },
      {
        type: 'application/dicom',
        label: 'DICOM Files',
        extensions: ['.dcm', '.dicom']
      }
    ];
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  /**
   * Compress image if needed
   */
  async compressImage(file: File, maxSizeMB: number = 10): Promise<File> {
    if (file.size <= maxSizeMB * 1024 * 1024) {
      return file; // No compression needed
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const maxDimension = 2048;
        let { width, height } = img;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, file.type, 0.8); // 80% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}