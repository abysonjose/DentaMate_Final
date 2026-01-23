import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabStaffService, DiagnosticRequest, DiagnosticReport } from '../../services/lab-staff.service';
import { ReportUploadService } from '../../services/report-upload.service';
import { UploadReportDialogComponent } from '../../dialogs/upload-report-dialog/upload-report-dialog.component';

interface UploadedFile {
  file: File;
  type: 'image' | 'pdf' | 'dicom';
  preview?: string;
  uploadProgress?: number;
  uploaded?: boolean;
  error?: string;
}

@Component({
  selector: 'app-report-upload',
  templateUrl: './report-upload.component.html',
  styleUrls: ['./report-upload.component.scss']
})
export class ReportUploadComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  uploadForm: FormGroup;
  selectedRequest: DiagnosticRequest | null = null;
  availableRequests: DiagnosticRequest[] = [];
  uploadedFiles: UploadedFile[] = [];
  isUploading = false;
  uploadProgress = 0;

  // File type configurations
  acceptedFileTypes = {
    image: '.jpg,.jpeg,.png,.bmp,.tiff,.dicom',
    pdf: '.pdf',
    dicom: '.dcm,.dicom'
  };

  maxFileSize = 50 * 1024 * 1024; // 50MB
  maxFiles = 10;

  constructor(
    private fb: FormBuilder,
    private labStaffService: LabStaffService,
    private reportUploadService: ReportUploadService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.uploadForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadAvailableRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      requestId: ['', Validators.required],
      labRemarks: ['', [Validators.required, Validators.maxLength(1000)]],
      technicalNotes: ['', Validators.maxLength(500)],
      qualityCheck: [false, Validators.requiredTrue]
    });
  }

  private loadAvailableRequests(): void {
    this.labStaffService.getDiagnosticRequests({ status: 'in_progress' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.availableRequests = requests;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.snackBar.open('Error loading requests', 'Close', { duration: 3000 });
        }
      });
  }

  onRequestSelected(): void {
    const requestId = this.uploadForm.get('requestId')?.value;
    this.selectedRequest = this.availableRequests.find(r => r.id === requestId) || null;
    this.uploadedFiles = [];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processSelectedFiles(Array.from(input.files));
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processSelectedFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private processSelectedFiles(files: File[]): void {
    if (this.uploadedFiles.length + files.length > this.maxFiles) {
      this.snackBar.open(`Maximum ${this.maxFiles} files allowed`, 'Close', { duration: 3000 });
      return;
    }

    files.forEach(file => {
      if (file.size > this.maxFileSize) {
        this.snackBar.open(`File ${file.name} is too large (max 50MB)`, 'Close', { duration: 3000 });
        return;
      }

      const fileType = this.determineFileType(file);
      if (!fileType) {
        this.snackBar.open(`File ${file.name} has unsupported format`, 'Close', { duration: 3000 });
        return;
      }

      const uploadedFile: UploadedFile = {
        file,
        type: fileType,
        uploadProgress: 0,
        uploaded: false
      };

      // Generate preview for images
      if (fileType === 'image' && file.type.startsWith('image/')) {
        this.generatePreview(file, uploadedFile);
      }

      this.uploadedFiles.push(uploadedFile);
    });
  }

  private determineFileType(file: File): 'image' | 'pdf' | 'dicom' | null {
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(extension || '')) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['dcm', 'dicom'].includes(extension || '')) {
      return 'dicom';
    }
    
    return null;
  }

  private generatePreview(file: File, uploadedFile: UploadedFile): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedFile.preview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  openUploadDialog(): void {
    if (!this.selectedRequest || this.uploadedFiles.length === 0) {
      this.snackBar.open('Please select a request and add files', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(UploadReportDialogComponent, {
      width: '800px',
      data: {
        request: this.selectedRequest,
        files: this.uploadedFiles,
        formData: this.uploadForm.value
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.uploaded) {
        this.onUploadSuccess();
      }
    });
  }

  uploadFiles(): void {
    if (!this.uploadForm.valid || !this.selectedRequest || this.uploadedFiles.length === 0) {
      this.snackBar.open('Please complete all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('requestId', this.selectedRequest.id);
    formData.append('labRemarks', this.uploadForm.get('labRemarks')?.value);
    formData.append('technicalNotes', this.uploadForm.get('technicalNotes')?.value);

    this.uploadedFiles.forEach((uploadedFile, index) => {
      formData.append(`files`, uploadedFile.file);
      formData.append(`fileTypes`, uploadedFile.type);
    });

    this.reportUploadService.uploadReport(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          if (event.type === 'progress') {
            this.uploadProgress = event.progress;
          } else if (event.type === 'response') {
            this.onUploadSuccess();
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
          this.isUploading = false;
        }
      });
  }

  private onUploadSuccess(): void {
    this.snackBar.open('Report uploaded successfully', 'Close', { duration: 3000 });
    this.resetForm();
    this.isUploading = false;
    this.uploadProgress = 0;
    
    // Update request status to completed
    if (this.selectedRequest) {
      this.labStaffService.updateRequestStatus(this.selectedRequest.id, 'completed')
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  private resetForm(): void {
    this.uploadForm.reset();
    this.selectedRequest = null;
    this.uploadedFiles = [];
    this.loadAvailableRequests();
  }

  getFileIcon(type: string): string {
    switch (type) {
      case 'image': return 'image';
      case 'pdf': return 'picture_as_pdf';
      case 'dicom': return 'medical_services';
      default: return 'insert_drive_file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getTestTypeIcon(testType: string): string {
    switch (testType) {
      case 'xray': return 'medical_services';
      case 'cbct': return 'scanner';
      case 'mri': return 'mri';
      case 'ct_scan': return 'scanner';
      case 'ultrasound': return 'waves';
      case 'blood_test': return 'bloodtype';
      case 'urine_test': return 'science';
      case 'biopsy': return 'biotech';
      default: return 'medical_services';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency': return 'warn';
      case 'urgent': return 'accent';
      case 'routine': return 'primary';
      default: return '';
    }
  }
}