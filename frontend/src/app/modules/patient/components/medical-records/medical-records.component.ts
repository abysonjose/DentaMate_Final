import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, MedicalRecord } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.scss']
})
export class MedicalRecordsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  medicalRecords: MedicalRecord[] = [];
  filteredRecords: MedicalRecord[] = [];
  searchTerm = '';
  selectedRecord: MedicalRecord | null = null;

  constructor(
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMedicalRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMedicalRecords(): void {
    this.loading = true;
    
    this.patientService.getMedicalRecords()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (records) => {
          this.medicalRecords = records.sort((a, b) => 
            new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
          );
          this.filteredRecords = [...this.medicalRecords];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading medical records:', error);
          this.snackBar.open('Error loading medical records', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredRecords = [...this.medicalRecords];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredRecords = this.medicalRecords.filter(record =>
      record.doctorName.toLowerCase().includes(term) ||
      record.department.toLowerCase().includes(term) ||
      record.diagnosis.toLowerCase().includes(term) ||
      record.treatmentNotes.toLowerCase().includes(term)
    );
  }

  viewRecord(record: MedicalRecord): void {
    this.selectedRecord = record;
  }

  closeRecordView(): void {
    this.selectedRecord = null;
  }

  downloadAttachment(record: MedicalRecord, attachment: any): void {
    this.patientService.downloadReport(record.id, attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.filename;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading attachment:', error);
          this.snackBar.open('Error downloading file', 'Close', { duration: 3000 });
        }
      });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getAttachmentIcon(type: string): string {
    switch (type) {
      case 'XRAY':
        return 'medical_services';
      case 'REPORT':
        return 'description';
      case 'IMAGE':
        return 'image';
      default:
        return 'attachment';
    }
  }

  getAttachmentColor(type: string): string {
    switch (type) {
      case 'XRAY':
        return 'primary';
      case 'REPORT':
        return 'accent';
      case 'IMAGE':
        return 'warn';
      default:
        return 'primary';
    }
  }
}