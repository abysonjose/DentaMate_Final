import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, Prescription } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-prescriptions',
  template: `
    <div class="prescriptions">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>My Prescriptions</h1>
          <p class="subtitle">Digital prescriptions and medication history</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading your prescriptions...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="prescriptions-content">
        
        <!-- Tabs -->
        <mat-card class="tabs-card">
          <mat-tab-group [(selectedIndex)]="selectedTab" (selectedTabChange)="onTabChange($event)">
            <mat-tab label="Active Prescriptions">
              <div class="tab-content">
                <div *ngIf="activePrescriptions.length === 0" class="empty-state">
                  <mat-icon>receipt</mat-icon>
                  <h3>No active prescriptions</h3>
                  <p>You don't have any active prescriptions at the moment.</p>
                </div>
                
                <div *ngIf="activePrescriptions.length > 0" class="prescriptions-grid">
                  <mat-card *ngFor="let prescription of activePrescriptions" class="prescription-card active">
                    <mat-card-header>
                      <div mat-card-avatar class="prescription-avatar active">
                        <mat-icon>receipt</mat-icon>
                      </div>
                      <mat-card-title>{{formatDate(prescription.prescriptionDate)}}</mat-card-title>
                      <mat-card-subtitle>Dr. {{prescription.doctorName}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="medicines-list">
                        <div *ngFor="let medicine of prescription.medicines | slice:0:3" class="medicine-item">
                          <div class="medicine-info">
                            <span class="medicine-name">{{medicine.name}}</span>
                            <span class="medicine-dosage">{{medicine.dosage}} - {{medicine.frequency}}</span>
                          </div>
                        </div>
                        <div *ngIf="prescription.medicines.length > 3" class="more-medicines">
                          +{{prescription.medicines.length - 3}} more medicines
                        </div>
                      </div>
                      
                      <mat-chip color="primary" selected class="status-chip">
                        {{prescription.status | titlecase}}
                      </mat-chip>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-button (click)="viewPrescription(prescription)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-button (click)="downloadPrescription(prescription)">
                        <mat-icon>download</mat-icon>
                        Download
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="All Prescriptions">
              <div class="tab-content">
                <div *ngIf="allPrescriptions.length === 0" class="empty-state">
                  <mat-icon>receipt</mat-icon>
                  <h3>No prescriptions found</h3>
                  <p>Your prescription history will appear here after your visits.</p>
                </div>
                
                <div *ngIf="allPrescriptions.length > 0" class="prescriptions-grid">
                  <mat-card *ngFor="let prescription of allPrescriptions" 
                           class="prescription-card" 
                           [class]="prescription.status.toLowerCase()">
                    <mat-card-header>
                      <div mat-card-avatar class="prescription-avatar" [class]="prescription.status.toLowerCase()">
                        <mat-icon>receipt</mat-icon>
                      </div>
                      <mat-card-title>{{formatDate(prescription.prescriptionDate)}}</mat-card-title>
                      <mat-card-subtitle>Dr. {{prescription.doctorName}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="medicines-list">
                        <div *ngFor="let medicine of prescription.medicines | slice:0:3" class="medicine-item">
                          <div class="medicine-info">
                            <span class="medicine-name">{{medicine.name}}</span>
                            <span class="medicine-dosage">{{medicine.dosage}} - {{medicine.frequency}}</span>
                          </div>
                        </div>
                        <div *ngIf="prescription.medicines.length > 3" class="more-medicines">
                          +{{prescription.medicines.length - 3}} more medicines
                        </div>
                      </div>
                      
                      <mat-chip [color]="getStatusColor(prescription.status)" selected class="status-chip">
                        {{prescription.status | titlecase}}
                      </mat-chip>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-button (click)="viewPrescription(prescription)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-button (click)="downloadPrescription(prescription)">
                        <mat-icon>download</mat-icon>
                        Download
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card>

      </div>

      <!-- Prescription Detail Modal -->
      <div *ngIf="selectedPrescription" class="prescription-modal-overlay" (click)="closePrescriptionView()">
        <div class="prescription-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Prescription Details</h2>
            <button mat-icon-button (click)="closePrescriptionView()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="modal-content">
            <div class="prescription-details">
              
              <!-- Prescription Info -->
              <div class="detail-section">
                <h3>Prescription Information</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Date:</span>
                    <span class="value">{{formatDate(selectedPrescription.prescriptionDate)}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Doctor:</span>
                    <span class="value">Dr. {{selectedPrescription.doctorName}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Status:</span>
                    <mat-chip [color]="getStatusColor(selectedPrescription.status)" selected>
                      {{selectedPrescription.status | titlecase}}
                    </mat-chip>
                  </div>
                </div>
              </div>

              <!-- Medicines -->
              <div class="detail-section">
                <h3>Prescribed Medicines</h3>
                <div class="medicines-detail-list">
                  <div *ngFor="let medicine of selectedPrescription.medicines" class="medicine-detail-item">
                    <div class="medicine-header">
                      <h4>{{medicine.name}}</h4>
                      <span class="medicine-dosage-badge">{{medicine.dosage}}</span>
                    </div>
                    <div class="medicine-instructions">
                      <div class="instruction-row">
                        <mat-icon>schedule</mat-icon>
                        <span>{{medicine.frequency}}</span>
                      </div>
                      <div class="instruction-row">
                        <mat-icon>timer</mat-icon>
                        <span>Duration: {{medicine.duration}}</span>
                      </div>
                      <div class="instruction-row" *ngIf="medicine.instructions">
                        <mat-icon>info</mat-icon>
                        <span>{{medicine.instructions}}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div class="modal-actions">
            <button mat-button (click)="closePrescriptionView()">Close</button>
            <button mat-raised-button color="primary" (click)="downloadPrescription(selectedPrescription)">
              <mat-icon>download</mat-icon>
              Download PDF
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .prescriptions {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      background-color: #f5f5f5;
      min-height: 100vh;
    }

    .page-header {
      margin-bottom: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .header-content h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 300;
    }

    .header-content .subtitle {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
    }

    .tabs-card {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .tab-content {
      padding: 20px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state .mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 20px;
    }

    .prescriptions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .prescription-card {
      border-radius: 12px;
      transition: transform 0.2s ease;
    }

    .prescription-card:hover {
      transform: translateY(-2px);
    }

    .prescription-card.active {
      border-left: 4px solid #4caf50;
    }

    .prescription-card.completed {
      border-left: 4px solid #9e9e9e;
      opacity: 0.8;
    }

    .prescription-card.cancelled {
      border-left: 4px solid #f44336;
      opacity: 0.8;
    }

    .prescription-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .prescription-avatar.active {
      background-color: #e8f5e8;
      color: #4caf50;
    }

    .prescription-avatar.completed {
      background-color: #f5f5f5;
      color: #9e9e9e;
    }

    .prescription-avatar.cancelled {
      background-color: #ffebee;
      color: #f44336;
    }

    .medicines-list {
      margin-bottom: 16px;
    }

    .medicine-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .medicine-info {
      display: flex;
      flex-direction: column;
    }

    .medicine-name {
      font-weight: 500;
      color: #333;
    }

    .medicine-dosage {
      font-size: 0.85rem;
      color: #666;
    }

    .more-medicines {
      font-size: 0.9rem;
      color: #666;
      font-style: italic;
      text-align: center;
      padding: 8px;
    }

    .status-chip {
      margin-top: 8px;
    }

    // Modal styles
    .prescription-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .prescription-modal {
      background: white;
      border-radius: 12px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f8f9fa;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .modal-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .prescription-details {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-weight: 500;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item .label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
    }

    .info-item .value {
      color: #333;
      font-weight: 500;
    }

    .medicines-detail-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .medicine-detail-item {
      background-color: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .medicine-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .medicine-header h4 {
      margin: 0;
      color: #333;
      font-weight: 500;
    }

    .medicine-dosage-badge {
      background-color: #2196f3;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .medicine-instructions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .instruction-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .instruction-row .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    .instruction-row span {
      color: #333;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .prescriptions {
        padding: 10px;
      }
      
      .prescriptions-grid {
        grid-template-columns: 1fr;
      }
      
      .prescription-modal {
        margin: 10px;
        max-height: calc(100vh - 20px);
      }
    }
  `]
})
export class PrescriptionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  allPrescriptions: Prescription[] = [];
  activePrescriptions: Prescription[] = [];
  selectedTab = 0;
  selectedPrescription: Prescription | null = null;

  constructor(
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPrescriptions(): void {
    this.loading = true;
    
    this.patientService.getPrescriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prescriptions) => {
          this.allPrescriptions = prescriptions.sort((a, b) => 
            new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime()
          );
          this.activePrescriptions = prescriptions.filter(p => p.status === 'ACTIVE');
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.snackBar.open('Error loading prescriptions', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  viewPrescription(prescription: Prescription): void {
    this.selectedPrescription = prescription;
  }

  closePrescriptionView(): void {
    this.selectedPrescription = null;
  }

  downloadPrescription(prescription: Prescription): void {
    this.patientService.downloadPrescription(prescription.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `prescription-${prescription.id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.snackBar.open('Prescription downloaded successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error downloading prescription:', error);
          this.snackBar.open('Error downloading prescription', 'Close', { duration: 3000 });
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'primary';
      case 'COMPLETED':
        return 'accent';
      case 'CANCELLED':
        return 'warn';
      default:
        return 'primary';
    }
  }
}