import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PatientService } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface FollowUp {
  id: string;
  patientId: string;
  appointmentId: string;
  doctorName: string;
  department: string;
  treatmentType: string;
  followUpDate: string;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
  createdAt: string;
}

@Component({
  selector: 'app-follow-ups',
  template: `
    <div class="follow-ups">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Follow-ups</h1>
          <p class="subtitle">Track your treatment progress and upcoming visits</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading your follow-ups...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="follow-ups-content">
        
        <!-- Summary Cards -->
        <div class="summary-cards" *ngIf="followUps.length > 0">
          <mat-card class="summary-card pending">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="warn">schedule</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{pendingCount}}</span>
                  <span class="summary-label">Pending</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card scheduled">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="primary">event</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{scheduledCount}}</span>
                  <span class="summary-label">Scheduled</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card overdue">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="warn">warning</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{overdueCount}}</span>
                  <span class="summary-label">Overdue</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Filter Tabs -->
        <mat-card class="tabs-card" *ngIf="followUps.length > 0">
          <mat-tab-group [(selectedIndex)]="selectedTab" (selectedTabChange)="onTabChange($event)">
            
            <mat-tab label="Pending Follow-ups">
              <div class="tab-content">
                <div *ngIf="pendingFollowUps.length === 0" class="empty-state">
                  <mat-icon>event_available</mat-icon>
                  <h3>No pending follow-ups</h3>
                  <p>You don't have any pending follow-ups at the moment.</p>
                </div>
                
                <div *ngIf="pendingFollowUps.length > 0" class="follow-ups-list">
                  <mat-card *ngFor="let followUp of pendingFollowUps" 
                           class="follow-up-card pending"
                           [class.high-priority]="followUp.priority === 'HIGH'">
                    
                    <mat-card-header>
                      <div mat-card-avatar class="follow-up-avatar pending">
                        <mat-icon>{{getPriorityIcon(followUp.priority)}}</mat-icon>
                      </div>
                      <mat-card-title>{{followUp.treatmentType}}</mat-card-title>
                      <mat-card-subtitle>Dr. {{followUp.doctorName}} - {{followUp.department}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="follow-up-details">
                        <div class="detail-row">
                          <mat-icon>schedule</mat-icon>
                          <span>Due: {{formatDate(followUp.followUpDate)}}</span>
                          <span class="days-info" [class.overdue]="isOverdue(followUp)">
                            ({{getDaysText(followUp.followUpDate)}})
                          </span>
                        </div>
                        
                        <div class="detail-row" *ngIf="followUp.notes">
                          <mat-icon>note</mat-icon>
                          <span>{{followUp.notes}}</span>
                        </div>
                        
                        <div class="status-priority">
                          <mat-chip [color]="getStatusColor(followUp.status)" selected>
                            {{followUp.status | titlecase}}
                          </mat-chip>
                          <mat-chip [color]="getPriorityColor(followUp.priority)" selected>
                            {{followUp.priority}} Priority
                          </mat-chip>
                        </div>
                      </div>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-raised-button color="primary" (click)="scheduleFollowUp(followUp)">
                        <mat-icon>event</mat-icon>
                        Schedule Appointment
                      </button>
                      <button mat-button (click)="viewDetails(followUp)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="All Follow-ups">
              <div class="tab-content">
                <div *ngIf="followUps.length === 0" class="empty-state">
                  <mat-icon>medical_services</mat-icon>
                  <h3>No follow-ups found</h3>
                  <p>Your follow-up recommendations will appear here after your treatments.</p>
                </div>
                
                <div *ngIf="followUps.length > 0" class="follow-ups-list">
                  <mat-card *ngFor="let followUp of followUps" 
                           class="follow-up-card" 
                           [class]="followUp.status.toLowerCase()"
                           [class.high-priority]="followUp.priority === 'HIGH'">
                    
                    <mat-card-header>
                      <div mat-card-avatar class="follow-up-avatar" [class]="followUp.status.toLowerCase()">
                        <mat-icon>{{getStatusIcon(followUp.status)}}</mat-icon>
                      </div>
                      <mat-card-title>{{followUp.treatmentType}}</mat-card-title>
                      <mat-card-subtitle>Dr. {{followUp.doctorName}} - {{followUp.department}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="follow-up-details">
                        <div class="detail-row">
                          <mat-icon>schedule</mat-icon>
                          <span *ngIf="followUp.status === 'COMPLETED'">Completed: {{formatDate(followUp.followUpDate)}}</span>
                          <span *ngIf="followUp.status !== 'COMPLETED'">Due: {{formatDate(followUp.followUpDate)}}</span>
                          <span class="days-info" 
                                *ngIf="followUp.status !== 'COMPLETED'"
                                [class.overdue]="isOverdue(followUp)">
                            ({{getDaysText(followUp.followUpDate)}})
                          </span>
                        </div>
                        
                        <div class="detail-row" *ngIf="followUp.notes">
                          <mat-icon>note</mat-icon>
                          <span>{{followUp.notes}}</span>
                        </div>
                        
                        <div class="status-priority">
                          <mat-chip [color]="getStatusColor(followUp.status)" selected>
                            {{followUp.status | titlecase}}
                          </mat-chip>
                          <mat-chip [color]="getPriorityColor(followUp.priority)" selected>
                            {{followUp.priority}} Priority
                          </mat-chip>
                        </div>
                      </div>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button *ngIf="followUp.status === 'PENDING'" 
                              mat-raised-button color="primary" 
                              (click)="scheduleFollowUp(followUp)">
                        <mat-icon>event</mat-icon>
                        Schedule Appointment
                      </button>
                      <button mat-button (click)="viewDetails(followUp)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
          </mat-tab-group>
        </mat-card>

        <!-- Empty State for No Follow-ups -->
        <div *ngIf="followUps.length === 0" class="empty-state">
          <mat-card class="empty-state-card">
            <mat-card-content>
              <mat-icon>medical_services</mat-icon>
              <h3>No follow-ups yet</h3>
              <p>Your follow-up recommendations will appear here after your treatments.</p>
              <p>Follow-ups help ensure your treatment is progressing well and catch any issues early.</p>
              <button mat-raised-button color="primary" routerLink="/patient/appointments">
                <mat-icon>event</mat-icon>
                Book an Appointment
              </button>
            </mat-card-content>
          </mat-card>
        </div>

      </div>

      <!-- Follow-up Detail Modal -->
      <div *ngIf="selectedFollowUp" class="follow-up-modal-overlay" (click)="closeDetailView()">
        <div class="follow-up-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Follow-up Details</h2>
            <button mat-icon-button (click)="closeDetailView()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="modal-content">
            <div class="follow-up-detail">
              
              <!-- Treatment Info -->
              <div class="detail-section">
                <h3>Treatment Information</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Treatment:</span>
                    <span class="value">{{selectedFollowUp.treatmentType}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Doctor:</span>
                    <span class="value">Dr. {{selectedFollowUp.doctorName}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Department:</span>
                    <span class="value">{{selectedFollowUp.department}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Priority:</span>
                    <mat-chip [color]="getPriorityColor(selectedFollowUp.priority)" selected>
                      {{selectedFollowUp.priority}} Priority
                    </mat-chip>
                  </div>
                </div>
              </div>

              <!-- Follow-up Schedule -->
              <div class="detail-section">
                <h3>Follow-up Schedule</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Due Date:</span>
                    <span class="value">{{formatDate(selectedFollowUp.followUpDate)}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Status:</span>
                    <mat-chip [color]="getStatusColor(selectedFollowUp.status)" selected>
                      {{selectedFollowUp.status | titlecase}}
                    </mat-chip>
                  </div>
                  <div class="info-item" *ngIf="selectedFollowUp.status !== 'COMPLETED'">
                    <span class="label">Time Remaining:</span>
                    <span class="value" [class.overdue]="isOverdue(selectedFollowUp)">
                      {{getDaysText(selectedFollowUp.followUpDate)}}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="label">Created:</span>
                    <span class="value">{{formatDate(selectedFollowUp.createdAt)}}</span>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="detail-section" *ngIf="selectedFollowUp.notes">
                <h3>Doctor's Notes</h3>
                <div class="notes-content">
                  <p>{{selectedFollowUp.notes}}</p>
                </div>
              </div>

            </div>
          </div>
          
          <div class="modal-actions">
            <button mat-button (click)="closeDetailView()">Close</button>
            <button *ngIf="selectedFollowUp.status === 'PENDING'" 
                    mat-raised-button color="primary" 
                    (click)="scheduleFollowUp(selectedFollowUp)">
              <mat-icon>event</mat-icon>
              Schedule Appointment
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./follow-ups.component.scss']
})
export class FollowUpsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  followUps: FollowUp[] = [];
  pendingFollowUps: FollowUp[] = [];
  selectedTab = 0;
  selectedFollowUp: FollowUp | null = null;
  
  pendingCount = 0;
  scheduledCount = 0;
  overdueCount = 0;

  constructor(
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadFollowUps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFollowUps(): void {
    this.loading = true;
    
    this.patientService.getFollowUps()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (followUps) => {
          this.followUps = followUps.sort((a, b) => 
            new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
          );
          this.pendingFollowUps = followUps.filter(f => f.status === 'PENDING');
          this.calculateCounts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading follow-ups:', error);
          this.snackBar.open('Error loading follow-ups', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private calculateCounts(): void {
    this.pendingCount = this.followUps.filter(f => f.status === 'PENDING').length;
    this.scheduledCount = this.followUps.filter(f => f.status === 'SCHEDULED').length;
    this.overdueCount = this.followUps.filter(f => this.isOverdue(f)).length;
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  scheduleFollowUp(followUp: FollowUp): void {
    // Navigate to appointments with pre-filled data
    this.snackBar.open('Redirecting to appointment booking...', '', { duration: 2000 });
    // In a real app, this would navigate to the appointment booking with pre-filled doctor and treatment info
  }

  viewDetails(followUp: FollowUp): void {
    this.selectedFollowUp = followUp;
  }

  closeDetailView(): void {
    this.selectedFollowUp = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysText(dateString: string): string {
    const followUpDate = new Date(dateString);
    const today = new Date();
    const diffTime = followUpDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `${diffDays} days remaining`;
    }
  }

  isOverdue(followUp: FollowUp): boolean {
    const followUpDate = new Date(followUp.followUpDate);
    const today = new Date();
    return followUpDate < today && followUp.status !== 'COMPLETED';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'warn';
      case 'SCHEDULED':
        return 'primary';
      case 'COMPLETED':
        return 'accent';
      case 'OVERDUE':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'schedule';
      case 'SCHEDULED':
        return 'event';
      case 'COMPLETED':
        return 'check_circle';
      case 'OVERDUE':
        return 'warning';
      default:
        return 'help';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return 'warn';
      case 'MEDIUM':
        return 'accent';
      case 'LOW':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return 'priority_high';
      case 'MEDIUM':
        return 'remove';
      case 'LOW':
        return 'low_priority';
      default:
        return 'help';
    }
  }
}