import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface FileUploadProgress {
  requestId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
}

export interface ReportUploadData {
  requestId: string;
  files: File[];
  labRemarks: string;
  technicalNotes?: string;
  qualityScore?: number;
  uploadType: 'initial' | 'additional' | 'replacement';
}

export interface UploadValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileValidations: FileValidation[];
}

export interface FileValidation {
  fileName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  fileType: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportUploadService {
  private readonly apiUrl = `${environment.apiUrl}/lab-staff/reports`;
  
  // Upload progress tracking
  private uploadProgressSubject = new BehaviorSubject<FileUploadProgress[]>([]);
  private uploadCompleteSubject = new Subject<any>();
  
  // Public observables
  public uploadProgress$ = this.uploadProgressSubject.asObservable();
  public uploadComplete$ = this.uploadCompleteSubject.asObservable();

  // Configuration
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/pdf',
    'application/dicom',
    'image/dicom'
  ];
  
  private readonly allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif',
    '.pdf', '.dcm', '.dicom'
  ];

  constructor(private http: HttpClient) {}

  // File Validation
  validateFiles(files: File[]): UploadValidation {
    const validation: UploadValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      fileValidations: []
    };

    if (files.length === 0) {
      validation.isValid = false;
      validation.errors.push('No files selected for upload');
      return validation;
    }

    if (files.length > 20) {
      validation.isValid = false;
      validation.errors.push('Maximum 20 files allowed per upload');
    }

    files.forEach((file, index) => {
      const fileValidation = this.validateSingleFile(file, index);
      validation.fileValidations.push(fileValidation);
      
      if (!fileValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...fileValidation.errors);
      }
      
      validation.warnings.push(...fileValidation.warnings);
    });

    return validation;
  }

  private validateSingleFile(file: File, index: number): FileValidation {
    const validation: FileValidation = {
      fileName: file.name,
      isValid: true,
      errors: [],
      warnings: [],
      fileSize: file.size,
      fileType: file.type
    };

    // Check file size
    if (file.size > this.maxFileSize) {
      validation.isValid = false;
      validation.errors.push(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    if (file.size === 0) {
      validation.isValid = false;
      validation.errors.push('File is empty');
    }

    // Check file type
    const fileExtension = this.getFileExtension(file.name).toLowerCase();
    const isValidType = this.allowedFileTypes.includes(file.type) || 
                       this.allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      validation.isValid = false;
      validation.errors.push(`File type not supported. Allowed types: ${this.allowedExtensions.join(', ')}`);
    }

    // Check file name
    if (file.name.length > 255) {
      validation.isValid = false;
      validation.errors.push('File name too long (max 255 characters)');
    }

    // Warnings for large files
    if (file.size > 10 * 1024 * 1024) { // 10MB
      validation.warnings.push('Large file size may take longer to upload');
    }

    // Check for duplicate names
    // This would need to be implemented with context of other files

    return validation;
  }

  // File Upload
  uploadReport(uploadData: ReportUploadData): Observable<any> {
    const formData = new FormData();
    
    // Add files
    uploadData.files.forEach((file, index) => {
      formData.append('files', file, file.name);
    });
    
    // Add metadata
    formData.append('requestId', uploadData.requestId);
    formData.append('labRemarks', uploadData.labRemarks);
    formData.append('uploadType', uploadData.uploadType);
    
    if (uploadData.technicalNotes) {
      formData.append('technicalNotes', uploadData.technicalNotes);
    }
    
    if (uploadData.qualityScore) {
      formData.append('qualityScore', uploadData.qualityScore.toString());
    }

    // Initialize progress tracking
    this.initializeProgressTracking(uploadData.requestId, uploadData.files);

    return this.http.post(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          this.updateUploadProgress(uploadData.requestId, event);
        } else if (event.type === HttpEventType.Response) {
          this.completeUpload(uploadData.requestId, event.body);
          return event.body;
        }
        return event;
      }),
      catchError(error => {
        this.handleUploadError(uploadData.requestId, error);
        throw error;
      })
    );
  }

  // Batch Upload
  uploadMultipleReports(uploads: ReportUploadData[]): Observable<any[]> {
    const uploadObservables = uploads.map(upload => this.uploadReport(upload));
    
    // You might want to implement sequential uploads instead of parallel
    // to avoid overwhelming the server
    return new Observable(observer => {
      const results: any[] = [];
      let completed = 0;
      
      uploads.forEach((upload, index) => {
        this.uploadReport(upload).subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            
            if (completed === uploads.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            results[index] = { error };
            completed++;
            
            if (completed === uploads.length) {
              observer.next(results);
              observer.complete();
            }
          }
        });
      });
    });
  }

  // File Management
  getUploadedFiles(requestId: string): Observable<UploadedFile[]> {
    return this.http.get<UploadedFile[]>(`${this.apiUrl}/${requestId}/files`);
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/files/${fileId}`);
  }

  replaceFile(fileId: string, newFile: File, notes?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', newFile, newFile.name);
    
    if (notes) {
      formData.append('notes', notes);
    }

    return this.http.put(`${this.apiUrl}/files/${fileId}/replace`, formData);
  }

  // File Preview and Download
  getFilePreview(fileId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/files/${fileId}/preview`, {
      responseType: 'blob'
    });
  }

  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/files/${fileId}/download`, {
      responseType: 'blob'
    });
  }

  generateThumbnail(fileId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/files/${fileId}/thumbnail`, {});
  }

  // Progress Tracking
  private initializeProgressTracking(requestId: string, files: File[]): void {
    const progressItems: FileUploadProgress[] = files.map(file => ({
      requestId,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));
    
    this.uploadProgressSubject.next(progressItems);
  }

  private updateUploadProgress(requestId: string, event: HttpProgressEvent): void {
    if (event.total) {
      const progress = Math.round(100 * event.loaded / event.total);
      const currentProgress = this.uploadProgressSubject.value;
      
      const updatedProgress = currentProgress.map(item => {
        if (item.requestId === requestId) {
          return { ...item, progress };
        }
        return item;
      });
      
      this.uploadProgressSubject.next(updatedProgress);
    }
  }

  private completeUpload(requestId: string, result: any): void {
    const currentProgress = this.uploadProgressSubject.value;
    
    const updatedProgress = currentProgress.map(item => {
      if (item.requestId === requestId) {
        return { ...item, progress: 100, status: 'completed' as const };
      }
      return item;
    });
    
    this.uploadProgressSubject.next(updatedProgress);
    this.uploadCompleteSubject.next({ requestId, result });
  }

  private handleUploadError(requestId: string, error: any): void {
    const currentProgress = this.uploadProgressSubject.value;
    
    const updatedProgress = currentProgress.map(item => {
      if (item.requestId === requestId) {
        return { 
          ...item, 
          status: 'error' as const, 
          error: error.message || 'Upload failed' 
        };
      }
      return item;
    });
    
    this.uploadProgressSubject.next(updatedProgress);
  }

  // Utility Methods
  private getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf('.'));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif'];
    const extension = this.getFileExtension(fileName).toLowerCase();
    return imageExtensions.includes(extension);
  }

  isPdfFile(fileName: string): boolean {
    return this.getFileExtension(fileName).toLowerCase() === '.pdf';
  }

  isDicomFile(fileName: string): boolean {
    const dicomExtensions = ['.dcm', '.dicom'];
    const extension = this.getFileExtension(fileName).toLowerCase();
    return dicomExtensions.includes(extension);
  }

  // Clear progress tracking
  clearProgress(): void {
    this.uploadProgressSubject.next([]);
  }

  getCurrentProgress(): FileUploadProgress[] {
    return this.uploadProgressSubject.value;
  }
}