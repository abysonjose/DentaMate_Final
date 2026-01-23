import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService } from '../../services/lab-staff.service';
import { ReportUploadService } from '../../services/report-upload.service';

export interface UploadDialogData {
  requestId: string;
  patientName: string;
  testType: string;
}

@Component({
  selector: 'app-upload-report-dialog',
  templateUrl: './upload-report-dialog.component.html',
  styleUrls: ['./upload-report-dialog.component.scss']
})
export class UploadReportDialogComponent implements OnInit {
  uploadForm: FormGroup;
  selectedFiles: File[] = [];
  isUploading = false;
  uploadProgress = 0;
  
  allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/pdf',
    'application/dicom'
  ];
  
  maxFileSize = 50 * 1024 * 1024; // 50MB
  maxFiles = 10;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UploadReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UploadDialogData,
    private labStaffService: LabStaffService,
    private uploadService: ReportUploadService,
    private snackBar: MatSnackBar
  ) {
    this.uploadForm = this.fb.group({
      remarks: ['', [Validators.required, Validators.minLength(10)]],
      fileValidation: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    // Initialize form with test type specific requirements
    this.setTestTypeRequirements();
  }

  private setTestTypeRequirements(): void {
    // Set specific requirements based on test type
    switch (this.data.testType) {
      case 'X-RAY':
        this.uploadForm.patchValue({
          remarks: 'X-Ray images uploaded for diagnostic review.'
        });
        break;
      case 'CBCT':
        this.uploadForm.patchValue({
          remarks: 'CBCT scan data uploaded for 3D analysis.'
        });
        break;
      case 'MRI':
        this.uploadForm.patchValue({
          remarks: 'MRI scan results uploaded for detailed examination.'
        });
        break;
      default:
        this.uploadForm.patchValue({
          remarks: 'Diagnostic report uploaded for medical review.'
        });
    }
  }

  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    // Validate file count
    if (files.length > this.maxFiles) {
      this.snackBar.open(`Maximum ${this.maxFiles} files allowed`, 'Close', { duration: 3000 });
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // Check file type
      if (!this.allowedFileTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      // Check file size
      if (file.size > this.maxFileSize) {
        errors.push(`${file.name}: File too large (max 50MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      this.snackBar.open(errors.join(', '), 'Close', { duration: 5000 });
    }

    this.selectedFiles = validFiles;
    this.uploadForm.patchValue({ fileValidation: validFiles.length > 0 });
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.uploadForm.patchValue({ fileValidation: this.selectedFiles.length > 0 });
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.type === 'application/pdf') {
      return 'picture_as_pdf';
    } else if (file.type === 'application/dicom') {
      return 'medical_services';
    }
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async uploadFiles(): Promise<void> {
    if (this.uploadForm.invalid || this.selectedFiles.length === 0) {
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      // Validate files before upload
      const validationResult = await this.uploadService.validateFiles(this.selectedFiles);
      if (!validationResult.isValid) {
        this.snackBar.open(validationResult.errors.join(', '), 'Close', { duration: 5000 });
        this.isUploading = false;
        return;
      }

      // Upload files with progress tracking
      const uploadResult = await this.uploadService.uploadFiles(
        this.data.requestId,
        this.selectedFiles,
        this.uploadForm.value.remarks,
        (progress) => {
          this.uploadProgress = progress;
        }
      );

      if (uploadResult.success) {
        // Log the upload activity
        await this.labStaffService.logActivity('REPORT_UPLOAD', {
          requestId: this.data.requestId,
          fileCount: this.selectedFiles.length,
          totalSize: this.selectedFiles.reduce((sum, file) => sum + file.size, 0)
        }).toPromise();

        this.snackBar.open('Files uploaded successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({
          success: true,
          fileCount: this.selectedFiles.length,
          reportId: uploadResult.reportId
        });
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.isUploading = false;
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  // Drag and drop functionality
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.onFileSelected({ target: { files } });
    }
  }

  // File preview functionality
  previewFile(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Open image preview dialog
        // Implementation depends on your image preview component
      };
      reader.readAsDataURL(file);
    }
  }
}